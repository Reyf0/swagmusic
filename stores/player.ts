import { defineStore } from 'pinia'
import { Howl } from 'howler'

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

    const lastListenedTrackId = ref<string | null>(null)

    const recordListen = async () => {
        const supabase = useSupabaseClient()
        const user = useSupabaseUser()
        const trackId = currentTrack.value?.id

        if (!user.value || !trackId) return
        if (lastListenedTrackId.value === trackId) return

        // 1. Получаем последнее прослушивание пользователя
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

        // 2. Проверка условий:
        if (lastTrackId === trackId && timeSinceLast < 300) {
            // тот же трек и прошло меньше 5 минут — не записываем
            return
        }

        // 3. Запись прослушивания
        const { error: insertError } = await supabase.from('play_history').insert({
            user_id: user.value.id,
            track_id: trackId
        })



        if (insertError) {
            console.error('Ошибка при записи прослушивания:', insertError.message)
        } else {
            lastListenedTrackId.value = currentTrack.value.id
        }
    }


    const openFullPlayer = () => {
        showFullPlayer.value = true
    }

    const closeFullPlayer = () => {
        showFullPlayer.value = false
    }

    // Update progress every second when playing
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

        currentTrack.value = track
        sound.value = new Howl({
            src: [track.audio_url],
            html5: true,
            volume: volume.value,
            onend: () => {
                if (isRepeat.value) {
                    // Replay the same track
                    sound.value?.play()
                } else {
                    // Play next track if available
                    playNext()
                }
            },
            onload: () => {
                duration.value = sound.value?.duration() || 0
            },
            onplay: () => {
                startProgressTracking()
                isPlaying.value = true
                recordListen().then(() => {}).catch(error => console.error('Error recording listen:', error))
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

        // Set up queue if provided
        if (trackList.length > 0) {
            queue.value = [...trackList]
            currentTrackIndex.value = queue.value.findIndex(t => t.id === track.id)
        }

        sound.value.play()
        isPlaying.value = true
    }

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
        if (queue.value.length === 0 || currentTrackIndex.value === -1) {
            stop()
            return
        }

        let nextIndex = -1

        if (isShuffle.value) {
            // Random track excluding current one
            const availableIndices = Array.from(
                { length: queue.value.length }, 
                (_, i) => i
            ).filter(i => i !== currentTrackIndex.value)

            if (availableIndices.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableIndices.length)
                nextIndex = availableIndices[randomIndex]
            }
        } else {
            // Next track in sequence
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
        if (queue.value.length === 0 || currentTrackIndex.value === -1) {
            stop()
            return
        }

        // If current time > 3 seconds, restart current track instead of previous
        if (currentTime.value > 3) {
            seek(0)
            return
        }

        let prevIndex = -1

        if (isShuffle.value) {
            // Random track excluding current one
            const availableIndices = Array.from(
                { length: queue.value.length }, 
                (_, i) => i
            ).filter(i => i !== currentTrackIndex.value)

            if (availableIndices.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableIndices.length)
                prevIndex = availableIndices[randomIndex]
            }
        } else {
            // Previous track in sequence
            prevIndex = (currentTrackIndex.value - 1 + queue.value.length) % queue.value.length
        }

        if (prevIndex !== -1) {
            currentTrackIndex.value = prevIndex
            play(queue.value[prevIndex], queue.value)
        } else {
            stop()
        }
    }

    // Clean up on component unmount
    onUnmounted(() => {
        stopProgressTracking()
    })

    return {
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        queue,
        isRepeat,
        isShuffle,
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
        showFullPlayer,
        openFullPlayer,
        closeFullPlayer
    }
})
