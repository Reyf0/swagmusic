import { ref } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, AuthorUI } from '@/types'

/**
 * useAuthorsApi
 * - getRecentAuthors: RPC get_user_recent_authors(p_user_id, p_limit)
 * - getAuthorsByIds: batched select by ids
 * - cancel* methods
 *
 * Возвращаемые структуры:
 *  { author_id, name, avatar_url, last_played, plays }
 */

export type AuthorRecentRow = {
    author_id: string
    name: string | null
    avatar_url: string | null
    last_played: string
    plays: number
}

export const useAuthorsApi = () => {
    const supabase: SupabaseClient<Database> = useSupabaseClient()
    const lastError = ref<Error | null>(null)

    // Controllers
    let recentAuthorsController: AbortController | null = null
    let authorsByIdsController: AbortController | null = null

    const isAbort = (err: any) =>
        err && (err.name === 'AbortError' || /aborted/i.test(String(err?.message ?? '')))

    /**
     * RPC get_user_recent_authors
     */
    async function getRecentAuthors(params: { userId: string; limit?: number }) {
        const { userId, limit = 10 } = params
        if (!userId) return []

        // cancel previous
        if (recentAuthorsController) { try { recentAuthorsController.abort() } catch (_) {} recentAuthorsController = null }
        recentAuthorsController = new AbortController()
        lastError.value = null

        try {
            const builder = supabase.rpc('get_user_recent_authors', { p_user_id: userId, p_limit: limit })
            const { data, error } = await builder.abortSignal(recentAuthorsController.signal)
            if (error) throw error
            return (data ?? []) as AuthorRecentRow[]
        } catch (err: any) {
            if (isAbort(err)) return []
            lastError.value = err
            console.error('useAuthorsApi.getRecentAuthors error', err)
            return []
        } finally {
            recentAuthorsController = null
        }
    }

    /**
     * Batched SELECT authors by ids
     */
    async function getAuthorsByIds(ids: string[]) {
        if (!ids || ids.length === 0) return []
        if (authorsByIdsController) { try { authorsByIdsController.abort() } catch (_) {} authorsByIdsController = null }
        authorsByIdsController = new AbortController()
        lastError.value = null

        try {
            const builder = supabase.from('authors').select('*').in('id', ids)
            const { data, error } = await builder.abortSignal(authorsByIdsController.signal)
            if (error) throw error
            return (data ?? []) as AuthorUI[]
        } catch (err: any) {
            if (isAbort(err)) return []
            lastError.value = err
            console.error('useAuthorsApi.getAuthorsByIds error', err)
            return []
        } finally {
            authorsByIdsController = null
        }
    }

    function cancelRecentAuthors() { try { recentAuthorsController?.abort() } catch (_) {} recentAuthorsController = null }
    function cancelAuthorsByIds() { try { authorsByIdsController?.abort() } catch (_) {} authorsByIdsController = null }

    return {
        getRecentAuthors,
        getAuthorsByIds,
        cancelRecentAuthors,
        cancelAuthorsByIds,
        lastError
    }
}
