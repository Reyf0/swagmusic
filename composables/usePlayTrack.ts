import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'

export const usePlayTrack = () => {
    const playerStore = usePlayerStore()
    const { currentTrack, isPlaying } = storeToRefs(playerStore)

    const isCurrentTrack = (track: any) => {
        return currentTrack.value && currentTrack.value.id === track.id
    }

    const playTrack = (track: any, trackList: any[]) => {
        if (isCurrentTrack(track)) {
            if (isPlaying.value) {
                playerStore.pause()
            } else {
                playerStore.resume()
            }
        } else {
            playerStore.play(track, trackList)
        }
    }

    return { playTrack, isCurrentTrack }
}
