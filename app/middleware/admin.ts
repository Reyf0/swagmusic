export default defineNuxtRouteMiddleware(async () => {
    const user = useSupabaseUser()
    if (!user.value) return navigateTo('/login')

    const profileStore = useProfileStore()
    if (profileStore.profile?.id !== user.value.id) await profileStore.loadProfile(user.value.id)

    if (!profileStore.isAdmin) {
        useToast().add({
            title: 'Access denied',
            description: 'You do not have permission to access the admin area',
            color: 'error',
        })
        return navigateTo('/')
    }
})
