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
        if (!user.value || !user.value.id) {
            console.warn('getLikes: no authenticated user')
            return null;
        }

        const { data, error } = await supabase
            .from('likes')
            .select('target_id')
            .in('target_id', targetIds)
            .eq('target_type', targetType)
            .eq('user_id', user.value.id)

        if (error) {
            console.error('Error fetching likes: ', error);
            return null
        }
        return data as LikeRow[] | null;
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
        if (!user.value) {
            console.warn('addLike: no authenticated user')
            return null;
        }

        const payload: LikeInsert = {
            target_id: target.id,
            target_type: target.type ?? 'track',
            user_id: user.value.id
        } as unknown as LikeInsert

        const { data, error } = await supabase
            .from('likes')
            .upsert(payload, { onConflict: ['target_id', 'target_type', 'user_id'] })

        if (error) {
            console.error('Error adding like:', error);
            return null;
        }

        return (data && data.length > 0 ? (data[0] as LikeRow) : null)
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
        if (!user.value || !user.value.id) {
            console.warn('deleteLike: no authenticated user')
            return null;
        }

        const { error } = await supabase
            .from('likes')
            .delete()
            .match({
                target_id: target.id,
                target_type: target.type ?? 'track',
                user_id: user.value.id
            })
        if (error) {
            console.error('Error deleting like:', error);
            return null;
        }

        return true
    }


    return {
        addLike,
        deleteLike,
        getLikes
    }
}