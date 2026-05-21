export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  const publicRoutes = [
    '/login',
    '/register',
    '/',
    '/tracks',
    '/search',
    '/auth/callback',
    '/auth/auth-code-error',
  ]

  if (!user.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }

  if (user.value && (to.path === '/login' || to.path === '/register')) {
    return navigateTo('/')
  }
})