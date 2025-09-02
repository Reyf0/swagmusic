import { defineNitroPlugin } from 'nitropack/dist/runtime/plugin'

export default defineNitroPlugin((nitroApp) => {
    nitroApp.hooks.hook('error', (err: any, { event }) => {
        try {
            const payload = {
                ts: new Date().toISOString(),
                message: err?.message ?? String(err),
                stack: err?.stack ?? null,
                url: event?.req?.url ?? event?.path ?? null,
                method: event?.req?.method ?? null,
                headers: event?.req?.headers ? { 'user-agent': event?.req?.headers['user-agent'] } : undefined,
                ssr: true,
            }

            // Локальный лог
            // eslint-disable-next-line no-console
            console.error('[ServerError]', payload)

            // Отправим на central logging endpoint (если есть env)
            const LOG_ENDPOINT = process.env.ERROR_LOGGER_ENDPOINT || '/api/error'
            try {
                // fire-and-forget
                void fetch(LOG_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, server: true }),
                })
            } catch (e) {
                // ignore
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[ServerError] failed to report', e)
        }
    })
})
