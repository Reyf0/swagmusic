/**
 * The visitor's choice about optional data collection. Cookies that keep you signed in and
 * settings kept in the browser are always on (the site cannot work without them); the only
 * optional part is anonymous visit statistics (Vercel Web Analytics).
 *
 * Stored in localStorage (per browser). Bump CONSENT_VERSION when the policy changes in a way
 * that needs asking again.
 */
export type CookieConsent = { version: number; analytics: boolean; at: string }

export const CONSENT_VERSION = 1
const KEY = 'swagmusic:cookie-consent'

/** null until the visitor has chosen (or before the browser has loaded it). */
export const useCookieConsent = () => useState<CookieConsent | null>('cookie-consent', () => null)
/** The cookie dialog was opened on purpose ("Cookie settings"), not because no choice was made yet. */
export const useCookieSettingsOpen = () => useState<boolean>('cookie-settings-open', () => false)

export function readStoredConsent(): CookieConsent | null {
    try {
        const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null')
        return parsed?.version === CONSENT_VERSION && typeof parsed.analytics === 'boolean' ? parsed : null
    } catch {
        return null
    }
}

/** Save a choice; returns it so callers can put it into the shared state. */
export function storeConsent(analytics: boolean): CookieConsent {
    const consent = { version: CONSENT_VERSION, analytics, at: new Date().toISOString() }
    try { localStorage.setItem(KEY, JSON.stringify(consent)) } catch { /* storage unavailable: ask again next visit */ }
    return consent
}
