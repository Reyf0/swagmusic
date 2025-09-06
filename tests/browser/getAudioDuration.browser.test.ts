import { describe, it, expect, vi } from 'vitest'

describe('getAudioDuration', () => {
    const getAudioDuration = async (src: string): Promise<number> => {
        return new Promise((resolve, reject) => {
            try {
                const audio = new Audio(src)
                audio.addEventListener('loadedmetadata', () => {
                    resolve(Math.floor(audio.duration))
                })
                audio.addEventListener('error', (e) => {
                    reject(e)
                })
            } catch (e) {
                reject(e)
            }
        })
    }

    it('Возвращает продолжительность аудио', async () => {
        const track_url = 'https://ofdlecccivsirfsaghac.supabase.co/storage/v1/object/public/tracks/1755083821623_TEST.mp3'
        const result = await getAudioDuration(track_url)
        expect(result).toEqual((5*60)+42)
    })
})
