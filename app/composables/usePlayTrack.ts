import type { Track } from '#shared/types'

/**
 * Play button behaviour for track lists: clicking the current track toggles
 * play/pause, clicking another one starts it with `trackList` as the queue.
 */
export const usePlayTrack = () => {
    const playerStore = usePlayerStore()
    const { currentTrack, isPlaying } = storeToRefs(playerStore)

    const isCurrentTrack = (track: Pick<Track, 'id'>) => currentTrack.value?.id === track.id
    const isTrackPlaying = (track: Pick<Track, 'id'>) => isCurrentTrack(track) && isPlaying.value

    function playTrack(track: Track, trackList: Track[] = []) {
        if (isCurrentTrack(track)) {
            playerStore.togglePlay()
            return
        }
        playerStore.play(track, trackList.length ? trackList : [track])
    }

    return { playTrack, isCurrentTrack, isTrackPlaying }
}
