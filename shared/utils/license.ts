/**
 * Short name of a Creative Commons license from its deed URL:
 * ".../licenses/by-nc-sa/3.0/" → "CC BY-NC-SA 3.0", ".../publicdomain/zero/1.0/" → "CC0 1.0".
 * Returns null for anything that is not a creativecommons.org license URL.
 */
export function ccLicenseLabel(url: string | null | undefined): string | null {
    if (!url) return null
    let parsed: URL
    try {
        parsed = new URL(url)
    } catch {
        return null
    }
    if (!/(^|\.)creativecommons\.org$/i.test(parsed.hostname)) return null

    const [kind, code, version] = parsed.pathname.split('/').filter(Boolean)
    if (kind === 'publicdomain' && code === 'zero') return version ? `CC0 ${version}` : 'CC0'
    if (kind === 'publicdomain' && code === 'mark') return 'Public Domain'
    if (kind !== 'licenses' || !code || !/^by(-(nc|nd|sa))*$/i.test(code)) return null
    return `CC ${code.toUpperCase()}${version ? ` ${version}` : ''}`
}

const SOURCE_NAMES: Record<string, string> = { jamendo: 'Jamendo' }

export interface TrackAttribution {
    /** "CC BY-SA 3.0", or null when the URL is not a known Creative Commons license. */
    license: string | null
    licenseUrl: string
    /** Page of the original track, e.g. on Jamendo. */
    originalUrl: string | null
    /** "Jamendo", or null for an unknown source. */
    sourceName: string | null
}

/** License credit for a track imported from elsewhere (tracks.metadata), or null for tracks uploaded here. */
export function trackAttribution(metadata: unknown): TrackAttribution | null {
    if (!metadata || typeof metadata !== 'object') return null
    const m = metadata as Record<string, unknown>
    if (typeof m.license_url !== 'string' || !m.license_url) return null
    return {
        license: ccLicenseLabel(m.license_url),
        licenseUrl: m.license_url,
        originalUrl: typeof m.share_url === 'string' && m.share_url ? m.share_url : null,
        sourceName: typeof m.source === 'string' ? SOURCE_NAMES[m.source] ?? null : null,
    }
}
