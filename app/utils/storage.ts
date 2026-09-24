/**
 * Object key for an upload: `<userId>/<uuid>.<ext>`. Keys never contain user-provided
 * text, so titles with spaces / Cyrillic / emoji cannot produce invalid storage keys.
 */
export function buildStorageKey(userId: string, file: File): string {
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : ''
    return `${userId}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`
}

/** Extracts the object path from a public storage URL of `bucket`, or null if it is not one. */
export function storagePathFromPublicUrl(bucket: string, publicUrl: string | null | undefined): string | null {
    if (!publicUrl) return null
    const marker = `/storage/v1/object/public/${bucket}/`
    const i = publicUrl.indexOf(marker)
    if (i === -1) return null
    const path = publicUrl.slice(i + marker.length).split('?')[0]!
    try {
        return decodeURIComponent(path)
    } catch {
        return path
    }
}
