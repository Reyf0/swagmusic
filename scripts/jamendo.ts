import { parseArgs } from 'node:util'
import { slugify } from '../app/utils/slug.ts'

// Pure helpers for scripts/import-jamendo.ts (kept separate so they can be unit tested).
// API docs: https://developer.jamendo.com/v3.0/tracks

export const JAMENDO_API = 'https://api.jamendo.com/v3.0'

/** Jamendo returns at most 200 rows per request. */
export const JAMENDO_PAGE_SIZE = 200

export const JAMENDO_ORDERS = ['popularity_total', 'popularity_month', 'popularity_week'] as const

export interface JamendoTrack {
    id: string
    name: string
    duration: number
    artist_id: string
    artist_name: string
    album_id: string
    album_name: string
    album_image: string
    image: string
    audio: string
    license_ccurl: string
    shareurl: string
    musicinfo?: { tags?: { genres?: string[] } }
}

export interface JamendoArtist {
    id: string
    name: string
    image: string
    shareurl: string
}

export interface ImportOptions {
    limit: number
    offset: number
    order: (typeof JAMENDO_ORDERS)[number]
    tags: string[]
    concurrency: number
    dryRun: boolean
    /** Re-check every imported track against Jamendo instead of importing. */
    sync: boolean
    /** Delete everything imported from Jamendo instead of importing. */
    purge: boolean
    /** Confirms --purge, and lets --sync remove more than half of the imported tracks. */
    yes: boolean
}

export const USAGE = `Usage: npm run import:jamendo -- [options]

  --limit <n>        how many tracks to take from the top of the chart (default 100)
  --offset <n>       skip the first n tracks of the chart, to continue a previous import (default 0)
  --order <order>    ${JAMENDO_ORDERS.join(' | ')} (default popularity_total)
  --tags <a,b>       only tracks with any of these tags, e.g. rock,electronic
  --concurrency <n>  tracks imported in parallel (default 4)
  --dry-run          only list what would be imported; needs JAMENDO_CLIENT_ID only

  --sync             re-check imported tracks: remove the ones gone from Jamendo, update the rest
                     (Jamendo's API terms ask to reflect their changes; run it at least weekly)
  --purge            delete everything imported from Jamendo (shows what it would delete without --yes)
  --yes              confirm --purge, or let --sync remove more than half of the imported tracks`

function positiveInt(name: string, value: string | undefined, fallback: number, min = 1): number {
    if (value === undefined) return fallback
    const n = Number(value)
    if (!Number.isInteger(n) || n < min) throw new Error(`--${name} must be an integer ≥ ${min}, got "${value}"`)
    return n
}

/** Parses the command line (without the node and script paths). Throws with a readable message on bad input. */
export function parseImportArgs(args: string[]): ImportOptions {
    const { values } = parseArgs({
        args,
        options: {
            'limit': { type: 'string' },
            'offset': { type: 'string' },
            'order': { type: 'string' },
            'tags': { type: 'string' },
            'concurrency': { type: 'string' },
            'dry-run': { type: 'boolean', default: false },
            'sync': { type: 'boolean', default: false },
            'purge': { type: 'boolean', default: false },
            'yes': { type: 'boolean', default: false },
        },
        strict: true,
    })

    const order = values.order ?? 'popularity_total'
    if (!(JAMENDO_ORDERS as readonly string[]).includes(order)) {
        throw new Error(`--order must be one of ${JAMENDO_ORDERS.join(', ')}, got "${order}"`)
    }
    if (values.sync && values.purge) throw new Error('--sync and --purge cannot be used together')

    return {
        limit: positiveInt('limit', values.limit, 100),
        offset: positiveInt('offset', values.offset, 0, 0),
        order: order as ImportOptions['order'],
        tags: (values.tags ?? '').split(',').map(t => t.trim()).filter(Boolean),
        concurrency: positiveInt('concurrency', values.concurrency, 4),
        dryRun: values['dry-run'] ?? false,
        sync: values.sync ?? false,
        purge: values.purge ?? false,
        yes: values.yes ?? false,
    }
}

const TRACK_FIELDS = { format: 'json', include: 'licenses musicinfo', audioformat: 'mp32', imagesize: '600' }

