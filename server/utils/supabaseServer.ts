import { createServerClient } from '@supabase/ssr'
import { getCookie, setCookie } from 'h3'
import type { H3Event } from 'h3'

export const createSupabaseServerClient = (event: H3Event) => {
    const config = useRuntimeConfig()

    return createServerClient(
        config.supabaseUrl || config.public.supabaseUrl || process.env.NUXT_PUBLIC_SUPABASE_URL,
        config.supabaseKey || config.public.supabaseKey, config.public.SUPABASE_ANON_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name: string) {
                    return getCookie(event, name)
                },

                set(name: string, value: string, options: any) {
                    setCookie(event, name, value, options)
                },

                remove(name: string, options: any) {
                    setCookie(event, name, '', {
                        ...options,
                        maxAge: 0,
                    })
                },
            },
        }
    )
}