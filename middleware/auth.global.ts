// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser();

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/', '/tracks'];

  // Only redirect if:
  // 1. User is not authenticated
  // 2. Route is not a public route
  // 3. Route is not already /login (prevents the loop)
  if (!user.value && !publicRoutes.includes(to.path) && to.path !== '/login') {
    return navigateTo('/login');
  }
});