/** One page of the chart. Arrays go space-separated, which URLSearchParams encodes as "+", as Jamendo expects. */
export function tracksUrl(clientId: string, opts: Pick<ImportOptions, 'order' | 'tags'>, offset: number, limit: number): string {
    const params = new URLSearchParams({
        client_id: clientId,
        limit: String(limit),
        offset: String(offset),
        order: opts.order,
        ...TRACK_FIELDS,
    })
    if (opts.tags.length) params.set('fuzzytags', opts.tags.join(' '))
    return `${JAMENDO_API}/tracks/?${params}`
}

/** Specific tracks by Jamendo id (at most JAMENDO_PAGE_SIZE). */
export function tracksByIdUrl(clientId: string, ids: string[]): string {
    const params = new URLSearchParams({ client_id: clientId, limit: String(JAMENDO_PAGE_SIZE), id: ids.join(' '), ...TRACK_FIELDS })
    return `${JAMENDO_API}/tracks/?${params}`
}

export function artistsUrl(clientId: string, ids: string[]): string {
    const params = new URLSearchParams({
        client_id: clientId,
        format: 'json',
        limit: String(JAMENDO_PAGE_SIZE),
        id: ids.join(' '),
    })
    return `${JAMENDO_API}/artists/?${params}`
}

/** A track we can play and credit: it has a stream, a title, an artist and a license. */
export function isImportable(t: JamendoTrack): boolean {
    return !!(t.audio && t.name?.trim() && t.artist_id && t.license_ccurl)
}

/** What goes into tracks.metadata: where the track came from and what the license requires us to show. */
export function trackMetadata(t: JamendoTrack) {
    return {
        source: 'jamendo',
        jamendo_id: String(t.id),
        license_url: t.license_ccurl,
        share_url: t.shareurl || null,
        artist_name: t.artist_name,
    }
}

/** Cover shown for the track: Jamendo's own image URL (the API terms ask not to cache their content). */
export function trackCoverUrl(t: JamendoTrack): string | null {
    return t.album_image || t.image || null
}

/** The tracks columns an imported track gets from Jamendo. */
export function trackFields(t: JamendoTrack) {
    return {
        title: t.name.trim(),
        audio_url: t.audio,
        cover_url: trackCoverUrl(t),
        duration_seconds: Number(t.duration) || null,
        metadata: trackMetadata(t),
    }
}

type TrackFields = ReturnType<typeof trackFields>

/** Columns of an imported track that changed on Jamendo since the import, or null when it is up to date. */
export function trackPatch(row: { [K in keyof TrackFields]?: unknown }, t: JamendoTrack): Partial<TrackFields> | null {
    const fresh = trackFields(t)
    const patch: Partial<TrackFields> = {}
    for (const key of ['title', 'audio_url', 'cover_url', 'duration_seconds'] as const) {
        if (row[key] !== fresh[key]) (patch as any)[key] = fresh[key]
    }
    const old = (row.metadata ?? {}) as Record<string, unknown>
    if (Object.entries(fresh.metadata).some(([k, v]) => old[k] !== v)) patch.metadata = { ...old, ...fresh.metadata }
    return Object.keys(patch).length ? patch : null
}

/** Genres of a track as genre rows ({ name, slug }), without duplicates. */
export function trackGenres(t: JamendoTrack): { name: string; slug: string }[] {
    const seen = new Set<string>()
    const out: { name: string; slug: string }[] = []
    for (const raw of t.musicinfo?.tags?.genres ?? []) {
        const name = raw.trim()
        if (!name) continue
        const slug = slugify(name, 40)
        if (seen.has(slug)) continue
        seen.add(slug)
        out.push({ name: name[0]!.toUpperCase() + name.slice(1), slug })
    }
    return out
}

/**
 * Usernames to try for an artist, in order: the name itself, then numbered variants for when it is taken.
 * Kept within 3–30 characters, the limits the admin user form enforces.
 */
export function usernameCandidates(artistName: string, count = 5): string[] {
    let base = artistName.trim().replace(/\s+/g, ' ').slice(0, 30).trim()
    if (base.length < 3) base = `${base || 'artist'} music`.slice(0, 30)
    const out = [base]
    for (let n = 2; out.length < count; n++) out.push(`${base.slice(0, 30 - String(n).length - 1).trim()} ${n}`)
    return out
}

/** Placeholder address for an artist's account: the reserved .invalid TLD never receives mail, so nobody can sign in. */
export function artistEmail(jamendoArtistId: string): string {
    return `jamendo-${jamendoArtistId}@import.swagmusic.invalid`
}
