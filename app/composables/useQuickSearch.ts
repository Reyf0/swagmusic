import { refDebounced } from '@vueuse/core'
import type { Track } from '#shared/types'

export type QuickArtist = { id: string; username: string | null; full_name: string | null; avatar_url: string | null }
type Owner = { username: string | null } | null
export type QuickAlbum = { id: string; title: string; cover_url: string | null; owner: Owner }
export type QuickPlaylist = { id: string; name: string; cover_url: string | null; owner: Owner }

export type QuickResults = {
    tracks: Track[]
    artists: QuickArtist[]
    albums: QuickAlbum[]
    playlists: QuickPlaylist[]
}

const EMPTY: QuickResults = { tracks: [], artists: [], albums: [], playlists: [] }
const TRACK_LIMIT = 5
const OTHER_LIMIT = 3

/**
 * Search-as-you-type for the header search preview: a few tracks, artists, albums and playlists.
 *
 * Tracks combine the full-text search (whole words, ranked) with `autocomplete_tracks` (title
 * prefix / trigram), so partial input like "hd" already finds "HDMI".
 */
export function useQuickSearch(query: Ref<string>, enabled: Ref<boolean> = ref(true)) {
    const supabase = useSupabase()
    const tracksApi = useTracksApi()

    const results = ref<QuickResults>(EMPTY)
    const loading = ref(false)
    const term = refDebounced(computed(() => query.value.trim()), 200)
    let requestId = 0

    async function run(q: string) {
        const id = ++requestId
        if (!q || !enabled.value) {
            results.value = EMPTY
            loading.value = false
            return
        }
        loading.value = true
        const pattern = orIlikePattern(q)
        try {
            const [fulltext, prefix, artists, albums, playlists] = await Promise.all([
                supabase.rpc('get_tracks_search', { p_q: q, p_limit: TRACK_LIMIT }),
                supabase.rpc('autocomplete_tracks', { p_q: q, p_limit: TRACK_LIMIT }),
                supabase.from('profiles').select('id, username, full_name, avatar_url')
                    .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
                    .not('username', 'is', null)
                    .limit(OTHER_LIMIT),
                supabase.from('albums').select('id, title, cover_url, owner:profiles!albums_user_id_fkey(username)').ilike('title', pattern).limit(OTHER_LIMIT),
                supabase.from('playlists').select('id, name, cover_url, owner:profiles!playlists_user_id_fkey(username)').ilike('name', pattern).limit(OTHER_LIMIT),
            ])
            // Ranked full-text hits first, then prefix / fuzzy title matches.
            const ids = [...new Set([...(fulltext.data ?? []), ...(prefix.data ?? [])].map(t => t.id))].slice(0, TRACK_LIMIT)
            const tracks = await tracksApi.getTracksByIds(ids)
            if (id !== requestId) return // a newer query is already running
            results.value = {
                tracks,
                artists: artists.data ?? [],
                albums: (albums.data ?? []) as QuickAlbum[],
                playlists: (playlists.data ?? []) as QuickPlaylist[],
            }
        } catch (e) {
            if (id === requestId) results.value = EMPTY
            console.warn('Quick search failed', e)
        } finally {
            if (id === requestId) loading.value = false
        }
    }

    watch([term, enabled], ([q]) => run(q), { immediate: true })

    const isEmpty = computed(() => !results.value.tracks.length && !results.value.artists.length
        && !results.value.albums.length && !results.value.playlists.length)

    return { results, loading, isEmpty, term }
}
