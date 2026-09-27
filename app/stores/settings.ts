import { defineStore } from 'pinia'

export type ThemePreference = 'system' | 'light' | 'dark'

/**
 * User preferences. The colour mode module keeps the theme in localStorage;
 * for signed-in users it is also saved to `profiles.settings` so it follows
 * them to other devices (applied when the profile loads, see 10.settings.client.ts).
 */
export const useSettingsStore = defineStore('settings', () => {
    const supabase = useSupabase()
    const user = useSupabaseUser()
    const profileStore = useProfileStore()
    const colorMode = useColorMode()

    const theme = computed<ThemePreference>(() => (colorMode.preference as ThemePreference) || 'system')

    async function setTheme(value: ThemePreference) {
        colorMode.preference = value
        const uid = user.value?.id
        if (!uid) return

        const settings = { ...((profileStore.profile?.settings as Record<string, unknown> | null) ?? {}), theme: value }
        const { error } = await supabase.from('profiles').update({ settings }).eq('id', uid)
        if (error) {
            console.warn('Could not save theme', error.message)
            return
        }
        if (profileStore.profile) profileStore.setProfileLocally({ ...profileStore.profile, settings })
    }

    /** Applies preferences saved on the profile (called when the profile loads). */
    function applyFromProfile(settings: unknown) {
        const saved = (settings as { theme?: string } | null)?.theme
        if (saved === 'system' || saved === 'light' || saved === 'dark') colorMode.preference = saved
    }

    return { theme, setTheme, applyFromProfile }
})
