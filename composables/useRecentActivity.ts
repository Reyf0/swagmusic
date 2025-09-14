import { ref } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Playlist, AuthorUI, RecentTrackItem } from '@/types'

export const useRecentActivity = () => {
    const supabase: SupabaseClient<Database> = useSupabaseClient()
    const user = useSupabaseUser()

    const tracksStore = useTracksStore()

    // state
    const loading = ref(false)
    const error = ref<string | null>(null)

    const recentTracks = ref<RecentTrackItem[]>([])
    const recentAuthors = ref<AuthorUI[]>([])
    const recentPlaylists = ref<Array<{ playlist: Playlist; last_played: string; plays: number }>>([])

    // Abort controllers
    let tracksController: AbortController | null = null
    let authorsController: AbortController | null = null
    let playlistsController: AbortController | null = null
    let detailsController: AbortController | null = null

    function isAbort(e: any) {
        return e && (e.name === 'AbortError' || /aborted/i.test(String(e?.message ?? '')))
    }

    /** Cancel in-flight requests */
    function cancelAll() {
        try { tracksController?.abort() } catch {}
        try { authorsController?.abort() } catch {}
        try { playlistsController?.abort() } catch {}
        try { detailsController?.abort() } catch {}
        tracksController = authorsController = playlistsController = detailsController = null
    }

    /**
     * Load all recent activity:
     *  - recent tracks (via RPC get_user_recent_tracks) -> then fetch full tracks_with_authors rows
     *  - recent authors (via RPC get_user_recent_authors)
     *  - recent playlists (via RPC get_user_recent_playlists) -> then fetch playlists rows
     */
    async function loadAll(options?: { tracksLimit?: number; authorsLimit?: number; playlistsLimit?: number }) {
        cancelAll()
        if (!user.value?.id) {
            // Not logged in — clear and return
            recentTracks.value = []
            recentAuthors.value = []
            recentPlaylists.value = []
            return
        }

        loading.value = true
        error.value = null

        const tracksLimit = options?.tracksLimit ?? 20
        const authorsLimit = options?.authorsLimit ?? 10
        const playlistsLimit = options?.playlistsLimit ?? 10

        // create controllers
        tracksController = new AbortController()
        authorsController = new AbortController()
        playlistsController = new AbortController()
        detailsController = new AbortController()

        try {
            // 1) get recent track ids + last_played
            const rpcTracks = await supabase
                .rpc('get_user_recent_tracks_full', {
                    p_user_id: user.value.id,
                    p_limit: tracksLimit
                })
                .abortSignal(tracksController.signal)

            if (rpcTracks.error) throw rpcTracks.error
            const recentRows = (rpcTracks.data ?? []) as Array<{ track_id: string; last_played: string; play_count: number }>


            const trackIds = recentRows.map(r => r.track_id)
            if (trackIds.length === 0) {
                recentTracks.value = []
            } else {
                // 2) fetch full track rows (with authors) from view tracks_with_authors
                // use detailsController so this can be canceled separately
                const { data: detailedTracks, error: detailsErr } = await supabase
                    .from('tracks_with_authors')
                    .select('*')
                    .in('id', trackIds)
                    .abortSignal(detailsController.signal)

                if (detailsErr) throw detailsErr

                // Map track id -> row for preserving order
                const mapById = new Map<string, any>()
                ;(detailedTracks ?? []).forEach((t: any) => mapById.set(t.id, t))

                recentTracks.value = recentRows.map(r => ({
                    track: mapById.get(r.track_id) ?? { id: r.track_id },
                    last_played: r.last_played,
                    play_count: r.play_count,
                    authors: (mapById.get(r.track_id)?.authors) ?? []
                }))
            }

            // 3) get recent authors (RPC)
            const rpcAuthors = await supabase
                .rpc('get_user_recent_authors', { p_user_id: user.value.id, p_limit: authorsLimit })
                .abortSignal(authorsController.signal)

            if (rpcAuthors.error) throw rpcAuthors.error
            recentAuthors.value = (rpcAuthors.data ?? []) as AuthorUI[]

            // 4) get recent playlists (RPC) and fetch playlist details
            const rpcPlaylists = await supabase
                .rpc('get_user_recent_playlists', { p_user_id: user.value.id, p_limit: playlistsLimit })
                .abortSignal(playlistsController.signal)

            if (rpcPlaylists.error) throw rpcPlaylists.error
            const playlistRows = (rpcPlaylists.data ?? []) as Array<{ playlist_id: string; last_played: string; plays: number }>

            if (playlistRows.length === 0) {
                recentPlaylists.value = []
            } else {
                const playlistIds = playlistRows.map(p => p.playlist_id)
                const { data: playlistsDetails, error: plErr } = await supabase
                    .from('playlists')
                    .select('*, user_id')
                    .in('id', playlistIds)
                    .abortSignal(detailsController.signal)

                if (plErr) throw plErr
                const plMap = new Map<string, Playlist>()
                ;(playlistsDetails ?? []).forEach((p: any) => plMap.set(p.id, p))

                recentPlaylists.value = playlistRows.map(p => ({
                    playlist: plMap.get(p.playlist_id) ?? { id: p.playlist_id },
                    last_played: p.last_played,
                    plays: p.plays
                }))
            }

            return {
                tracks: recentTracks.value,
                authors: recentAuthors.value,
                playlists: recentPlaylists.value
            }
        } catch (err: any) {
            if (isAbort(err)) {
                // canceled -> no error
                return null
            }
            console.error('useRecentActivity.loadAll error', err)
            error.value = String(err?.message ?? err)
            // fallback: clear or keep previous
            return null
        } finally {
            loading.value = false
            // do not auto-abort controllers here (they will be reused/cancelled next call)
        }
    }

    /** convenience methods */
    const reload = (opts?: { tracksLimit?: number; authorsLimit?: number; playlistsLimit?: number }) => loadAll(opts)
    const cancel = () => cancelAll()

    return {
        // state
        loading, error,
        recentTracks, recentAuthors, recentPlaylists,
        // actions
        loadAll, reload, cancel
    }
}