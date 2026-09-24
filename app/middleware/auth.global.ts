// Pages anyone can open. Everything else requires a signed-in user.
const PUBLIC_EXACT = ['/', '/tracks', '/search', '/login', '/register', '/confirm', '/reset-password', '/albums']
const PUBLIC_PREFIXES = ['/playlist/', '/authors/', '/albums/']
const GUEST_ONLY = ['/login', '/register']

export default defineNuxtRouteMiddleware((to) => {
    const user = useSupabaseUser()

    const isPublic = PUBLIC_EXACT.includes(to.path) || PUBLIC_PREFIXES.some(prefix => to.path.startsWith(prefix))

    if (!user.value && !isPublic) {
        return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
    }

    if (user.value && GUEST_ONLY.includes(to.path)) {
        return navigateTo('/')
    }
})
