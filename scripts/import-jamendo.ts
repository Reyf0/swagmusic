/* eslint-disable no-console -- command-line tool */
/**
 * Imports the most popular Creative Commons tracks from Jamendo.
 *
 *   npm run import:jamendo -- --limit 500
 *
 * Each Jamendo artist gets a profile (backed by an auth user nobody can sign in to), albums and genres are
 * created as needed, covers are copied into the `covers` bucket, and audio_url points at Jamendo's stream.
 * tracks.metadata keeps the Jamendo id, the license URL and a link to the original, which the track page
 * shows as attribution. Re-running skips tracks that are already imported.
 *
 * Env: JAMENDO_CLIENT_ID (https://devportal.jamendo.com), NUXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY.
 */
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../shared/types/generated/database.types.ts'
import { CREDIT_STATUS } from '../shared/utils/credits.ts'
import { ccLicenseLabel } from '../shared/utils/license.ts'
import { isUniqueViolation, slugify } from '../app/utils/slug.ts'
import {
    JAMENDO_PAGE_SIZE,
    USAGE,
    artistEmail,
    artistsUrl,
    imageExtension,
    isImportable,
    parseImportArgs,
    trackGenres,
    trackMetadata,
    tracksUrl,
    usernameCandidates,
    type ImportOptions,
    type JamendoArtist,
    type JamendoTrack,
} from './jamendo.ts'

type Db = SupabaseClient<Database>

/** Unique index from supabase/migrations/20261001000000_jamendo_import.sql. */
const JAMENDO_ID_INDEX = 'tracks_jamendo_id_key'

async function jamendoGet<T>(url: string): Promise<T[]> {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) throw new Error(`Jamendo API: HTTP ${res.status}`)
    const body = await res.json() as { headers: { status: string; error_message?: string }; results: T[] }
    if (body.headers?.status !== 'success') throw new Error(`Jamendo API: ${body.headers?.error_message || 'request failed'}`)
    return body.results ?? []
}

/** The chart from `offset`, `limit` tracks long, without the ones we cannot import. */
async function fetchChart(clientId: string, opts: ImportOptions): Promise<JamendoTrack[]> {
    const out: JamendoTrack[] = []
    for (let offset = opts.offset; offset < opts.offset + opts.limit; offset += JAMENDO_PAGE_SIZE) {
        const size = Math.min(JAMENDO_PAGE_SIZE, opts.offset + opts.limit - offset)
        const page = await jamendoGet<JamendoTrack>(tracksUrl(clientId, opts, offset, size))
        out.push(...page.filter(isImportable))
        if (page.length < size) break
    }
    return out
}

async function fetchArtists(clientId: string, ids: string[]): Promise<Map<string, JamendoArtist>> {
    const out = new Map<string, JamendoArtist>()
    for (let i = 0; i < ids.length; i += 100) {
        for (const a of await jamendoGet<JamendoArtist>(artistsUrl(clientId, ids.slice(i, i + 100)))) out.set(String(a.id), a)
    }
    return out
}

/** Jamendo ids among `ids` that are already in the tracks table. */
async function alreadyImported(db: Db, ids: string[]): Promise<Set<string>> {
    const out = new Set<string>()
    for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await db.from('tracks')
            .select('jamendo_id:metadata->>jamendo_id')
            .in('metadata->>jamendo_id', ids.slice(i, i + 200))
        if (error) throw error
        for (const row of data as unknown as { jamendo_id: string }[]) out.add(row.jamendo_id)
    }
    return out
}

async function downloadImage(url: string): Promise<{ body: ArrayBuffer; contentType: string; ext: string } | null> {
    if (!url) return null
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    if (!contentType.startsWith('image/')) return null
    return { body: await res.arrayBuffer(), contentType, ext: imageExtension(contentType) }
}

async function uploadCover(db: Db, path: string, image: { body: ArrayBuffer; contentType: string }): Promise<string> {
    const { error } = await db.storage.from('covers').upload(path, image.body, {
        contentType: image.contentType,
        cacheControl: '31536000',
        upsert: true,
    })
    if (error) throw error
    return db.storage.from('covers').getPublicUrl(path).data.publicUrl
}

/**
 * Lazily creates each artist, album and genre once, even when several tracks of the same artist
 * are imported in parallel (the promise is cached, not the result).
 */
class Importer {
    private artists = new Map<string, Promise<string>>()
    private albums = new Map<string, Promise<string | null>>()
    private genres = new Map<string, Promise<string>>()
    // Plain fields, not constructor parameter properties: Node's type stripping cannot run those.
    private db: Db
    private jamendoArtists: Map<string, JamendoArtist>

