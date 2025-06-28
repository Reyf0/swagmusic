import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'

export const usePlayTrack = () => {
    const playerStore = usePlayerStore()
    const { currentTrack, isPlaying, queue, currentTrackIndex } = storeToRefs(playerStore)

    const isCurrentTrack = (track: any) => {
        return currentTrack.value?.id === track.id
    }

    const playTrack = (track: any, trackList: any[] = []) => {
        // Если клик по текущему треку — ставим на паузу или продолжаем
        if (isCurrentTrack(track)) {
            if (isPlaying.value) {
                playerStore.pause()
            } else {
                playerStore.resume()
            }
            return
        }

        const isSameQueue =
            queue.value.length === trackList.length &&
            queue.value.every((t, i) => t.id === trackList[i].id)

        if (isSameQueue) {
            // Если очередь та же, просто найди индекс и воспроизведи
            const index = trackList.findIndex(t => t.id === track.id)
            if (index !== -1) {
                playerStore.play(trackList[index], trackList)
            }
        } else {
            // Иначе заменяем очередь
            playerStore.replaceQueue(trackList, track)
        }
    }

    return { playTrack, isCurrentTrack }
}
