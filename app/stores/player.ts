import { defineStore } from 'pinia'
import { Howl } from 'howler'
import type { Track } from '#shared/types'

type ViewName = 'now' | 'queue' | 'lyrics'
type ViewMode = 'sidebar' | 'fullscreen'
export type RepeatMode = 'off' | 'all' | 'one'

const AUDIO_FORMATS = ['mp3', 'mpeg', 'wav', 'ogg', 'oga', 'opus', 'flac', 'aac', 'm4a', 'webm', 'weba']

/** Codec hint for Howler from the file extension; older uploads have none and are MP3. */
export function audioFormat(url: string): string {
    const ext = new URL(url, 'http://x').pathname.split('.').pop()?.toLowerCase() ?? ''
    return AUDIO_FORMATS.includes(ext) ? ext : 'mp3'
}

const VOLUME_KEY = 'swagmusic:volume'

export const usePlayerStore = defineStore('player', () => {
    const supabase = useSupabase()
    const user = useSupabaseUser()

    const currentTrack = ref<Track | null>(null)
    const isPlaying = ref(false)
    const isLoading = ref(false)
    const currentTime = ref(0)
    const duration = ref(0)
    const volume = ref(1)
    const queue = ref<Track[]>([])
    const currentTrackIndex = ref(-1)
    const repeatMode = ref<RepeatMode>('off')
    const isShuffle = ref(false)

    // The Howl instance is not reactive state (and must not be serialized into the SSR payload).
    let sound: Howl | null = null
    let progressTimer: ReturnType<typeof setInterval> | null = null
    // Load errors in a row; stops auto-skipping once every track in the queue has failed.
    let consecutiveErrors = 0
    // A listen counts once the current track has actually been playing for a while (not on
    // start: tracks that fail to load or are skipped right away must not inflate play counts).
    const LISTEN_AFTER_SECONDS = 10
    const PROGRESS_TICK_MS = 250
    let listenedSeconds = 0
    let listenRecorded = false

    // ───────────── Views (now playing / queue / lyrics panels) ─────────────

    const viewModes: Record<ViewName, { sidebar: boolean; fullscreen: boolean }> = {
        now: { sidebar: true, fullscreen: true },
        queue: { sidebar: true, fullscreen: false },
        lyrics: { sidebar: false, fullscreen: true }
    }
    const activeViews = ref<Record<ViewName, ViewMode | null>>({ now: null, queue: null, lyrics: null })

    const findView = (mode: ViewMode) =>
        (Object.entries(activeViews.value) as [ViewName, ViewMode | null][]).find(([, m]) => m === mode)?.[0] ?? null
    const getSidebarView = computed<ViewName | null>(() => findView('sidebar'))
    const getFullscreenView = computed<ViewName | null>(() => findView('fullscreen'))
    const isFullScreenMode = computed(() => getFullscreenView.value !== null)
    const isViewOpen = (view: ViewName) => activeViews.value[view] !== null

    function openView(view: ViewName) {
        if (activeViews.value[view]) return
        const supports = viewModes[view]
        if (supports.sidebar) {
            const sidebar = getSidebarView.value
            if (sidebar) activeViews.value[sidebar] = null
            activeViews.value[view] = 'sidebar'
        } else if (supports.fullscreen) {
            const fullscreen = getFullscreenView.value
            if (fullscreen) activeViews.value[fullscreen] = null
            activeViews.value[view] = 'fullscreen'
        }
    }

    function closeView(view: ViewName) {
        activeViews.value[view] = null
    }

    function toggleView(view: ViewName) {
        if (isViewOpen(view)) closeView(view)
        else openView(view)
    }

    function switchViewMode(view: ViewName) {
        const currentMode = activeViews.value[view]
        if (!currentMode) return
        const supported = viewModes[view]
        const newMode: ViewMode | null =
            currentMode === 'sidebar' && supported.fullscreen ? 'fullscreen'
                : currentMode === 'fullscreen' && supported.sidebar ? 'sidebar'
                    : null
        if (!newMode) return

        activeViews.value[view] = null
        const occupant = findView(newMode)
        if (occupant) activeViews.value[occupant] = null
        activeViews.value[view] = newMode
    }

    const hasNoActiveViews = () => Object.values(activeViews.value).every(mode => mode === null)

    // ───────────── Playback ─────────────

    function startProgress() {
        stopProgress()
        progressTimer = setInterval(() => {
            if (!sound || !isPlaying.value) return
            currentTime.value = Number(sound.seek()) || 0
            listenedSeconds += PROGRESS_TICK_MS / 1000
            const threshold = Math.min(LISTEN_AFTER_SECONDS, (duration.value || LISTEN_AFTER_SECONDS) / 2)
            if (!listenRecorded && currentTrack.value && listenedSeconds >= threshold) {
                listenRecorded = true
                recordListen(currentTrack.value.id)
            }
        }, PROGRESS_TICK_MS)
    }

    function stopProgress() {
        if (progressTimer) clearInterval(progressTimer)
        progressTimer = null
    }

    function unloadSound() {
        stopProgress()
        if (!sound) return
        try {
            sound.off()
            sound.stop()
            sound.unload()
        } catch (e) {
            console.warn('Error unloading previous sound', e)
        }
        sound = null
    }

    async function recordListen(trackId: string) {
        if (!user.value) return
        const { error } = await supabase.from('play_history').insert({ user_id: user.value.id, track_id: trackId })
        if (error) console.warn('Could not record listen', error.message)
    }

    /** Loads `track` and starts playback. Optionally replaces the queue with `trackList`. */
    function play(track: Track, trackList?: Track[]) {
        if (trackList?.length) {
            queue.value = [...trackList]
            currentTrackIndex.value = queue.value.findIndex(t => t.id === track.id)
        }
        if (currentTrackIndex.value < 0 || queue.value[currentTrackIndex.value]?.id !== track.id) {
            // not part of the current queue: play it on its own
            queue.value = [track]
            currentTrackIndex.value = 0
        }

        if (sound && currentTrack.value?.id === track.id) {
            sound.play()
            return
        }

        unloadSound()
        currentTrack.value = track
        currentTime.value = 0
        duration.value = track.duration_seconds ?? 0

        if (!track.audio_url) {
            useToast().add({ title: 'This track has no audio file', description: track.title, color: 'error' })
            return
        }

        isLoading.value = true
        const howl = new Howl({
            src: [track.audio_url],
            // Uploaded files have no extension in their URL, so Howler can't guess the codec.
            format: [audioFormat(track.audio_url)],
            html5: true,
            volume: volume.value,
            onload: () => {
                isLoading.value = false
                duration.value = howl.duration() || duration.value
            },
            onloaderror: (_id, err) => {
                isLoading.value = false
                isPlaying.value = false
                console.error('Howler load error', { err, src: track.audio_url })
                useToast().add({ title: 'Could not load track', description: track.title, color: 'error' })
                // skip to the next track, but don't loop forever when nothing can be played
                consecutiveErrors += 1
                if (queue.value.length > 1 && consecutiveErrors < queue.value.length) playNext(true)
                else consecutiveErrors = 0
            },
            onplayerror: () => {
                // Autoplay was blocked: wait for the browser to unlock audio, then retry.
                isPlaying.value = false
                howl.once('unlock', () => howl.play())
            },
            onplay: () => {
                consecutiveErrors = 0
                isLoading.value = false
                isPlaying.value = true
                startProgress()
                updateMediaSession()
            },
            onpause: () => {
                isPlaying.value = false
                stopProgress()
            },
            onstop: () => {
                isPlaying.value = false
                stopProgress()
            },
            onend: () => {
                if (repeatMode.value === 'one') {
                    // each repeat is a new listen
                    listenedSeconds = 0
                    listenRecorded = false
                    howl.play()
                    return
                }
                playNext(true)
            },
        })
        sound = howl

        if (hasNoActiveViews() && import.meta.client && window.matchMedia('(min-width: 768px)').matches) openView('now')

        listenedSeconds = 0
        listenRecorded = false
        howl.play()
    }

    function pause() {
        sound?.pause()
    }

    function resume() {
        if (sound) sound.play()
        else if (currentTrack.value) play(currentTrack.value)
    }

    function togglePlay() {
        if (isPlaying.value) pause()
        else resume()
    }

    function stop() {
        sound?.stop()
        currentTime.value = 0
    }

    function seek(position: number) {
        const target = Math.max(0, Math.min(position, duration.value || position))
        if (sound) sound.seek(target)
        currentTime.value = target
        updatePositionState()
    }

    function setVolume(newVolume: number) {
        volume.value = Math.max(0, Math.min(1, newVolume))
        sound?.volume(volume.value)
        if (import.meta.client) {
            try { localStorage.setItem(VOLUME_KEY, String(volume.value)) } catch { /* storage unavailable */ }
        }
    }

    function cycleRepeat() {
        repeatMode.value = repeatMode.value === 'off' ? 'all' : repeatMode.value === 'all' ? 'one' : 'off'
    }

    function toggleShuffle() {
        isShuffle.value = !isShuffle.value
    }

    function randomOtherIndex() {
        const indices = queue.value.map((_, i) => i).filter(i => i !== currentTrackIndex.value)
        return indices.length ? indices[Math.floor(Math.random() * indices.length)]! : -1
    }

    /** @param auto true when called because the current track ended */
    function playNext(auto = false) {
        if (!queue.value.length) return stop()

        let nextIndex: number
        if (isShuffle.value) {
            nextIndex = randomOtherIndex()
        } else {
            nextIndex = currentTrackIndex.value + 1
            if (nextIndex >= queue.value.length) nextIndex = repeatMode.value === 'all' || !auto ? 0 : -1
        }

        if (nextIndex < 0) {
            // end of the queue
            stop()
            return
        }
        playAt(nextIndex)
    }

    function playPrevious() {
        if (!queue.value.length) return
        if (currentTime.value > 3) {
            seek(0)
            return
        }
        const prevIndex = isShuffle.value
            ? randomOtherIndex()
            : (currentTrackIndex.value - 1 + queue.value.length) % queue.value.length
        if (prevIndex >= 0) playAt(prevIndex)
    }

    function playAt(index: number) {
        const track = queue.value[index]
        if (!track) return
        currentTrackIndex.value = index
        play(track)
    }

    function replaceQueue(newQueue: Track[], startTrack?: Track) {
        if (!newQueue.length) return
        const index = startTrack ? newQueue.findIndex(t => t.id === startTrack.id) : 0
        queue.value = [...newQueue]
        playAt(Math.max(0, index))
    }

    /** Inserts `track` right after the current one. */
    function playNextInQueue(track: Track) {
        if (!currentTrack.value) return play(track)
        const existing = queue.value.findIndex((t, i) => t.id === track.id && i !== currentTrackIndex.value)
        if (existing >= 0) removeFromQueue(existing)
        queue.value.splice(currentTrackIndex.value + 1, 0, track)
        useToast().add({ title: 'Plays next', description: track.title, color: 'success' })
    }

    function addToQueue(track: Track) {
        if (!currentTrack.value) return play(track)
        queue.value.push(track)
        useToast().add({ title: 'Added to queue', description: track.title, color: 'success' })
    }

    function removeFromQueue(index: number) {
        if (index === currentTrackIndex.value || index < 0 || index >= queue.value.length) return
        queue.value.splice(index, 1)
        if (index < currentTrackIndex.value) currentTrackIndex.value -= 1
    }

    // ───────────── Media Session (lock screen / hardware keys) ─────────────

    function updateMediaSession() {
        if (!import.meta.client || !('mediaSession' in navigator) || !currentTrack.value) return
        const t = currentTrack.value
        navigator.mediaSession.metadata = new MediaMetadata({
            title: t.title,
            artist: artistNames(t, ''),
            artwork: t.cover_url ? [{ src: t.cover_url, sizes: '512x512' }] : [],
        })
        updatePositionState()
    }

    function updatePositionState() {
        if (!import.meta.client || !('mediaSession' in navigator) || !duration.value) return
        try {
            navigator.mediaSession.setPositionState({
                duration: duration.value,
                position: Math.min(currentTime.value, duration.value),
                playbackRate: 1,
            })
        } catch { /* unsupported */ }
    }

    if (import.meta.client) {
        try {
            const raw = localStorage.getItem(VOLUME_KEY)
            const saved = Number(raw)
            if (raw !== null && Number.isFinite(saved)) volume.value = Math.max(0, Math.min(1, saved))
        } catch { /* storage unavailable */ }

        if ('mediaSession' in navigator) {
            const ms = navigator.mediaSession
            const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
                ['play', () => resume()],
                ['pause', () => pause()],
                ['previoustrack', () => playPrevious()],
                ['nexttrack', () => playNext()],
                ['seekto', (details) => { if (details.seekTime != null) seek(details.seekTime) }],
            ]
            for (const [action, handler] of handlers) {
                try { ms.setActionHandler(action, handler) } catch { /* unsupported action */ }
            }
            watch(isPlaying, (playing) => { ms.playbackState = playing ? 'playing' : 'paused' })
        }
    }

    return {
        currentTrack,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        volume,
        queue,
        currentTrackIndex,
        repeatMode,
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
        togglePlay,
        stop,
        seek,
        setVolume,
        playNext,
        playPrevious,
        playAt,
        cycleRepeat,
        toggleShuffle,
        replaceQueue,
        playNextInQueue,
        addToQueue,
        removeFromQueue,

        // View logic
        openView,
        closeView,
        toggleView,
        isViewOpen,
        switchViewMode
    }
})
