export async function getAudioDurationFromFile(file: File, timeoutMs = 7000): Promise<number | null> {
    return new Promise((resolve) => {
        if (!file) return resolve(null)

        const objectUrl = URL.createObjectURL(file)
        const audio = new Audio()
        let settled = false
        const cleanup = () => {
            try {
                audio.pause()
            } catch {}
            audio.src = ''
            URL.revokeObjectURL(objectUrl)
            audio.removeEventListener('loadedmetadata', onLoaded)
            audio.removeEventListener('error', onError)
        }

        const onLoaded = () => {
            if (settled) return
            settled = true
            const d = isFinite(audio.duration) ? Math.round(audio.duration) : null
            cleanup()
            resolve(d)
        }

        const onError = () => {
            if (settled) return
            settled = true
            cleanup()
            resolve(null)
        }

        audio.preload = 'metadata'
        audio.addEventListener('loadedmetadata', onLoaded)
        audio.addEventListener('error', onError)

        // some browsers require assign src after listeners
        audio.src = objectUrl

        // timeout fallback
        setTimeout(() => {
            if (settled) return
            settled = true
            cleanup()
            resolve(null)
        }, timeoutMs)
    })
}