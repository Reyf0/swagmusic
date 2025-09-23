import { watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'

export default defineNuxtPlugin(() => {
    const store = useSettingsStore()
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()

    // предыдущая инициализация (как было)
    store.readLocalDirtyFromStorage?.()
    store.initFromLocal()
    store.applyDefaults()

    if (!store.localThemeDirty) {
        store.applySavedTheme()
    }

    watch(user, (u) => {
        store.fetchFromSupabase(u?.value ?? null, supabase).then(() => {
            if (!store.localThemeDirty) {
                store.applySavedTheme()
            } else {
                store.previewTheme(store.settings.theme)
            }
        })
    }, { immediate: true })

    watch(() => store.settings.theme, (t) => {
        if (!store.localThemeDirty) store.applySavedTheme()
    })

    // ===== NEW: subscribe to useColorMode changes and sync to store =====
    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const colorMode = typeof useColorMode !== 'undefined' ? useColorMode?.() : null
        if (colorMode) {
            // watch composable value / preference
            watch(
                () => (colorMode.preference ?? colorMode.value),
                (newVal, oldVal) => {
                    // если ничего не поменялось - skip
                    if (newVal === oldVal) return

                    // translate possible null => 'system'
                    const normalized = (!newVal || newVal === 'null') ? 'system' : newVal

                    // пометим, что пользователь сменил тему локально
                    store.markLocalThemeDirty?.()

                    // ОБНОВИМ store.settings.theme, чтобы другие страницы, зависящие от стора,
                    // увидели изменение немедленно
                    // (делаем минимальный merge, чтобы не терять другие настройки)
                    store.settings = { ...store.settings, theme: normalized }

                    // Не вызываем store.applySavedTheme() здесь - colorMode уже управляет визуалом.
                    // Мы просто синхронизируем store с текущим состоянием colorMode.
                },
                { immediate: false }
            )
        }
    } catch (e) {
        // noop - если useColorMode недоступен, ничего не делаем
    }
})