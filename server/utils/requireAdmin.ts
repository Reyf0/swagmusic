import type { User } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// h3's own H3Event type would come from the hoisted h3 v2; take Nitro's (v1) from its helpers instead.
type H3Event = Parameters<typeof getHeader>[0]

/** The signed-in user of the request: from `Authorization: Bearer <jwt>` or the session cookies. */
export async function getRequestUser(event: H3Event): Promise<User | null> {
    const token = getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '')
    if (token) {
        const { data } = await useSupabaseAdmin().auth.getUser(token)
        return data.user ?? null
    }

    const { supabaseUrl, supabaseKey } = useRuntimeConfig().public
    const client = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll: () => Object.entries(parseCookies(event)).map(([name, value]) => ({ name, value })),
            setAll: () => { /* read-only here */ },
        },
    })
    const { data } = await client.auth.getUser()
    return data.user ?? null
}

/** Throws 401/403 unless the caller is signed in and their profile has is_admin = true. */
export async function requireAdmin(event: H3Event): Promise<User> {
    const user = await getRequestUser(event)
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
    }

    const { data: profile, error } = await useSupabaseAdmin()
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (error || !profile?.is_admin) {
        throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    return user
}
