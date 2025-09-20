import { useSettingsStore } from '@/stores/settings'
import { watch } from 'vue'

export default defineNuxtPlugin(() => {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    const settings = useSettingsStore()

    // сначала применяем локальные настройки чтобы избежать FOUC
    settings.initFromLocal()
    applyTheme(settings.settings.theme)

    // при смене пользователя — подтянуть настройки
    watch(user, (u) => {
        settings.fetchFromSupabase(u?.value ?? null, supabase)
            .then(() => applyTheme(settings.settings.theme))
    }, { immediate: true })

    // когда локальные настройки меняются — немедленно применяем тему
    watch(() => settings.settings.theme, (t) => applyTheme(t))

    function applyTheme(theme: 'light'|'dark'|'system') {
        if (typeof document === 'undefined') return
        if (theme === 'system') {
            document.documentElement.removeAttribute('data-theme')
        } else {
            document.documentElement.setAttribute('data-theme', theme)
        }
    }
})
