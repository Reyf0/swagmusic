import type { Track } from '#shared/types'

/**
 * Play button behaviour for track lists: clicking the current track toggles
 * play/pause, clicking another one starts it with `trackList` as the queue.
 */
export const usePlayTrack = () => {
    const playerStore = usePlayerStore()
    const { currentTrack, isPlaying, queue } = storeToRefs(playerStore)

    const isCurrentTrack = (track: Pick<Track, 'id'>) => currentTrack.value?.id === track.id
    const isTrackPlaying = (track: Pick<Track, 'id'>) => isCurrentTrack(track) && isPlaying.value

    function playTrack(track: Track, trackList: Track[] = []) {
        if (isCurrentTrack(track)) {
            playerStore.togglePlay()
            return
        }
        playerStore.play(track, trackList.length ? trackList : [track])
    }

    /** The queue was started from `list` (it still holds all of its tracks) and one of them is loaded. */
    function isListActive(list: Pick<Track, 'id'>[]) {
        if (!list.length || !currentTrack.value || !list.some(isCurrentTrack)) return false
        const queued = new Set(queue.value.map(t => t.id))
        return list.every(t => queued.has(t.id))
    }
    const isListPlaying = (list: Pick<Track, 'id'>[]) => isListActive(list) && isPlaying.value

    /** "Play all" button: pause / resume when this list is already playing, otherwise start from the top. */
    function playList(list: Track[]) {
        if (isListActive(list)) {
            playerStore.togglePlay()
            return
        }
        if (list[0]) playerStore.play(list[0], list)
    }

    return { playTrack, isCurrentTrack, isTrackPlaying, playList, isListActive, isListPlaying }
}
