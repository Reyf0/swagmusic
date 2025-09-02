import type { ComponentPublicInstance } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig()

    // helper: получить имя компонента безопасно
    function getComponentName(instance?: ComponentPublicInstance | null) {
        try {
            if (!instance) return null
            const type: any = (instance as any).type || (instance as any).vnode?.type
            return type?.name || type?.__name || (type && type.displayName) || null
        } catch (_e) {
            return null
        }
    }

    // helper: защищённая сериализация с лимитом глубины (без циклов)
    function safeSerialize(obj: any, depth = 2, seen = new WeakSet()): any {
        if (obj === null || typeof obj !== 'object') return obj
        if (depth <= 0) return '[Object]'
        if (seen.has(obj)) return '[Circular]'
        seen.add(obj)
        if (Array.isArray(obj)) return obj.map((v) => safeSerialize(v, depth - 1, seen))
        const out: Record<string, any> = {}
        for (const key of Object.keys(obj)) {
            try {
                const val = (obj as any)[key]
                if (typeof val === 'function') continue
                out[key] = safeSerialize(val, depth - 1, seen)
            } catch (_e) {
                out[key] = '[Unserializable]'
            }
        }
        return out
    }

    // Ensure error has stack — если нет, генерируем
    function ensureStack(err: any) {
        try {
            if (!err) return err
            if (!err.stack) {
                const tmp = new Error(String(err.message ?? err ?? 'Error (no message)'))
                // не затираем message если уже есть
                if (!err.message) err.message = tmp.message
                err.stack = tmp.stack
            }
        } catch (_e) {
            // ignore
        }
        return err
    }

    // Универсальный репортер: по умолчанию логит в консоль и пытается POST в эндпойнт
    async function reportError(payload: Record<string, any>) {
        // 1) попытка отправить в интеграцию Sentry, если она присутствует
        try {
            // @ts-ignore — если подключён Sentry-плагин, он может быть доступен как $sentry
            if ((nuxtApp as any).$sentry?.captureException) {
                ;(nuxtApp as any).$sentry.captureException(payload.error || payload)
            } else if ((globalThis as any).Sentry?.captureException) {
                ;(globalThis as any).Sentry.captureException(payload.error || payload)
            }
        } catch (_e) {
            // ignore Sentry errors
        }

        // 2) console as fallback
        try {
            // аккуратно — не выводим огромные объекты прямо
            // eslint-disable-next-line no-console
            console.error('[ErrorHandler] report', payload)
            console.trace('Stack')
        } catch (_e) {}

        // 3) Отправка на серверный log-endpoint (если настроен)
        try {
            const endpoint =
                config.public?.errorLoggerEndpoint ?? '/api/error' // можно переопределить через runtimeConfig
            // POST, но не ждём долго
            void fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true,
            }).catch(() => {
                // swallow
            })
        } catch (_e) {
            // swallow
        }
    }

    // Формирует полезный payload из ошибки и контекста
    function buildPayload(originalError: any, instance: ComponentPublicInstance | null, info?: string) {
        const err = ensureStack(originalError) || { message: String(originalError) }
        const route = (useRoute && typeof useRoute === 'function') ? useRoute() : null
        const payload: Record<string, any> = {
            ts: new Date().toISOString(),
            message: err.message,
            stack: err.stack,
            name: err.name,
            info: info ?? null,
            route: route ? { path: route.fullPath, name: route.name } : null,
            component: getComponentName(instance),
            ssr: process.server ? true : false,
            helper: {
                // ограниченная сериализация props и relevant fields
                componentInstance: instance ? safeSerialize({ props: instance.$props, attrs: instance.$attrs }, 2) : null,
            },
            // raw error for Sentry (don't put huge things in JSON endpoint)
            error: undefined,
        }
        // attach a minimal `error` object for Sentry/console (not for JSON endpoint)
        try {
            payload.error = {
                message: err.message,
                name: err.name,
                stack: err.stack,
            }
        } catch (_e) {}

        return payload
    }

    // Основной Vue конфиг.errorHandler
    nuxtApp.vueApp.config.errorHandler = (error: unknown, instance, info) => {
        try {
            const payload = buildPayload(error, instance ?? null, info)
            void reportError(payload)
        } catch (e) {
            // если даже тут упало — логим в консоль
            // eslint-disable-next-line no-console
            console.error('[ErrorHandler] failed to handle error', e, error)
        }
    }

    // Nuxt hook (альтернативный путь — сработает для vue:error)
    nuxtApp.hook('vue:error', (error, instance, info) => {
        try {
            const payload = buildPayload(error, instance ?? null, info)
            void reportError(payload)
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[ErrorHandler] vue:error handler failed', e)
        }
    })

    // Nuxt app:error (высшего уровня)
    nuxtApp.hook('app:error', (err) => {
        try {
            const payload = buildPayload(err, null, 'app:error')
            void reportError(payload)
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[ErrorHandler] app:error handler failed', e)
        }
    })
})