    constructor(db: Db, jamendoArtists: Map<string, JamendoArtist>) {
        this.db = db
        this.jamendoArtists = jamendoArtists
    }

    artistProfile(t: JamendoTrack): Promise<string> {
        const key = String(t.artist_id)
        if (!this.artists.has(key)) this.artists.set(key, this.findOrCreateArtist(t))
        return this.artists.get(key)!
    }

    album(t: JamendoTrack, profileId: string, cover: Awaited<ReturnType<typeof downloadImage>>): Promise<string | null> {
        if (!t.album_id || !t.album_name?.trim()) return Promise.resolve(null)
        const key = `${profileId}:${t.album_id}`
        if (!this.albums.has(key)) this.albums.set(key, this.findOrCreateAlbum(t, profileId, cover))
        return this.albums.get(key)!
    }

    genre(g: { name: string; slug: string }): Promise<string> {
        if (!this.genres.has(g.slug)) this.genres.set(g.slug, this.findOrCreateGenre(g))
        return this.genres.get(g.slug)!
    }

    private async findOrCreateArtist(t: JamendoTrack): Promise<string> {
        const jamendoId = String(t.artist_id)
        const { data: existing, error: findError } = await this.db.from('profiles')
            .select('id')
            .eq('settings->>jamendo_artist_id', jamendoId)
            .limit(1)
            .maybeSingle()
        if (findError) throw findError
        if (existing) return existing.id

        const artist = this.jamendoArtists.get(jamendoId)
        const email = artistEmail(jamendoId)
        let lastError: unknown
        for (const username of usernameCandidates(artist?.name || t.artist_name)) {
            // A signup trigger may create the profile from user_metadata and fail on a taken username.
            const { data, error } = await this.db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { username } })
            if (error) {
                lastError = error
                if (/database error/i.test(error.message)) continue
                throw error
            }

            const { error: profileError } = await this.db.from('profiles').upsert({
                id: data.user.id,
                email,
                username,
                full_name: artist?.name || t.artist_name,
                avatar_url: artist?.image || null,
                website: artist?.shareurl || null,
                settings: { source: 'jamendo', jamendo_artist_id: jamendoId },
            })
            if (!profileError) return data.user.id

            await this.db.auth.admin.deleteUser(data.user.id)
            lastError = profileError
            if (!isUniqueViolation(profileError)) break
        }
        throw lastError
    }

    private async findOrCreateAlbum(t: JamendoTrack, profileId: string, cover: Awaited<ReturnType<typeof downloadImage>>): Promise<string> {
        const title = t.album_name.trim()
        const { data: existing, error: findError } = await this.db.from('albums')
            .select('id')
            .eq('user_id', profileId)
            .eq('title', title)
            .limit(1)
            .maybeSingle()
        if (findError) throw findError
        if (existing) return existing.id

        // The album has its own copy of the cover: deleting a track or an album removes its cover file.
        const coverUrl = cover ? await uploadCover(this.db, `${profileId}/jamendo-album-${t.album_id}.${cover.ext}`, cover) : null
        const { data, error } = await this.db.from('albums')
            .insert({ title, cover_url: coverUrl, user_id: profileId, author_id: profileId })
            .select('id')
            .single()
        if (error) throw error
        return data.id
    }

    private async findOrCreateGenre(g: { name: string; slug: string }): Promise<string> {
        const find = () => this.db.from('genres').select('id').eq('slug', g.slug).limit(1).maybeSingle()
        const { data: existing, error: findError } = await find()
        if (findError) throw findError
        if (existing) return existing.id

        const { data, error } = await this.db.from('genres').insert(g).select('id').single()
        if (!error) return data.id
        if (!isUniqueViolation(error)) throw error
        const { data: raced } = await find()
        if (!raced) throw error
        return raced.id
    }

    /** Imports one track. Returns false when it turned out to be imported already (a parallel run). */
    async importTrack(t: JamendoTrack): Promise<boolean> {
        const profileId = await this.artistProfile(t)
        const cover = await downloadImage(t.album_image || t.image)
        const albumId = await this.album(t, profileId, cover)

        const coverPath = cover ? `${profileId}/jamendo-${t.id}.${cover.ext}` : null
        const coverUrl = cover && coverPath ? await uploadCover(this.db, coverPath, cover) : null
        let trackId: string | null = null
        try {
            trackId = await this.insertTrack({
                title: t.name.trim(),
                audio_url: t.audio,
                cover_url: coverUrl,
                duration_seconds: Number(t.duration) || null,
                user_id: profileId,
                album_id: albumId,
                metadata: trackMetadata(t),
            })
            if (!trackId) {
                if (coverPath) await this.db.storage.from('covers').remove([coverPath])
                return false
            }

            const { error: creditError } = await this.db.from('track_authors')
                .insert({ track_id: trackId, profile_id: profileId, order_index: 0, status: CREDIT_STATUS.accepted })
            if (creditError) throw creditError

            const genreIds = await Promise.all(trackGenres(t).map(g => this.genre(g)))
            if (genreIds.length) {
                const { error } = await this.db.from('track_genres').insert(genreIds.map(genre_id => ({ track_id: trackId!, genre_id })))
                if (error) throw error
            }
            return true
        } catch (err) {
            if (trackId) await this.db.from('tracks').delete().eq('id', trackId)
            if (coverPath) await this.db.storage.from('covers').remove([coverPath])
            throw err
        }
    }

    /**
     * Inserts with a unique slug, like app/utils/createTrackWithUniqueSlug.ts (which Node cannot import:
     * its "./slug" import has no extension). Returns null when the Jamendo id is already taken.
     */
    private async insertTrack(payload: Omit<Database['public']['Tables']['tracks']['Insert'], 'slug'>): Promise<string | null> {
        const base = slugify(payload.title, 60)
        for (let attempt = 0; attempt < 10; attempt++) {
            const slug = attempt === 0 ? base : attempt < 9 ? `${base}-${attempt + 1}` : `${base}-${Math.random().toString(36).slice(2, 8)}`
            const { data, error } = await this.db.from('tracks').insert({ ...payload, slug }).select('id').single()
            if (!error) return data.id
            if (!isUniqueViolation(error)) throw error
            if (`${error.message} ${error.details ?? ''}`.includes(JAMENDO_ID_INDEX)) return null
        }
        throw new Error(`No free slug for "${payload.title}"`)
    }
}

