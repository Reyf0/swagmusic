// Apply the signed-in user's saved preferences whenever their profile (re)loads.
export default defineNuxtPlugin(() => {
    const profileStore = useProfileStore()
    const settingsStore = useSettingsStore()

    watch(() => profileStore.profile?.id, () => {
        if (profileStore.profile) settingsStore.applyFromProfile(profileStore.profile.settings)
    }, { immediate: true })
})
