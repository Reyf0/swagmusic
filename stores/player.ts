import { defineStore } from 'pinia'
import { Howl } from 'howler'
import { ref, computed, watch, onUnmounted } from 'vue'
import type { Track, Database } from '@/types'
import type { SupabaseClient } from "@supabase/supabase-js";

type ViewName = 'now' | 'queue' | 'lyrics'
type ViewMode = 'sidebar' | 'fullscreen'

export const usePlayerStore = defineStore('player', () => {
    const nuxtApp = useNuxtApp()

    const currentTrack = ref<Track>(null)
    const sound = ref<Howl | null>(null)
    const isPlaying = ref(false)
    const currentTime = ref(0)
    const duration = ref(0)
    const volume = ref(1)
    const queue = ref<Track[]>([])
    const currentTrackIndex = ref(-1)
    const isRepeat = ref(false)
    const isShuffle = ref(false)

    const viewModes: Record<ViewName, { sidebar: boolean; fullscreen: boolean }> = {
        now: { sidebar: true, fullscreen: true },
        queue: { sidebar: true, fullscreen: false },
        lyrics: { sidebar: false, fullscreen: true }
    }
    // Храним режим каждого активного view
    const activeViews = ref<Record<ViewName, ViewMode | null>>({
        now: null,
        queue: null,
        lyrics: null
    })
    // Получить текущие active views
    const getSidebarView = computed<ViewName | null>(() =>
        (Object.entries(activeViews.value) as [ViewName, ViewMode | null][])
            .find(([, mode]) => mode === 'sidebar')?.[0] || null
    )
    const getFullscreenView = computed<ViewName | null>(() =>
        (Object.entries(activeViews.value) as [ViewName, ViewMode | null][])
            .find(([, mode]) => mode === 'fullscreen')?.[0] || null
    )
    const isFullScreenMode = computed(() => getFullscreenView.value !== null)
    const isViewOpen = (view: ViewName) => activeViews.value[view] !== null

    const openView = (view: ViewName) => {
        const supports = viewModes[view]
        const sidebar = getSidebarView.value
        const fullscreen = getFullscreenView.value

        // Если уже открыт — ничего не делаем
        if (activeViews.value[view]) return

        // 1. Если поддерживается sidebar — открываем в sidebar
        if (supports.sidebar) {
            // Заменяем предыдущий sidebar view, если есть
            if (sidebar) activeViews.value[sidebar] = null
            activeViews.value[view] = 'sidebar'
            return
        }

        // 2. Если поддерживается fullscreen — открываем туда
        if (supports.fullscreen) {
            if (fullscreen) activeViews.value[fullscreen] = null
            activeViews.value[view] = 'fullscreen'
            return
        }

        // 3. Невозможно открыть (должно быть исключением)
        console.warn(`View "${view}" не поддерживает ни sidebar, ни fullscreen`)
    }

    const closeView = (view: ViewName) => {
        activeViews.value[view] = null
    }

    const switchViewMode = (view: ViewName) => {
        const currentMode = activeViews.value[view]
        const supported = viewModes[view]

        if (!currentMode) return // View не открыт

        // Переключаем режим
        const newMode: ViewMode | null =
            currentMode === 'sidebar' && supported.fullscreen ? 'fullscreen'
                : currentMode === 'fullscreen' && supported.sidebar ? 'sidebar'
                    : null

        if (!newMode) return // Нельзя переключить

        // Закрываем старый режим
        activeViews.value[view] = null

        // Закрываем другой View, если новый режим занят
        if (newMode === 'sidebar') {
            const currentSidebar = getSidebarView.value
            if (currentSidebar) activeViews.value[currentSidebar] = null
        }

        if (newMode === 'fullscreen') {
            const currentFullscreen = getFullscreenView.value
            if (currentFullscreen) activeViews.value[currentFullscreen] = null
        }

        // Включаем новый режим
        activeViews.value[view] = newMode
    }


    // ───────────── Player Logic ─────────────

    const supabase:SupabaseClient<Database> = useSupabaseClient()
    const user = useSupabaseUser()
    const lastListenedTrackId = ref<string | null>(null)

    const setCurrentTrack = (track: Track | null) => {
        currentTrack.value = track
    }

    const recordListen = async () => {
        const trackId = currentTrack.value?.id
        if (!user.value || !trackId) return
        if (lastListenedTrackId.value === trackId) return

        const { data: lastListen, error: lastError } = await supabase
            .from('play_history')
            .select('track_id, played_at')
            .eq('user_id', user.value.id)
            .order('played_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (lastError) return

        const lastTrackId = lastListen?.track_id
        const lastPlayedAt = lastListen?.played_at ? new Date(lastListen.played_at) : null
        const now = new Date()
        const timeSinceLast = lastPlayedAt ? (now.getTime() - lastPlayedAt.getTime()) / 1000 : Infinity

        if (lastTrackId === trackId && timeSinceLast < 1000) return

        const { error: insertError } = await supabase.from('play_history').insert({
            user_id: user.value.id,
            track_id: trackId
        })

        if (!insertError) lastListenedTrackId.value = trackId
    }

    let progressInterval: number = null
    const startProgressTracking = () => {
        stopProgressTracking()
        progressInterval = setInterval(() => {
            if (sound.value && isPlaying.value) {
                currentTime.value = sound.value.seek()
            }
        }, 1000)
    }

    const stopProgressTracking = () => {
        if (progressInterval) {
            clearInterval(progressInterval)
            progressInterval = null
        }
    }

    const play = (track: Track, trackList: Track[] = []) => {
        if (sound.value && currentTrack.value?.id === track.id) {
            sound.value?.play()
            isPlaying.value = true
            return
        }

        if (sound.value) {
            try {
                sound.value.stop()
                sound.value.unload()
            } catch (e) {
                console.warn('Error unloading previous sound', e)
            } finally {
                sound.value = null
            }
        }

        if (trackList.length > 0) {
            queue.value = [...trackList]
            currentTrackIndex.value = queue.value.findIndex(t => t.id === track.id)
        }

        currentTrack.value = track

        sound.value = new Howl({
            src: [track.audio_url],
            html5: true,
            volume: volume.value,
            onloaderror: (id, error) => {
                console.error(id, error)
                nuxtApp.callHook('app:error', {
                    message: 'Howler load error',
                    detail: error,
                    id
                })
            },
            onplayerror: (id, error) => {
                console.error(id, error)
                nuxtApp.callHook('app:error', {
                    message: 'Howler play error',
                    detail: error,
                    id
                })
                sound.value?.once('unlock', () => sound.value?.play())
            },
            onend: () => {
                if (isRepeat.value) sound.value?.play()
                else playNext()
            },
            onload: () => {
                duration.value = sound.value?.duration() || 0
            },
            onplay: () => {
                startProgressTracking()
                isPlaying.value = true
            },
            onpause: () => {
                stopProgressTracking()
                isPlaying.value = false
            },
            onstop: () => {
                stopProgressTracking()
                isPlaying.value = false
                currentTime.value = 0
            }
        })

        sound.value.play()
        isPlaying.value = true
    }

    watch(currentTrack, async () => {
        if (currentTrack.value) await recordListen()
    })

    const pause = () => {
        sound.value?.pause()
        isPlaying.value = false
    }

    const resume = () => {
        sound.value?.play()
        isPlaying.value = true
    }

    const stop = () => {
        sound.value?.stop()
        isPlaying.value = false
        currentTime.value = 0
    }

    const seek = (position: number) => {
        if (sound.value) {
            sound.value.seek(position)
            currentTime.value = position
        }
    }

    const setVolume = (newVolume: number) => {
        volume.value = Math.max(0, Math.min(1, newVolume))
        if (sound.value) {
            sound.value.volume(volume.value)
        }
    }

    const toggleRepeat = () => {
        isRepeat.value = !isRepeat.value
    }

    const toggleShuffle = () => {
        isShuffle.value = !isShuffle.value
    }

    const playNext = () => {
        if (queue.value.length === 0 || currentTrackIndex.value === -1) return stop()

        let nextIndex = -1
        if (isShuffle.value) {
            const indices = queue.value.map((_, i) => i).filter(i => i !== currentTrackIndex.value)
            nextIndex = indices.length > 0 ? indices[Math.floor(Math.random() * indices.length)] : -1
        } else {
            nextIndex = (currentTrackIndex.value + 1) % queue.value.length
        }

        if (nextIndex !== -1) {
            currentTrackIndex.value = nextIndex
            play(queue.value[nextIndex], queue.value)
        } else {
            stop()
        }
    }

    const playPrevious = () => {
        if (queue.value.length === 0 || currentTrackIndex.value === -1) return stop()

        if (currentTime.value > 3) {
            seek(0)
            return
        }

        let prevIndex = -1
        if (isShuffle.value) {
            const indices = queue.value.map((_, i) => i).filter(i => i !== currentTrackIndex.value)
            prevIndex = indices.length > 0 ? indices[Math.floor(Math.random() * indices.length)] : -1
        } else {
            prevIndex = (currentTrackIndex.value - 1 + queue.value.length) % queue.value.length
        }

        if (prevIndex !== -1) {
            currentTrackIndex.value = prevIndex
            play(queue.value[prevIndex], queue.value)
        } else {
            stop()
        }
    }

    const replaceQueue = (newQueue: Track[], startTrack?: Track) => {
        queue.value = [...newQueue]
        const index = startTrack
            ? newQueue.findIndex(t => t.id === startTrack.id)
            : 0
        currentTrackIndex.value = index
        play(newQueue[index], newQueue)
    }

    onUnmounted(() => stopProgressTracking())

    return {
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        queue,
        currentTrackIndex,
        isRepeat,
        isShuffle,
        viewModes,
        activeViews,
        isFullScreenMode,
        getSidebarView,
        getFullscreenView,
        
        // Playback
        play,
        pause,
        resume,
        stop,
        seek,
        setVolume,
        playNext,
        playPrevious,
        toggleRepeat,
        toggleShuffle,
        replaceQueue,
        setCurrentTrack,

        // View logic
        openView,
        closeView,
        isViewOpen,
        switchViewMode
    }
})
