import type { SupabaseClient } from '@supabase/supabase-js'
import { slugify, randomDigits, isUniqueViolation } from './slug'

export async function createProfileWithUniqueSlug(
    supabase: SupabaseClient,
    payload: {
        id?: string // если есть
        username?: string | null
        full_name?: string | null
        avatar_url?: string | null
        // ... другие поля
    },
    maxAttempts = 8
) {
    const source = payload.username || payload.full_name || 'user'
    const base = slugify(source, 30)

    // пытаемся сначала base, затем base-<4digits>, base-<4digits2>, ...
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidate = attempt === 0 ? base : `${base}-${randomDigits(4)}`
        try {
            const { data, error } = await supabase
                .from('profiles')
                .insert({ ...payload, slug: candidate })
                .select()
                .single()
            if (error) {
                if (isUniqueViolation(error)) {
                    // conflict, пробуем след. кандидат
                    continue
                }
                throw error
            }
            return data // успешно создан профиль
        } catch (err) {
            if (isUniqueViolation(err)) {
                continue
            }
            throw err
        }
    }
    throw new Error('Не удалось сгенерировать уникальный slug для профиля после нескольких попыток')
}
