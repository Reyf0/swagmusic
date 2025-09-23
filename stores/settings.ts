import { defineStore } from 'pinia'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export type AppSettings = {
    theme: 'light' | 'dark' | 'system'
    locale: string
    notifications: { email: boolean; push: boolean }
    [k: string]: any
}

const DEFAULTS: AppSettings = {
    theme: 'system',
    locale: 'ru',
    notifications: { email: true, push: false },
}

const LOCAL_DIRTY_KEY = 'app_theme_dirty'

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        loaded: false,
        settings: { ...DEFAULTS } as AppSettings,
        localThemeDirty: false as boolean,
    }),
    actions: {
        applyDefaults() {
            this.settings = { ...DEFAULTS, ...this.settings }
        },

        initFromLocal() {
            try {
                // try useColorMode first
                // @ts-ignore
                const colorMode = typeof useColorMode !== 'undefined' ? useColorMode?.() : null
                if (colorMode) {
                    // @ts-ignore
                    const v = colorMode.preference ?? colorMode.value ??  null
                    if (v) {
                        this.settings.theme = v as AppSettings['theme']
                        return
                    }
                }
            } catch (e) {}
            try {
                const raw = localStorage.getItem('app_settings')
                if (raw) {
                    const local = JSON.parse(raw)
                    if (local?.theme) this.settings.theme = local.theme
                }
            } catch (e) {}
        },

        markLocalThemeDirty() {
            this.localThemeDirty = true
            try { localStorage.setItem(LOCAL_DIRTY_KEY, '1') } catch {}
        },

        clearLocalThemeDirty() {
            this.localThemeDirty = false
            try { localStorage.removeItem(LOCAL_DIRTY_KEY) } catch {}
        },

        readLocalDirtyFromStorage() {
            try {
                const v = localStorage.getItem(LOCAL_DIRTY_KEY)
                this.localThemeDirty = v === '1'
            } catch { this.localThemeDirty = false }
        },

        async fetchFromSupabase(user?: User | null, supabase?: SupabaseClient) {
            if (!supabase) supabase = useSupabaseClient()
            if (user === undefined) user = useSupabaseUser().value

            if (!user) {
                this.settings = { ...DEFAULTS }
                this.loaded = true
                return
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('settings')
                    .eq('id', user.id)
                    .single()
                console.log(data)
                if (error && error.code) console.warn('fetchFromSupabase warning:', error)
                const remote = data?.settings ?? {}
                const merged = { ...DEFAULTS, ...remote }
                // если локальный override присутствует - не затираем тему
                if (this.localThemeDirty) {
                    merged.theme = this.settings.theme ?? merged.theme
                }
                this.settings = merged
            } catch (e) {
                console.error('Ошибка загрузки настроек:', e)
                this.settings = { ...DEFAULTS }
            } finally {
                this.loaded = true
            }
        },

        /**
         * Сохраняем на сервер (upsert). После успеха:
         *  - устанавливаем useColorMode (если есть) в сохранённое значение (чтобы persist работал)
         *  - очищаем localThemeDirty
         */
        async saveSettings(newSettings: AppSettings, user?: User | null, supabase?: SupabaseClient) {
            const prev = JSON.parse(JSON.stringify(this.settings))

            // Попытка прочитать "авторитетную" тему из useColorMode(), если он доступен
            let themeFromColorMode: AppSettings['theme'] | null = null
            try {
                // @ts-ignore
                const colorMode = typeof useColorMode !== 'undefined' ? useColorMode?.() : null
                if (colorMode) {
                    // @ts-ignore
                    const v = colorMode.preference ?? colorMode.value ?? null
                    if (v && v !== 'null') themeFromColorMode = (v as AppSettings['theme'])
                }
            } catch (e) {
                themeFromColorMode = null
            }

            // если useColorMode дал значение - оно берётся за источник,
            // иначе используем значение из newSettings
            const themeToSave = themeFromColorMode ?? (newSettings.theme ?? this.settings.theme ?? 'system')

            // обновим локальный объект перед апдейтом
            this.settings = { ...newSettings, theme: themeToSave }

            // локальная резервная копия
            try { localStorage.setItem('app_settings', JSON.stringify(this.settings)) } catch {}

            if (!supabase) supabase = useSupabaseClient()
            if (user === undefined) user = useSupabaseUser().value

            // если не залогинен - считаем, что visual уже применён локально,
            // но всё равно убедимся, что useColorMode хранит нужное значение и очистим dirty
            if (!user) {
                // попытка гарантировать, что модуль color-mode сохранит именно themeToSave
                try {
                    // @ts-ignore
                    const colorMode = typeof useColorMode !== 'undefined' ? useColorMode?.() : null
                    if (colorMode) {
                        const val = themeToSave === 'system' ? 'system' : themeToSave
                        // @ts-ignore
                        if ('value' in colorMode) colorMode.value = val
                        // @ts-ignore
                        else if ('preference' in colorMode) colorMode.preference = val
                        else if (typeof colorMode === 'function') colorMode(val)
                    }
                } catch (e) { /* ignore */ }

                // write to the storage the color-mode module expects (so reload keeps it)
                try {
                    // @ts-ignore
                    const rc = typeof useRuntimeConfig !== 'undefined' ? useRuntimeConfig() : null
                    const cmConf = rc?.public?.colorMode ?? rc?.colorMode ?? {}
                    const storageKey = cmConf.storageKey ?? cmConf.key ?? 'nuxt-color-mode'
                    const storageType = cmConf.storage ?? cmConf.storageType ?? 'localStorage'

                    if (typeof window !== 'undefined') {
                        if (storageType === 'cookie') {
                            document.cookie = `${encodeURIComponent(storageKey)}=${encodeURIComponent(themeToSave)}; path=/; max-age=${60*60*24*365*5}`
                        } else if (storageType === 'sessionStorage') {
                            sessionStorage.setItem(storageKey, themeToSave)
                        } else {
                            localStorage.setItem(storageKey, themeToSave)
                        }
                    }
                } catch (e) { /* ignore */ }

                this.clearLocalThemeDirty()
                return
            }

            // если залогинен - апдейтим профиль на сервере
            try {
                const { error } = await supabase
                    .from('profiles')
                    .upsert({ id: user.id, settings: this.settings }, { returning: 'minimal' })

                if (error) {
                    console.error('Supabase upsert error:', error)
                    throw error
                }

                // После успешного сохранения: убедимся, что модуль color-mode и локальное хранилище содержат themeToSave
                try {
                    // Установим composable (если есть)
                    // @ts-ignore
                    const colorMode = typeof useColorMode !== 'undefined' ? useColorMode?.() : null
                    if (colorMode) {
                        const val = themeToSave === 'system' ? 'system' : themeToSave
                        // @ts-ignore
                        if ('value' in colorMode) colorMode.value = val
                        // @ts-ignore
                        else if ('preference' in colorMode) colorMode.preference = val
                        else if (typeof colorMode === 'function') colorMode(val)
                    }

                    // И запишем в storage, который ожидает модуль
                    // @ts-ignore
                    const rc = typeof useRuntimeConfig !== 'undefined' ? useRuntimeConfig() : null
                    const cmConf = rc?.public?.colorMode ?? rc?.colorMode ?? {}
                    const storageKey = cmConf.storageKey ?? cmConf.key ?? 'nuxt-color-mode'
                    const storageType = cmConf.storage ?? cmConf.storageType ?? 'localStorage'

                    if (typeof window !== 'undefined') {
                        if (storageType === 'cookie') {
                            document.cookie = `${encodeURIComponent(storageKey)}=${encodeURIComponent(themeToSave)}; path=/; max-age=${60*60*24*365*5}`
                        } else if (storageType === 'sessionStorage') {
                            sessionStorage.setItem(storageKey, themeToSave)
                        } else {
                            localStorage.setItem(storageKey, themeToSave)
                        }
                    }
                } catch (e) {
                    console.warn('Не удалось синхронизировать локальное хранилище color-mode после save:', e)
                }

                // флаг: локальная правка синхронизирована
                this.clearLocalThemeDirty()
            } catch (e) {
                // откат при ошибке
                this.settings = prev
                try { localStorage.setItem('app_settings', JSON.stringify(this.settings)) } catch {}
                throw e
            }
        },

        // previewTheme - просто делегируем на useColorMode или data-theme
        previewTheme(theme?: AppSettings['theme'] | null) {
            if (process.client) {
                try {
                    // @ts-ignore
                    const colorMode = typeof useColorMode !== 'undefined' ? useColorMode?.() : null
                    if (colorMode) {
                        const value = !theme || theme === 'system' ? 'system' : theme
                        // @ts-ignore
                        if ('value' in colorMode) colorMode.value = value
                        else if ('preference' in colorMode) colorMode.preference = value
                        else if (typeof colorMode === 'function') colorMode(value)
                        return
                    }
                } catch (e) {}
                const eff = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
                if (!theme || theme === 'system') document.documentElement.setAttribute('data-theme', eff)
                else document.documentElement.setAttribute('data-theme', theme)
            }
        },

        applySavedTheme() {
            this.previewTheme(this.settings.theme)
        },

        restoreTheme() {
            this.applySavedTheme()
        },
    },
})
