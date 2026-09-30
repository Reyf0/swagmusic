// Pages anyone can open. Everything else requires a signed-in user.
const PUBLIC_EXACT = ['/', '/tracks', '/search', '/login', '/register', '/confirm', '/reset-password', '/albums', '/feedback']
const PUBLIC_PREFIXES = ['/playlist/', '/authors/', '/albums/', '/tracks/']
const GUEST_ONLY = ['/login', '/register']

// Pages that handle an auth `?code=` themselves.
const CODE_HANDLERS = ['/confirm', '/reset-password']

export default defineNuxtRouteMiddleware((to) => {
    // When the requested redirect URL is not allowed, Supabase falls back to the
    // Site URL, so the OAuth code (or error) can land on any page: finish sign-in on /confirm.
    if ((typeof to.query.code === 'string' || typeof to.query.error_description === 'string') && !CODE_HANDLERS.includes(to.path)) {
        return navigateTo({ path: '/confirm', query: to.query }, { replace: true })
    }

    const user = useSupabaseUser()

    const isPublic = PUBLIC_EXACT.includes(to.path) || PUBLIC_PREFIXES.some(prefix => to.path.startsWith(prefix))

    if (!user.value && !isPublic) {
        return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
    }

    if (user.value && GUEST_ONLY.includes(to.path)) {
        return navigateTo('/')
    }
})
