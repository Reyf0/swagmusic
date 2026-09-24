import { defineStore } from 'pinia'
import type { LikeTarget, LikeTargetType } from '@/composables/useLikesApi'

/**
 * Like state of the signed-in user (target id → liked). Components read `isLiked(id)`
 * and call `toggleLike`, which updates optimistically and rolls back on failure.
 */
export const useLikesStore = defineStore('likes', () => {
    const api = useLikesApi()
    const user = useSupabaseUser()
    const toast = useToast()

    const likes = ref<Record<string, boolean>>({})
    const pending = new Map<string, Promise<void>>()

    const isLiked = (id: string | null | undefined) => !!id && !!likes.value[id]

    async function fetchLikes(targetIds: string[], targetType: LikeTargetType = 'track') {
        const ids = [...new Set(targetIds.filter(Boolean))]
        if (!ids.length) return
        if (!user.value?.id) return

        const data = await api.getLikes(ids, targetType)
        const liked = new Set(data.map(r => r.target_id))
        const next = { ...likes.value }
        for (const id of ids) next[id] = liked.has(id)
        likes.value = next
    }

    function toggleLike(target: LikeTarget): Promise<void> {
        const id = target.id
        const inFlight = pending.get(id)
        if (inFlight) return inFlight

        if (!user.value) {
            toast.add({ title: 'Sign in to like tracks', color: 'warning' })
            return navigateTo({ path: '/login', query: { redirect: useRoute().fullPath } }).then(() => {})
        }

        const wasLiked = !!likes.value[id]
        likes.value = { ...likes.value, [id]: !wasLiked }

        const p = (wasLiked ? api.deleteLike(target) : api.addLike(target))
            .catch((err) => {
                likes.value = { ...likes.value, [id]: wasLiked }
                toast.add({ title: 'Could not update like', description: err?.message, color: 'error' })
            })
            .finally(() => pending.delete(id))

        pending.set(id, p)
        return p
    }

    function clear() {
        likes.value = {}
    }

    // Forget likes of the previous account on sign-out / account switch.
    watch(() => user.value?.id, () => clear())

    return { likes, isLiked, toggleLike, fetchLikes, clear, cancelFetchLikes: api.cancelGetLikes }
})
