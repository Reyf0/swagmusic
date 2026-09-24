import type { SupabaseClient, Session, User } from '@supabase/supabase-js'
import type { Database } from '#shared/types'

export const useSupabase = () => {
    const { $supabase } = useNuxtApp()

    if (!$supabase) {
        throw new Error('Supabase client is not provided. Check your plugin.')
    }

    return $supabase as SupabaseClient<Database>
}

export const useSupabaseUser = () => {
    return useState<User | null>('supabase-user', () => null)
}

export const useSupabaseSession = () => {
    return useState<Session | null>('supabase-session', () => null)
}