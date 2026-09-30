type ShareKind = 'track' | 'album' | 'playlist' | 'artist'

export type ShareInfo = {
    title: string
    subtitle?: string
    meta?: string
    image?: string
    /** schema.org node describing the page's main entity (structured data for search engines). */
    schema?: Record<string, unknown>
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const LABEL: Record<ShareKind, string> = { track: 'Track', album: 'Album', playlist: 'Playlist', artist: 'Artist' }
const OG_TYPE = { track: 'music.song', album: 'music.album', playlist: 'music.playlist', artist: 'profile' } as const

/** Seconds as an ISO 8601 duration, e.g. 232 → "PT3M52S". */
const isoDuration = (seconds: number) => `PT${Math.floor(seconds / 60)}M${Math.round(seconds % 60)}S`

async function fetchShareInfo(kind: ShareKind, id: string, siteUrl: string): Promise<ShareInfo | null> {
    const supabase = useSupabase()
    const abs = (path: string) => new URL(path, siteUrl).href
    const artist = (a: { id: string; username: string | null }) => ({ '@type': 'MusicGroup', name: a.username, url: abs(`/authors/${a.id}`) })
    if (kind === 'track') {
        const { data: row } = await supabase.from('tracks').select(TRACK_SELECT + ', album:albums(id, title)').eq('id', id).maybeSingle()
        if (!row) return null
        const track = toTrack(row)
        const names = artistNames(track, '')
        const albumRow = (row as unknown as { album: { id: string; title: string } | null }).album
        const album = albumRow?.title
        return {
            title: track.title,
            subtitle: names ? `by ${names}` : undefined,
            meta: [album, track.duration_seconds ? formatDuration(track.duration_seconds) : null].filter(Boolean).join(' · ') || undefined,
            image: track.cover_url ?? undefined,
            schema: {
                '@type': 'MusicRecording',
                name: track.title,
                url: abs(`/tracks/${track.id}`),
                image: track.cover_url ?? undefined,
                duration: track.duration_seconds ? isoDuration(track.duration_seconds) : undefined,
                datePublished: track.created_at ?? undefined,
                byArtist: track.authors.filter(a => a.username).map(artist),
                inAlbum: albumRow ? { '@type': 'MusicAlbum', name: albumRow.title, url: abs(`/albums/${albumRow.id}`) } : undefined,
            },
        }
    }
    if (kind === 'album') {
        const [{ data: album }, { count }] = await Promise.all([
            supabase.from('albums').select('title, cover_url, created_at, author:profiles!albums_user_id_fkey(id, username)').eq('id', id).maybeSingle(),
            supabase.from('tracks').select('id', { count: 'exact', head: true }).eq('album_id', id),
        ])
        if (!album) return null
        const authorRow = album.author as { id: string; username: string | null } | null
        const author = authorRow?.username
        return {
            title: album.title,
            subtitle: author ? `by ${author}` : undefined,
            meta: plural(count ?? 0, 'track'),
            image: album.cover_url ?? undefined,
            schema: {
                '@type': 'MusicAlbum',
                name: album.title,
                url: abs(`/albums/${id}`),
                image: album.cover_url ?? undefined,
                numTracks: count ?? 0,
                datePublished: album.created_at ?? undefined,
                byArtist: authorRow?.username ? artist(authorRow) : undefined,
            },
        }
    }
    if (kind === 'playlist') {
        const { data: playlist } = await supabase
            .from('playlists')
            .select('name, cover_url, playlist_tracks(count), owner:profiles!playlists_user_id_fkey(username), first:playlist_tracks(position, track:tracks(cover_url))')
            .eq('id', id)
            .order('position', { referencedTable: 'first', ascending: true })
            .limit(1, { referencedTable: 'first' })
            .maybeSingle()
        if (!playlist) return null
        const count = (playlist.playlist_tracks as unknown as { count: number }[])?.[0]?.count ?? 0
        const owner = (playlist.owner as { username: string | null } | null)?.username
        const firstCover = (playlist.first as unknown as { track: { cover_url: string | null } | null }[])?.[0]?.track?.cover_url
        return {
            title: playlist.name,
            subtitle: owner ? `by ${owner}` : undefined,
            meta: plural(count, 'track'),
            image: playlist.cover_url ?? firstCover ?? undefined,
            schema: {
                '@type': 'MusicPlaylist',
                name: playlist.name,
                url: abs(`/playlist/${id}`),
                image: playlist.cover_url ?? firstCover ?? undefined,
                numTracks: count,
                author: owner ? { '@type': 'Person', name: owner } : undefined,
            },
        }
    }
    const [{ data: profile }, { count }] = await Promise.all([
        supabase.from('profiles').select('username, full_name, avatar_url').eq('id', id).maybeSingle(),
        supabase.from('track_authors').select('id', { count: 'exact', head: true }).eq('profile_id', id).in('status', CREDITED_STATUSES),
    ])
    if (!profile) return null
    const name = profile.username || profile.full_name || 'Unnamed artist'
    return {
        title: name,
        meta: plural(count ?? 0, 'track'),
        image: profile.avatar_url ?? undefined,
        schema: { '@type': 'MusicGroup', name, url: abs(`/authors/${id}`), image: profile.avatar_url ?? undefined },
    }
}

/**
 * The few fields a link preview needs for an album / playlist / artist page, fetched during SSR.
 *
 * Link preview bots only read the server-rendered HTML, while these pages load their content in
 * the browser. Call in <script setup> as `const share = await useShareInfo(...)` and then
 * `useShareMeta(kind, share)`: the meta calls must run after the await in the page itself,
 * where Vue restores the component context (inside this composable it would be lost).
 */
export async function useShareInfo(kind: ShareKind, id: MaybeRefOrGetter<string>) {
    const siteUrl = useSiteConfig().url || useRequestURL().origin
    const { data } = await useAsyncData(
        `share-${kind}-${toValue(id)}`,
        () => fetchShareInfo(kind, toValue(id), siteUrl),
        { watch: [() => toValue(id)] },
    )
    return data
}

/** Title, description, link preview image and structured data from `useShareInfo()`. */
export function useShareMeta(kind: ShareKind, share: Ref<ShareInfo | null | undefined>) {
    const label = LABEL[kind]
    const info = share.value

    useSeoMeta({
        title: () => share.value?.title ?? label,
        description: () => share.value
            ? `${[label, share.value.subtitle, share.value.meta].filter(Boolean).join(' · ')}. Listen on SwagMusic.`
            : undefined,
        ogType: OG_TYPE[kind],
    })

    // The image URL encodes these props once; bots only see the server render, where `info` is loaded.
    defineOgImage('Share', {
        kind: label,
        title: info?.title ?? label,
        subtitle: info?.subtitle,
        meta: info?.meta,
        image: info?.image,
        round: kind === 'artist',
    })

    // Braces matter: nuxt-schema-org rewrites useSchemaOrg() calls for the client build.
    if (info?.schema) {
        useSchemaOrg([info.schema])
    }
}