/** Runs `fn` over `items`, at most `limit` at a time. */
async function forEachLimit<T>(items: T[], limit: number, fn: (item: T, index: number) => Promise<void>): Promise<void> {
    let next = 0
    const worker = async () => {
        while (next < items.length) {
            const i = next++
            await fn(items[i]!, i)
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

function describe(t: JamendoTrack): string {
    const genres = trackGenres(t).map(g => g.slug).join(', ')
    return `${t.name} — ${t.artist_name} (${ccLicenseLabel(t.license_ccurl) ?? t.license_ccurl})${genres ? ` [${genres}]` : ''}`
}

function requireEnv(name: string, ...fallbacks: string[]): string {
    for (const key of [name, ...fallbacks]) {
        const value = process.env[key]?.trim()
        if (value) return value
    }
    throw new Error(`${name} is not set (see .env.example)`)
}

async function main() {
    let opts: ImportOptions
    try {
        opts = parseImportArgs(process.argv.slice(2))
    } catch (err) {
        console.error(`${(err as Error).message}\n\n${USAGE}`)
        process.exit(2)
    }

    const clientId = requireEnv('JAMENDO_CLIENT_ID')
    const chart = await fetchChart(clientId, opts)
    console.log(`Jamendo: ${chart.length} importable tracks in positions ${opts.offset + 1}–${opts.offset + opts.limit} by ${opts.order}${opts.tags.length ? `, tags ${opts.tags.join(', ')}` : ''}`)

    if (opts.dryRun) {
        chart.forEach((t, i) => console.log(`${String(i + 1).padStart(4)}. ${describe(t)}`))
        return
    }

    const db = createClient<Database>(requireEnv('NUXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'), requireEnv('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_KEY'), {
        auth: { persistSession: false, autoRefreshToken: false },
    })

    const existing = await alreadyImported(db, chart.map(t => String(t.id)))
    const todo = chart.filter(t => !existing.has(String(t.id)))
    const artists = await fetchArtists(clientId, [...new Set(todo.map(t => String(t.artist_id)))])
    console.log(`${existing.size} already imported, importing ${todo.length}…`)

    const importer = new Importer(db, artists)
    let imported = 0
    let skipped = existing.size
    const failed: string[] = []
    await forEachLimit(todo, opts.concurrency, async (t, i) => {
        const label = `[${i + 1}/${todo.length}] ${describe(t)}`
        try {
            if (await importer.importTrack(t)) {
                imported++
                console.log(`✓ ${label}`)
            } else {
                skipped++
                console.log(`= ${label} (already imported)`)
            }
        } catch (err) {
            failed.push(String(t.id))
            console.error(`✗ ${label}: ${(err as { message?: string })?.message ?? err}`)
        }
    })

    console.log(`\nDone: ${imported} imported, ${skipped} skipped, ${failed.length} failed${failed.length ? ` (Jamendo ids ${failed.join(', ')})` : ''}`)
    if (failed.length) process.exitCode = 1
}

main().catch((err) => {
    console.error(err?.message ?? err)
    process.exit(1)
})
