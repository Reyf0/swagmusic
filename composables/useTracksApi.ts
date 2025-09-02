import { ref } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/global'

// Типы на основе database.types.ts
type TrackRow = Database['public']['Tables']['tracks']['Row']
type TracksViewRow = {
    // представление tracks_with_authors — содержит поля из tracks плюс authors jsonb
    // оставляем свободную типизацию для authors (json)
} & Partial<TrackRow> & { authors?: any[]; created_at?: string }

export const useTracksApi = () => {
    const supabase: SupabaseClient<Database> = useSupabaseClient()
    const lastError = ref<Error | null>(null)

    // Отдельные AbortController'ы для разных типов запросов
    let searchController: AbortController | null = null
    let autocompleteController: AbortController | null = null
    let feedController: AbortController | null = null
    let trackController: AbortController | null = null

    // Утилита для безопасного распознавания Abort
    function isAbort(err: any) {
        return err && (err.name === 'AbortError' || err.message === 'The user aborted a request.' || /aborted/i.test(String(err?.message ?? '')))
    }

    /**
     * Search tracks using RPC get_tracks_search
     * options:
     *  - q: string | null
     *  - language: 'russian' | 'english' | null
     *  - genreIds: string[] | null
     *  - limit: number
     *  - offset: number
     */
    async function searchTracks(options: {
        q?: string | null
        language?: string | null
        genreIds?: string[] | null
        limit?: number
        offset?: number
    } = {}): Promise<TrackViewRow[]> {
        // abort previous
        if (searchController) {
            try { searchController.abort() } catch (_) {}
            searchController = null
        }
        searchController = new AbortController()
        lastError.value = null

        const { q = null, language = null, genreIds = null, limit = 20, offset = 0 } = options

        try {
            // supabase.rpc(..., { signal: searchController.signal }) — если ваша версия клиента поддерживает signal
            // Если не поддерживает, запрос всё равно будет выполнен, но мы ловим Abort через внешний fetch (см. комментарий ниже).
            const rpcBuilder = supabase.rpc('get_tracks_search', {
                p_q: q,
                p_language: language,
                p_genre_ids: genreIds,
                p_limit: limit,
                p_offset: offset
            })
            // attach signal then execute
            const { data, error } = await rpcBuilder.abortSignal(searchController.signal)
            if (error) throw error
            return (data ?? []) as TracksViewRow[]
        } catch (err: any) {
            if (isAbort(err)) {
                // запрос был отменён — не считаем это ошибкой
                return []
            }
            lastError.value = err
            console.error('useTracksApi.searchTracks error', err)
            return []
        } finally {
            // очистим controller если текущий - наш
            if (searchController) {
                try { searchController = null } catch (_) {}
            }
        }
    }

    /**
     * Autocomplete for titles (RPC autocomplete_tracks)
     * returns array of { id, title, score }
     */
    async function autocomplete(q: string, limit = 8) {
        // abort previous
        if (autocompleteController) {
            try { autocompleteController.abort() } catch (_) {}
            autocompleteController = null
        }
        autocompleteController = new AbortController()
        lastError.value = null

        if (!q || q.trim().length === 0) return []

        try {
            const rpcBuilder = supabase.rpc('autocomplete_tracks', { p_q: q, p_limit: limit })
            const { data, error } = await rpcBuilder.abortSignal(autocompleteController.signal)
            if (error) throw error
            return (data ?? []) as Array<{ id: string; title: string; score: number }>
        } catch (err: any) {
            if (isAbort(err)) return []
            lastError.value = err
            console.error('useTracksApi.autocomplete error', err)
            return []
        } finally {
            if (autocompleteController) {
                try { autocompleteController = null } catch (_) {}
            }
        }
    }

    /**
     * Keyset feed (get_tracks_feed)
     * afterCreatedAt: ISO string or null
     * afterId: uuid or null
     */
    async function getFeed(params: { limit?: number; afterCreatedAt?: string | null; afterId?: string | null } = {}) {
        if (feedController) {
            try { feedController.abort() } catch (_) {}
            feedController = null
        }
        feedController = new AbortController()
        lastError.value = null

        const { limit = 20, afterCreatedAt = null, afterId = null } = params
        try {
            const rpcBuilder = supabase.rpc('get_tracks_feed', {
                p_limit: limit,
                p_after_created_at: afterCreatedAt,
                p_after_id: afterId
            })
            const { data, error } = await rpcBuilder.abortSignal(feedController.signal)
            if (error) throw error
            return (data ?? []) as Array<any>
        } catch (err: any) {
            if (isAbort(err)) return []
            lastError.value = err
            console.error('useTracksApi.getFeed error', err)
            return []
        } finally {
            if (feedController) {
                try { feedController = null } catch (_) {}
            }
        }
    }

    /**
     * Get single track with authors (from view)
     */
    async function getTrackById(id: string) {
        if (trackController) {
            try { trackController.abort() } catch (_) {}
            trackController = null
        }
        trackController = new AbortController()
        lastError.value = null

        try {
            // for .from().select() supabase-js may accept { signal } option similarly
            const builder = supabase.from('tracks_with_authors').select('*').eq('id', id).limit(1).single()
            const { data, error } = await builder.abortSignal(trackController.signal)
            if (error) throw error
            return data as TracksViewRow
        } catch (err: any) {
            if (isAbort(err)) return null
            lastError.value = err
            console.error('useTracksApi.getTrackById error', err)
            return null
        } finally {
            if (trackController) {
                try { trackController = null } catch (_) {}
            }
        }
    }

    /**
     * Optional: cancel all pending requests (useful on component unmount)
     */
    function cancelSearch() {
        try { if (searchController) searchController.abort() } catch (_) {}
        searchController = null
    }
    function cancelAutocomplete() {
        try { if (autocompleteController) autocompleteController.abort() } catch (_) {}
        autocompleteController = null
    }
    function cancelFeed() {
        try { if (feedController) feedController.abort() } catch (_) {}
        feedController = null
    }
    function cancelTrack() {
        try { if (trackController) trackController.abort() } catch (_) {}
        trackController = null
    }
    function cancelAll() {
        cancelSearch()
        cancelAutocomplete()
        cancelFeed()
        cancelTrack()
    }

    return {
        searchTracks,
        autocomplete,
        getFeed,
        getTrackById,
        cancelSearch,
        cancelAutocomplete,
        cancelFeed,
        cancelTrack,
        cancelAll,
        lastError
    }
}
