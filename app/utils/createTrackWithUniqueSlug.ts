import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TablesInsert } from '#shared/types'
import { slugify, isUniqueViolation } from './slug'

/**
 * Inserts a track with a slug derived from its title ("my-song", "my-song-2", …),
 * retrying with a new suffix if the slug is already taken. Returns the new row id.
 */
export async function createTrackWithUniqueSlug(
    supabase: SupabaseClient<Database>,
    payload: Omit<TablesInsert<'tracks'>, 'slug'>,
    maxAttempts = 10
): Promise<{ id: string }> {
    const base = slugify(payload.title, 60)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
        const { data, error } = await supabase.from('tracks').insert({ ...payload, slug }).select('id').single()
        if (!error) return data
        if (!isUniqueViolation(error)) throw error
    }

    const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`
    const { data, error } = await supabase.from('tracks').insert({ ...payload, slug }).select('id').single()
    if (error) throw error
    return data
}
