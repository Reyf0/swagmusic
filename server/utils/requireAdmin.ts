import type { H3Event } from 'h3'
import type { User } from '@supabase/supabase-js'

/**
 * Resolves the caller from the `Authorization: Bearer <access_token>` header
 * and throws 401/403 unless the caller's profile has is_admin = true.
 */
export async function requireAdmin(event: H3Event): Promise<User> {
    const token = getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) {
        throw createError({ statusCode: 401, statusMessage: 'Missing authorization header' })
    }

    const supabase = useSupabaseAdmin()

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
        throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .single()

    if (profileError || !profile?.is_admin) {
        throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    return data.user
}
