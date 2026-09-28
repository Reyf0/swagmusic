import type { Track } from '#shared/types'

type Kind = 'search' | 'feed' | 'recent' | 'popular'

function isAbort(err: any) {
    return err?.name === 'AbortError' || /aborted/i.test(String(err?.message ?? ''))
}

/**
 * Track queries. Every function returns normalized `Track`s (with `authors`).
 * A new call of the same kind aborts the previous in-flight request.
 */
export const useTracksApi = () => {
    const supabase = useSupabase()
    const lastError = ref<Error | null>(null)
    const controllers: Partial<Record<Kind, AbortController>> = {}

    function nextSignal(kind: Kind) {
        controllers[kind]?.abort()
        const c = new AbortController()
        controllers[kind] = c
        return c.signal
    }

    async function run<T>(kind: Kind, fn: (signal: AbortSignal) => PromiseLike<{ data: any; error: any }>, map: (data: any) => T, empty: T): Promise<T> {
        lastError.value = null
        try {
            const { data, error } = await fn(nextSignal(kind))
            if (error) throw error
            return map(data)
        } catch (err: any) {
            if (isAbort(err)) return empty
            lastError.value = err
            console.error(`useTracksApi.${kind} error`, err)
            return empty
        }
    }

    /** Full-text search (RPC get_tracks_search). */
    function searchTracks(options: { q?: string | null; language?: string | null; genreIds?: string[] | null; limit?: number; offset?: number } = {}) {
        const { q = null, language = null, genreIds = null, limit = 20, offset = 0 } = options
        return run('search', signal => supabase
            .rpc('get_tracks_search', { p_q: q ?? undefined, p_language: language ?? undefined, p_genre_ids: genreIds ?? undefined, p_limit: limit, p_offset: offset })
            .abortSignal(signal), toTracks, [] as Track[])
    }

    /** Ids of tracks whose title starts with / closely resembles `q` (RPC autocomplete_tracks). */
    async function autocompleteTrackIds(q: string, limit = 10): Promise<string[]> {
        if (!q.trim()) return []
        const { data, error } = await supabase.rpc('autocomplete_tracks', { p_q: q, p_limit: limit })
        if (error) {
            console.warn('useTracksApi.autocompleteTrackIds error', error.message)
            return []
        }
        return (data ?? []).map(t => t.id)
    }

    /** Newest tracks, keyset-paginated by (created_at, id). */
    function getFeed(params: { limit?: number; afterCreatedAt?: string | null; afterId?: string | null } = {}) {
        const { limit = 20, afterCreatedAt = null, afterId = null } = params
        return run('feed', (signal) => {
            let query = supabase
                .from('tracks_with_authors')
                .select('*')
                .order('created_at', { ascending: false })
                .order('id', { ascending: false })
                .limit(limit)
            if (afterCreatedAt && afterId) {
                query = query.or(`created_at.lt."${afterCreatedAt}",and(created_at.eq."${afterCreatedAt}",id.lt.${afterId})`)
            }
            return query.abortSignal(signal)
        }, toTracks, [] as Track[])
    }

    /** Tracks by id, returned in the order of `ids`. */
    async function getTracksByIds(ids: string[]) {
        if (!ids.length) return []
        const { data, error } = await supabase.from('tracks_with_authors').select('*').in('id', ids)
        if (error) {
            lastError.value = error as any
            console.error('useTracksApi.getTracksByIds error', error)
            return []
        }
        const byId = new Map(toTracks(data).map(t => [t.id, t]))
        return ids.map(id => byId.get(id)).filter((t): t is Track => !!t)
    }

    /** Most played tracks (RPC get_popular_tracks). */
    async function getPopular(limit = 10) {
        const ids = await run('popular', signal => supabase
            .rpc('get_popular_tracks', { p_limit: limit })
            .abortSignal(signal), (data: { track_id: string }[]) => (data ?? []).map(r => r.track_id), [] as string[])
        return getTracksByIds(ids)
    }

    /** Recently played by the user (RPC get_user_recent_tracks_full), newest first. */
    function getRecentTracksFull(params: { userId: string; limit?: number; after?: string | null }) {
        const { userId, limit = 50, after = null } = params
        return run('recent', signal => supabase
            .rpc('get_user_recent_tracks_full', { p_user_id: userId, p_limit: limit, p_after: after ?? undefined })
            .abortSignal(signal), (data: any[]) => (data ?? []).map(row => ({ ...toTrack(row), last_played: row.last_played as string })), [] as (Track & { last_played: string })[])
    }

    function cancel(kind: Kind) {
        controllers[kind]?.abort()
        controllers[kind] = undefined
    }

    function cancelAll() {
        for (const kind of Object.keys(controllers) as Kind[]) cancel(kind)
    }

    return { searchTracks, autocompleteTrackIds, getFeed, getTracksByIds, getPopular, getRecentTracksFull, cancel, cancelAll, lastError }
}
