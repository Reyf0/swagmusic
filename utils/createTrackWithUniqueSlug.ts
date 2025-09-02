import type { SupabaseClient } from '@supabase/supabase-js'
import { slugify, isUniqueViolation } from './slug'

export async function createTrackWithUniqueSlug(
    supabase: SupabaseClient,
    payload: {
        title: string
        audio_url?: string
        cover_url?: string
        duration_seconds?: number
        // любые остальные поля, но обязательно user_id (обычно Supabase сам добавит)
        user_id?: string | null
        // ничего не указываем для slug
    },
    maxAttempts = 20
) {
    const title = payload.title ?? 'track'
    const base = slugify(title, 60)

    // attempt 0: base, 1..n: base-1, base-2 ...
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidate = attempt === 0 ? base : `${base}-${attempt}`
        try {
            const { data, error } = await supabase
                .from('tracks')
                .insert({ ...payload, slug: candidate })
                .select()
                .single()
            if (error) {
                if (isUniqueViolation(error)) {
                    // conflict, пробуем следующий candidate
                    continue
                }
                throw error
            }
            return data // успешно создан трек
        } catch (err) {
            if (isUniqueViolation(err)) {
                continue
            }
            throw err
        }
    }
    // fallback: generate with random suffix
    for (let i = 0; i < 5; i++) {
        const candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`
        try {
            const { data, error } = await supabase
                .from('tracks')
                .insert({ ...payload, slug: candidate })
                .select()
                .single()
            if (!error) return data
            if (!isUniqueViolation(error)) throw error
        } catch (err) {
            if (!isUniqueViolation(err)) throw err
        }
    }
    throw new Error('Не удалось создать трек с уникальным slug после множества попыток')
}
