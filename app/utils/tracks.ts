import type { Track, TrackArtist } from '#shared/types'

/** Embed for direct `tracks` queries: credited authors with their profiles. */
export const TRACK_AUTHORS_SELECT = 'track_authors(order_index,status,profile:profiles!track_authors_profile_id_fkey(id,username,slug,avatar_url))'

/** Standard column list for direct `tracks` queries rendered in the UI. */
export const TRACK_SELECT = `id,title,audio_url,cover_url,duration_seconds,album_id,user_id,created_at,likes_count,slug,${TRACK_AUTHORS_SELECT}`

function toArtist(raw: any): TrackArtist | null {
    const p = raw?.profile ?? raw?.author ?? raw
    const id = p?.id ?? p?.profile_id ?? p?.author_id
    if (!id) return null
    return {
        id,
        username: p.username ?? p.name ?? null,
        slug: p.slug ?? null,
        avatar_url: p.avatar_url ?? null,
    }
}

/**
 * Extracts credited artists from any of the shapes the DB returns:
 * - `track_authors` embed (see TRACK_AUTHORS_SELECT); only approved credits are shown
 * - `authors` json from RPCs / the tracks_with_authors view
 * - an already-normalized `authors` array
 */
export function extractArtists(row: any): TrackArtist[] {
    let list: any[] = []

    if (Array.isArray(row?.track_authors)) {
        list = row.track_authors
    } else if (Array.isArray(row?.authors)) {
        list = row.authors
    } else if (typeof row?.authors === 'string') {
        try {
            const parsed = JSON.parse(row.authors)
            if (Array.isArray(parsed)) list = parsed
        } catch {
            // not JSON — ignore
        }
    }

    // Credits carry status/order_index (both the embed and the RPC json); pending invites are hidden.
    list = list
        .filter(item => !item?.status || item.status === 'approved')
        .sort((a, b) => (a?.order_index ?? 0) - (b?.order_index ?? 0))

    const seen = new Set<string>()
    const out: TrackArtist[] = []
    for (const item of list) {
        const artist = toArtist(item)
        if (artist && !seen.has(artist.id)) {
            seen.add(artist.id)
            out.push(artist)
        }
    }
    return out
}

/** Normalizes a track row / RPC result into the UI `Track` shape. */
export function toTrack(row: any, extra: Partial<Track> = {}): Track {
    const src = row?.track && !row.id ? row.track : row
    return {
        id: src.id,
        title: src.title ?? 'Untitled',
        audio_url: src.audio_url ?? null,
        cover_url: src.cover_url ?? null,
        duration_seconds: src.duration_seconds ?? null,
        album_id: src.album_id ?? null,
        user_id: src.user_id ?? null,
        created_at: src.created_at ?? null,
        likes_count: src.likes_count ?? 0,
        slug: src.slug ?? null,
        lyrics: src.lyrics ?? undefined,
        authors: extractArtists(src),
        ...(src.is_liked_by_user != null && { is_liked_by_user: !!src.is_liked_by_user }),
        ...extra,
    }
}

export function toTracks(rows: any[] | null | undefined, extra: Partial<Track> = {}): Track[] {
    return (rows ?? []).filter(r => r && (r.id || r.track?.id)).map(r => toTrack(r, extra))
}

/** "Artist A, Artist B" — for places where links are not needed (Media Session, titles). */
export function artistNames(track: Pick<Track, 'authors'> | null | undefined, fallback = 'Unknown artist'): string {
    const names = (track?.authors ?? []).map(a => a.username).filter(Boolean)
    return names.length ? names.join(', ') : fallback
}
