import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from '@/types/database.types'
import { ref } from 'vue'

type LikeRow = Database['public']['Tables']['likes']['Row']
type LikeInsert = Database['public']['Tables']['likes']['Insert']

export type LikeTargetType = 'track' | 'playlist' | 'album'
export type LikeTarget = { id: string; type?: LikeTargetType }

export const useLikesApi = (supabaseClient?: SupabaseClient<Database>) => {
    const supabase: SupabaseClient<Database> = supabaseClient || useSupabaseClient()
    const user = useSupabaseUser()

    const lastError = ref<Error | null>(null)

    // abort controller for getLikes
    let getLikesController: AbortController | null = null
    
    const isAbort = (err: any) =>
        err && (err.name === 'AbortError' || /aborted/i.test(String(err?.message ?? '')))

    /**
     * Получение лайков для набора идентификаторов целей для текущего пользователя
     *
     * @param targetIds - массив идентификаторов целей (target_id)
     * @param targetType - тип цели (по умолчанию 'track')
     * @returns массив строк таблицы likes или null, если пользователь не авторизован или при ошибке
     */
    const getLikes = async (
        targetIds: string[],
        targetType: LikeTargetType = 'track'
    ): Promise<LikeRow[] | null> => {
        lastError.value = null

        if (!user.value || !user.value.id) {
            // not authenticated -> treat as no likes
            return null;
        }

        // Cancel previous getLikes if any
        try { getLikesController?.abort() } catch (_) {}
        getLikesController = new AbortController()

        try {
            // split into chunks to avoid very long IN lists
            const CHUNK = 200
            const out: LikeRow[] = []
            for (let i = 0; i < targetIds.length; i += CHUNK) {
                const chunk = targetIds.slice(i, i + CHUNK)
                const builder = supabase
                    .from('likes')
                    .select('target_id')
                    .in('target_id', chunk)
                    .eq('target_type', targetType)
                    .eq('user_id', user.value.id)
                // attach abort signal (v2)
                const { data, error } = await builder.abortSignal(getLikesController.signal)
                if (error) {
                    if (isAbort(error)) {
                        return null
                    }
                    lastError.value = error
                    console.error('getLikes error', error)
                    return null
                }
                if (data && data.length) out.push(...(data as LikeRow[]))
            }
            return out
        } catch (err: any) {
            if (isAbort(err)) return null
            lastError.value = err
            console.error('getLikes unexpected error', err)
            return null
        } finally {
            getLikesController = null
        }
    }

    const cancelGetLikes = () => {
        try { getLikesController?.abort() } catch (_) {}
        getLikesController = null
    }

    /**
     * Добавление лайка для текущего пользователя
     *
     * @param target - объект с id и (опционально) type. Если type не указан — используется 'track'.
     * @returns Вставленную/обновлённую запись лайка (или null при неавторизованном пользователе/ошибке)
     */
    const addLike = async (
        target: LikeTarget
    ): Promise<LikeRow | null> => {
        lastError.value = null
        if (!user.value || !user.value.id) {
            console.warn('addLike: no authenticated user')
            return null;
        }

        const payload: LikeInsert = {
            target_id: target.id,
            target_type: (target.type ?? 'track') as LikeTargetType,
            user_id: user.value.id
        } as LikeInsert

        try {
            // upsert with returned representation
            const builder = supabase
                .from('likes')
                .upsert(payload, { onConflict: ['target_id', 'target_type', 'user_id'], returning: 'representation' })

            const { data, error } = await builder
            if (error) {
                lastError.value = error
                console.error('addLike error', error)
                return null
            }
            // data is array of inserted/updated rows (representation)
            if (Array.isArray(data) && data.length > 0) return data[0] as LikeRow
            return null
        } catch (err: any) {
            lastError.value = err
            console.error('addLike unexpected', err)
            return null
        }
    }
    /**
     * Удаление лайка для текущего пользователя
     *
     * @param target - объект с id и (опционально) type. Если type не указан — используется 'track'.
     * @returns true при успешном удалении, false при неавторизованном пользователе, или null при ошибке
     */
    const deleteLike = async (
        target: LikeTarget
    ): Promise<boolean | null> => {
        lastError.value = null
        if (!user.value || !user.value.id) {
            console.warn('deleteLike: no authenticated user')
            return null;
        }

        try {
            const builder = supabase
                .from('likes')
                .delete()
                .match({
                    target_id: target.id,
                    target_type: target.type ?? 'track',
                    user_id: user.value.id
                })
                .select() // возвращает удалённые строки
            const { data, error } = await builder
            if (error) {
                lastError.value = error
                console.error('deleteLike error', error)
                return null
            }
            // если удалено >=1 строк, success
            return Array.isArray(data) ? data.length > 0 : true
        } catch (err: any) {
            lastError.value = err
            console.error('deleteLike unexpected', err)
            return null
        }
    }


    return {
        getLikes,
        cancelGetLikes,
        addLike,
        deleteLike,
        lastError
    }
}