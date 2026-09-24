/** 272 → "4:32", 3725 → "1:02:05"; missing / invalid values → "0:00". */
export const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '0:00'
    const total = Math.floor(seconds)
    const hours = Math.floor(total / 3600)
    const mins = Math.floor((total % 3600) / 60)
    const secs = total % 60
    const ss = secs.toString().padStart(2, '0')
    return hours ? `${hours}:${mins.toString().padStart(2, '0')}:${ss}` : `${mins}:${ss}`
}
