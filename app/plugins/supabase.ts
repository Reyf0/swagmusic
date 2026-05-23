import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export default defineNuxtPlugin( () => {
    const config = useRuntimeConfig()
    console.log("supabase.ts \n", process.env.NUXT_PUBLIC_SUPABASE_URL, config.public.supabaseUrl, process.env.SUPABASE_URL, )
    const supabase = createClient<Database>(
         config.public.supabaseUrl || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL,
        config.public.supabaseKey || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        }
    )

    return {
        provide: {
            supabase,
        },
    }
})