import { createBrowserClient, createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { Database } from '#shared/types'

/**
 * Supabase client with a cookie-based session, so the signed-in user is known
 * during SSR as well (route middleware, first render) and not only in the browser.
 */
export default defineNuxtPlugin(async (nuxtApp) => {
    const { supabaseUrl, supabaseKey } = useRuntimeConfig().public
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase is not configured: set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_KEY')
    }

    const user = useSupabaseUser()
    const session = useSupabaseSession()

    if (import.meta.server) {
        // Nuxt's own cookie helpers (no direct h3 dependency).
        const cookies = parseCookieHeader(useRequestHeaders(['cookie']).cookie ?? '')
            .map(({ name, value }) => ({ name, value: value ?? '' }))

        const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
            cookies: {
                getAll: () => cookies,
                // Called after an await when an expired session is refreshed, i.e. outside the
                // Nuxt context, so restore it for useCookie().
                setAll: toSet => nuxtApp.runWithContext(() => {
                    for (const { name, value, options } of toSet) {
                        const cookie = useCookie(name, { ...options, encode: (v: string) => v, decode: (v: string) => v } as any)
                        cookie.value = value
                    }
                }),
            },
        })
        nuxtApp.provide('supabase', supabase)

        // Only hit the auth server when an auth cookie is present.
        const hasAuthCookie = cookies.some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'))
        if (hasAuthCookie) {
            const { data } = await supabase.auth.getUser()
            user.value = data.user ?? null
        } else {
            user.value = null
        }
    } else {
        const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey)
        nuxtApp.provide('supabase', supabase)

        const { data } = await supabase.auth.getSession()
        session.value = data.session
        user.value = data.session?.user ?? null

        supabase.auth.onAuthStateChange((_event, newSession) => {
            session.value = newSession
            const newUser = newSession?.user ?? null
            // Keep the same object when only the token was refreshed, to avoid needless re-renders.
            if (newUser?.id !== user.value?.id || _event === 'USER_UPDATED') user.value = newUser
        })
    }

    await useProfileStore(nuxtApp.$pinia as any).init()
})
