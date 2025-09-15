import { ref } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Playlist } from '@/types'

/**
 * usePlaylistsApi
 * - getRecentPlaylists: RPC get_user_recent_playlists(p_user_id, p_limit)
 * - getPlaylistsByIds: batched select by ids
 * - cancel* methods
 *
 * RPC returns rows: { playlist_id, last_played, plays }
 */

export type RecentPlaylistRow = {
    playlist_id: string
    last_played: string
    plays: number
}

export const usePlaylistsApi = () => {
    const supabase: SupabaseClient<Database> = useSupabaseClient()
    const lastError = ref<Error | null>(null)

    let recentPlaylistsController: AbortController | null = null
    let playlistsByIdsController: AbortController | null = null

    const isAbort = (err: any) =>
        err && (err.name === 'AbortError' || /aborted/i.test(String(err?.message ?? '')))

    async function getRecentPlaylists(params: { userId: string; limit?: number }) {
        const { userId, limit = 10 } = params
        if (!userId) return []

        if (recentPlaylistsController) { try { recentPlaylistsController.abort() } catch (_) {} recentPlaylistsController = null }
        recentPlaylistsController = new AbortController()
        lastError.value = null

        try {
            const builder = supabase.rpc('get_user_recent_playlists', { p_user_id: userId, p_limit: limit })
            const { data, error } = await builder.abortSignal(recentPlaylistsController.signal)
            if (error) throw error
            return (data ?? []) as RecentPlaylistRow[]
        } catch (err: any) {
            if (isAbort(err)) return []
            lastError.value = err
            console.error('usePlaylistsApi.getRecentPlaylists error', err)
            return []
        } finally {
            recentPlaylistsController = null
        }
    }

    async function getPlaylistsByIds(ids: string[]) {
        if (!ids || ids.length === 0) return []
        if (playlistsByIdsController) { try { playlistsByIdsController.abort() } catch (_) {} playlistsByIdsController = null }
        playlistsByIdsController = new AbortController()
        lastError.value = null

        try {
            const builder = supabase.from('playlists').select('*').in('id', ids)
            const { data, error } = await builder.abortSignal(playlistsByIdsController.signal)
            if (error) throw error
            return (data ?? []) as Playlist[]
        } catch (err: any) {
            if (isAbort(err)) return []
            lastError.value = err
            console.error('usePlaylistsApi.getPlaylistsByIds error', err)
            return []
        } finally {
            playlistsByIdsController = null
        }
    }

    function cancelRecentPlaylists() { try { recentPlaylistsController?.abort() } catch (_) {} recentPlaylistsController = null }
    function cancelPlaylistsByIds() { try { playlistsByIdsController?.abort() } catch (_) {} playlistsByIdsController = null }

    return {
        getRecentPlaylists,
        getPlaylistsByIds,
        cancelRecentPlaylists,
        cancelPlaylistsByIds,
        lastError
    }
}
