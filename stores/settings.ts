// stores/settings.ts
import { defineStore } from 'pinia'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export type AppSettings = {
    theme: 'light' | 'dark' | 'system'
    locale: string
    notifications: { email: boolean; push: boolean }
    // любые другие ключи
    [k: string]: any
}

const DEFAULTS: AppSettings = {
    theme: 'system',
    locale: 'ru',
    notifications: { email: true, push: false },
}

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        loaded: false,
        settings: { ...DEFAULTS } as AppSettings,
    }),
    getters: {
        get: (state) => (key: keyof AppSettings) => state.settings[key],
    },
    actions: {
        applyDefaults() {
            this.settings = { ...DEFAULTS, ...this.settings }
        },

        initFromLocal() {
            try {
                const raw = localStorage.getItem('app_settings')
                if (raw) {
                    const local = JSON.parse(raw)
                    this.settings = { ...DEFAULTS, ...local }
                }
            } catch (e) {
                // ignore
            }
        },

        // Загрузка настроек из profiles.settings
        async fetchFromSupabase(user?: User | null, supabase?: SupabaseClient) {
            // если композаблы не переданы — попробуем взять их автоматически (в Nuxt)
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

                // если профиля нет — используем дефолты
                const remote = data?.settings ?? {}
                this.settings = { ...DEFAULTS, ...remote }
            } catch (e) {
                console.error('Ошибка загрузки настроек:', e)
                this.settings = { ...DEFAULTS }
            } finally {
                this.loaded = true
            }
        },

        /**
         * Сохраняет весь объект настроек одним запросом (оптимистично).
         * Если user/supabase не переданы — берём через nuxt composables.
         */
        async saveSettings(newSettings: AppSettings, user?: User | null, supabase?: SupabaseClient) {
            // сохраняем локально (оптимистично)
            const prev = JSON.parse(JSON.stringify(this.settings))
            this.settings = { ...newSettings }
            try {
                localStorage.setItem('app_settings', JSON.stringify(this.settings))
            } catch (e) {
                // ignore localStorage errors
            }

            // получить supabase/user, если не переданы
            if (!supabase) supabase = useSupabaseClient()
            if (user === undefined) user = useSupabaseUser().value

            // если не залогинен — оставляем только локально
            if (!user) return

            try {
                const { error } = await supabase
                    .from('profiles')
                    .upsert({ id: user.id, settings: this.settings }, { returning: 'minimal' })

                if (error) throw error
            } catch (e) {
                // откат при ошибке
                this.settings = prev
                try {
                    localStorage.setItem('app_settings', JSON.stringify(this.settings))
                } catch (_) {}
                console.error('Не удалось сохранить настройки на сервере:', e)
                throw e
            }
        },
    },
})
