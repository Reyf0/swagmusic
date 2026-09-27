/** Tables the admin content endpoints may touch, with the columns they list and may edit. */
export const ADMIN_RESOURCES = {
    tracks: {
        select: 'id, title, audio_url, cover_url, duration_seconds, likes_count, created_at, owner:profiles!tracks_user_id_fkey1(id, username)',
        search: ['title'],
        editable: ['title'],
        files: { audio_url: 'tracks', cover_url: 'covers' },
    },
    albums: {
        select: 'id, title, cover_url, created_at, owner:profiles!albums_user_id_fkey(id, username)',
        search: ['title'],
        editable: ['title', 'description'],
        files: { cover_url: 'covers' },
    },
    playlists: {
        select: 'id, name, description, created_at, playlist_tracks(count), owner:profiles!playlists_user_id_fkey(id, username)',
        search: ['name'],
        editable: ['name', 'description'],
        files: {},
    },
} as const

export type AdminResource = keyof typeof ADMIN_RESOURCES

export function getAdminResource(event: Parameters<typeof getRouterParam>[0]): AdminResource {
    const name = getRouterParam(event, 'resource')
    if (!name || !(name in ADMIN_RESOURCES)) {
        throw createError({ statusCode: 404, statusMessage: 'Unknown resource' })
    }
    return name as AdminResource
}

/** Object path inside `bucket` for one of its public URLs, or null. */
export function storagePathFromUrl(bucket: string, url: unknown): string | null {
    if (typeof url !== 'string') return null
    const marker = `/storage/v1/object/public/${bucket}/`
    const i = url.indexOf(marker)
    if (i === -1) return null
    try {
        return decodeURIComponent(url.slice(i + marker.length).split('?')[0]!)
    } catch {
        return null
    }
}
