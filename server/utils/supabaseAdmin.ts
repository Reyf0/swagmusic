import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

/**
 * Service-role Supabase client. Bypasses RLS — use only after the caller
 * has been authorized (see requireAdmin).
 */
export function useSupabaseAdmin(): SupabaseClient {
    if (client) return client

    const config = useRuntimeConfig()
    const url = config.supabaseUrl || config.public.supabaseUrl
    const key = config.supabaseServiceRoleKey || config.supabase?.serviceKey

    if (!url || !key) {
        throw createError({ statusCode: 500, statusMessage: 'Supabase admin client is not configured' })
    }

    client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
    return client
}
