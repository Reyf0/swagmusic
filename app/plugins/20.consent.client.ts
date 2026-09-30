import { injectAnalytics } from '@vercel/analytics/nuxt/runtime'

/**
 * Loads the visitor's cookie choice and starts Vercel Web Analytics only when statistics are allowed.
 * Without consent the analytics script is never downloaded; if consent is withdrawn later,
 * events are dropped (the loaded script cannot be unloaded until the next page load).
 */
export default defineNuxtPlugin((nuxtApp) => {
    const consent = useCookieConsent()
    consent.value = readStoredConsent()

    let started = false
    const start = () => {
        if (started) return
        started = true
        nuxtApp.runWithContext(() => injectAnalytics({
            beforeSend: event => (consent.value?.analytics ? event : null),
        }))
    }

    watch(() => consent.value?.analytics, (allowed) => { if (allowed) start() }, { immediate: true })
})
