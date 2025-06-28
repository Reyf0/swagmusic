import { defineStore } from 'pinia'
import { Howl } from 'howler'
import { ref, watch, onUnmounted } from 'vue'

export const usePlayerStore = defineStore('player', () => {
    const currentTrack = ref<any>(null)
    const sound = ref<Howl | null>(null)
    const isPlaying = ref(false)
    const currentTime = ref(0)
    const duration = ref(0)
    const volume = ref(1)
    const queue = ref<any[]>([])
    const currentTrackIndex = ref(-1)
    const isRepeat = ref(false)
    const isShuffle = ref(false)
    const showFullPlayer = ref(false)

    const activeTab = ref<'now' | 'lyrics' | 'queue'>('now')


    const lastListenedTrackId = ref<string | null>(null)

    const supabase = useSupabaseClient()
    const user = useSupabaseUser()

    const activeViews = ref<Array<'now' | 'queue' | 'lyrics'>>([])

    const viewModes = {
        now: { sidebar: true, fullscreen: true },
        queue: { sidebar: true, fullscreen: false },
        lyrics: { sidebar: false, fullscreen: true }
    }

    const openView = (view: 'now' | 'queue' | 'lyrics') => {
        const mode = viewModes[view]

        // Если нужно открыть fullscreen — закрой все sidebar
        if (mode.fullscreen) {
            activeViews.value = activeViews.value.filter(v => !viewModes[v]?.sidebar)
        }

        // Если нужно открыть sidebar, а уже открыт fullscreen — не открываем
        if (mode.sidebar) {
            const fullscreenOpen = activeViews.value.find(v => viewModes[v]?.fullscreen)
            if (fullscreenOpen && fullscreenOpen !== view) return
        }

        if (!activeViews.value.includes(view)) {
            activeViews.value.push(view)
        }
    }

    const closeView = (view: 'now' | 'queue' | 'lyrics') => {
        activeViews.value = activeViews.value.filter(v => v !== view)
    }

    const isViewOpen = (view: 'now' | 'queue' | 'lyrics') => {
        return activeViews.value.includes(view)
    }

    const isFullScreenMode = ref(false)

    const enterFullScreenMode = () => {
        isFullScreenMode.value = true
    }

    const exitFullScreenMode = () => {
        isFullScreenMode.value = false
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

        if (lastError) {
            console.error('Ошибка при проверке последнего прослушивания:', lastError.message)
            return
        }

        const lastTrackId = lastListen?.track_id
        const lastPlayedAt = lastListen?.played_at ? new Date(lastListen.played_at) : null
        const now = new Date()
        const timeSinceLast = lastPlayedAt ? (now.getTime() - lastPlayedAt.getTime()) / 1000 : Infinity

        if (lastTrackId === trackId && timeSinceLast < 300) return

        const { error: insertError } = await supabase.from('play_history').insert({
            user_id: user.value.id,
            track_id: trackId
        })

        if (!insertError) {
            lastListenedTrackId.value = trackId
        } else {
            console.error('Ошибка при записи прослушивания:', insertError.message)
        }
    }

    const openFullPlayer = () => {
        showFullPlayer.value = true
    }

    const closeFullPlayer = () => {
        showFullPlayer.value = false
    }

    let progressInterval: any = null
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

    const play = (track: any, trackList: any[] = []) => {
        if (sound.value) {
            sound.value.stop()
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
            onend: () => {
                if (isRepeat.value) {
                    sound.value?.play()
                } else {
                    playNext()
                }
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

    watch(currentTrack, () => {
        if (currentTrack.value) recordListen()
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

    const replaceQueue = (newQueue: any[], startTrack?: any) => {
        queue.value = [...newQueue]
        const index = startTrack
            ? newQueue.findIndex(t => t.id === startTrack.id)
            : 0
        currentTrackIndex.value = index
        play(newQueue[index], newQueue)
    }

    onUnmounted(() => stopProgressTracking())

    return {
        // state
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        queue,
        currentTrackIndex,
        isRepeat,
        isShuffle,
        showFullPlayer,
        activeTab,
        activeViews,


        // actions
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
        openFullPlayer,
        closeFullPlayer,
        replaceQueue,
        openView,
        closeView,
        isViewOpen,
        enterFullScreenMode,
        exitFullScreenMode
    }
})
