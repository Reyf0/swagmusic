import type { IncomingMessage, ServerResponse } from 'http'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)

        // Пример: отправим в console, но тут лучше писать в БД / external service
        // eslint-disable-next-line no-console
        console.error('[RemoteErrorLog]', JSON.stringify(body, null, 2))

        // Если у тебя есть секретный ключ SENTRY_DSN или другой интегратор, можно отправить сюда.
        // Пример: если есть SENTRY_DSN — отправим простую нотификацию (реальную интеграцию делай через SDK)
        // const dsn = process.env.SENTRY_DSN

        return {
            ok: true,
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[RemoteErrorLog] handler failure', e)
        return {
            ok: false,
            error: String(e),
        }
    }
})
