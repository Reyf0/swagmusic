import { createClient, SupabaseClient } from '@supabase/supabase-js'

const config = useRuntimeConfig()
const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || config.public.SUPABASE_URL
const SUPABASE_KEY = config.supabaseServiceRoleKey || config.supabase.serviceKey!
// TODO use createServerClient
declare global {
    // allow reusing the client across hot reloads in dev
    // eslint-disable-next-line no-var
    var __swagmusic_supabase: SupabaseClient | undefined
}

const getSupabase = (): SupabaseClient => {
    if (globalThis.__swagmusic_supabase) return globalThis.__swagmusic_supabase
    const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
    })
    globalThis.__swagmusic_supabase = client
    return client
}

export default getSupabase()