import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LikeTarget, LikeTargetType } from '@/composables/useLikesApi'
import { useLikesApi } from '@/composables/useLikesApi'

type PendingMap = Record<string, Promise<any> | null>

const chunkArray = <T>(arr: T[], size = 200): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
}


export const useLikesStore = defineStore('likes', () => {
    const api = useLikesApi()
    const user = useSupabaseUser()

    const likes = ref<Record<string, boolean>>({}) // локальный кэш (id → liked)
    const pending = ref<PendingMap>({}) // карта текущих запросов (id → Promise)
    let playerStore: any = null

    const attachPlayerStore = (store: any) => { playerStore = store}

    const _syncToPlayerIfNeeded = (id: string, liked: boolean) => {
        if (!playerStore) return
        const ct = playerStore.currentTrack?.value ?? playerStore.currentTrack
        if (ct && ct.id === id) {
            // аккуратно: обновляем через action/метод player-store, если есть
            if (typeof playerStore.setCurrentTrack === 'function') {
                playerStore.setCurrentTrack({ ...ct.value ?? ct, is_liked_by_user: liked })
            } else {
                // fallback
                playerStore.currentTrack = { ...(ct.value ?? ct), is_liked_by_user: liked }
            }
        }
    }

    const isLiked = (id: string) => { return !!likes.value[id] }

    const fetchLikes = async (targetIds: string[], targetType: LikeTargetType = 'track') => {
        if (!user.value?.id) {
            targetIds.forEach(id => (likes.value[id] = false))
            return
        }

        const unique = Array.from(new Set(targetIds))
        const chunks = chunkArray(unique, 200)
        for (const chunk of chunks) {
            const data = await api.getLikes(chunk, targetType)
            // set default false for chunk
            chunk.forEach(id => { if (likes.value[id] === undefined) likes.value[id] = false })
            data?.forEach(r => { likes.value[r.target_id] = true })
        }
    }

    const _addLike = async (target: LikeTarget) => {
        const row = await api.addLike(target)
        likes.value = { ...likes.value, [target.id]: true }
        _syncToPlayerIfNeeded(target.id, true)
        return row
    }
    const _deleteLike = async (target: LikeTarget) => {
        await api.deleteLike(target)
        likes.value = { ...likes.value, [target.id]: false }
        _syncToPlayerIfNeeded(target.id, false)
        return true
    }

    const toggleLike = async (target: LikeTarget) => {
      const id = target.id
        if (pending.value[id]) return pending.value[id]

        const currently = !!likes.value[id]
        likes.value = { ...likes.value, [id]: !currently }
        _syncToPlayerIfNeeded(id, !currently)

        const p = (async () => {
            try {
                if (currently) {
                    await _deleteLike(target)
                } else {
                    await _addLike(target)
                }
            } catch (err) {
                // rollback
                likes.value = { ...likes.value, [id]: currently }
                _syncToPlayerIfNeeded(id, currently)
                throw err
            } finally {
                pending.value = { ...pending.value, [id]: null}
            }
        })()

        pending.value = { ...pending.value, [id]: p }
        return p
    }

    // refresh single id from a server (useful for realtime events)
    const refreshLike = async (id: string, type: LikeTargetType = 'track') => {
        if (!user.value?.id) { likes.value[id] = false; return }
        const data = await api.getLikes([id], type)
        likes.value = { ...likes.value, [id]: (data && data.length > 0) }
        _syncToPlayerIfNeeded(id, likes.value[id])
    }

    return {
        likes, pending,
        attachPlayerStore,
        isLiked, fetchLikes, toggleLike, refreshLike
    }
})