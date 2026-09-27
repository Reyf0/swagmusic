import type { Like } from '#shared/types'

export type LikeTargetType = 'track' | 'playlist' | 'album'
export type LikeTarget = { id: string; type?: LikeTargetType }

const isAbort = (err: any) => err?.name === 'AbortError' || /aborted/i.test(String(err?.message ?? ''))

/** Likes of the signed-in user. Mutations throw on failure so callers can roll back. */
export const useLikesApi = () => {
    const supabase = useSupabase()
    const user = useSupabaseUser()

    let getLikesController: AbortController | null = null

    function requireUserId() {
        const id = user.value?.id
        if (!id) throw new Error('You need to sign in to like tracks')
        return id
    }

    /** Which of `targetIds` the current user liked. Returns [] for guests. */
    async function getLikes(targetIds: string[], targetType: LikeTargetType = 'track'): Promise<Pick<Like, 'target_id'>[]> {
        const userId = user.value?.id
        if (!userId || !targetIds.length) return []

        getLikesController?.abort()
        const controller = new AbortController()
        getLikesController = controller

        const { data, error } = await supabase
            .from('likes')
            .select('target_id')
            .in('target_id', targetIds)
            .eq('target_type', targetType)
            .eq('user_id', userId)
            .abortSignal(controller.signal)

        if (error) {
            if (!isAbort(error)) console.error('getLikes error', error)
            return []
        }
        return data ?? []
    }

    /** Liked target ids of the current user, newest first, with the like date. */
    async function getLikedIds(targetType: LikeTargetType = 'track') {
        const userId = user.value?.id
        if (!userId) return []
        const { data, error } = await supabase
            .from('likes')
            .select('target_id, created_at')
            .eq('user_id', userId)
            .eq('target_type', targetType)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data ?? []
    }

    function cancelGetLikes() {
        getLikesController?.abort()
        getLikesController = null
    }

    async function addLike(target: LikeTarget) {
        const { error } = await supabase
            .from('likes')
            .insert({ target_id: target.id, target_type: target.type ?? 'track', user_id: requireUserId() })
        // 23505 = already liked (unique violation) — that is the state we want
        if (error && error.code !== '23505') throw error
    }

    async function deleteLike(target: LikeTarget) {
        const { error } = await supabase
            .from('likes')
            .delete()
            .match({ target_id: target.id, target_type: target.type ?? 'track', user_id: requireUserId() })
        if (error) throw error
    }

    return { getLikes, getLikedIds, cancelGetLikes, addLike, deleteLike }
}
