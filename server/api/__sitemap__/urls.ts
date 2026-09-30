import { createClient } from '@supabase/supabase-js'

/**
 * Sitemap entries for content pages: tracks, albums, non-empty playlists and artists with credited tracks.
 * Uses the publishable key, so it only ever lists what RLS lets anyone read.
 */
export default defineSitemapEventHandler(async () => {
    const { supabaseUrl, supabaseKey } = useRuntimeConfig().public
    if (!supabaseUrl || !supabaseKey) return []
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })

    const [tracks, albums, playlists, credits] = await Promise.all([
        supabase.from('tracks').select('id, created_at, cover_url, title'),
        supabase.from('albums').select('id, created_at, cover_url, title'),
        supabase.from('playlists').select('id, updated_at, created_at, playlist_tracks!inner(track_id)').limit(1, { referencedTable: 'playlist_tracks' }),
        supabase.from('track_authors').select('profile_id').in('status', CREDITED_STATUSES),
    ])
    for (const { error } of [tracks, albums, playlists, credits]) if (error) throw error

    const image = (url: string | null, title: string) => (url ? [{ loc: url, title }] : undefined)
    const artistIds = [...new Set((credits.data ?? []).map(c => c.profile_id).filter(Boolean))]

    return [
        ...(tracks.data ?? []).map(t => asSitemapUrl({ loc: `/tracks/${t.id}`, lastmod: t.created_at, images: image(t.cover_url, t.title) })),
        ...(albums.data ?? []).map(a => asSitemapUrl({ loc: `/albums/${a.id}`, lastmod: a.created_at, images: image(a.cover_url, a.title) })),
        ...(playlists.data ?? []).map(p => asSitemapUrl({ loc: `/playlist/${p.id}`, lastmod: p.updated_at ?? p.created_at })),
        ...artistIds.map(id => asSitemapUrl({ loc: `/authors/${id}` })),
    ]
})
