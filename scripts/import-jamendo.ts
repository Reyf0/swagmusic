/* eslint-disable no-console -- command-line tool */
/**
 * Imports the most popular Creative Commons tracks from Jamendo, keeps them in sync, or removes them.
 *
 *   npm run import:jamendo -- --limit 500     import the top of the chart
 *   npm run import:jamendo -- --sync          drop tracks gone from Jamendo, update the rest
 *   npm run import:jamendo -- --purge --yes   delete everything imported from Jamendo
 *
 * Each Jamendo artist gets a profile (backed by an auth user nobody can sign in to, marked imported_from =
 * 'jamendo'), albums and genres are created as needed. audio_url and cover_url point at Jamendo: their API
 * terms (https://devportal.jamendo.com/api_terms_of_use) forbid caching content beyond what the app needs and
 * ask to reflect their changes quickly — hence --sync — and to remove everything if access ends — hence --purge.
 * tracks.metadata keeps the Jamendo id, the license URL and a link to the original, which the track page
 * shows as attribution. Re-running an import skips tracks that are already imported.
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
    isImportable,
    parseImportArgs,
    trackCoverUrl,
    trackFields,
    trackGenres,
    trackPatch,
    tracksByIdUrl,
    tracksUrl,
    usernameCandidates,
    type ImportOptions,
    type JamendoArtist,
    type JamendoTrack,
} from './jamendo.ts'

type Db = SupabaseClient<Database>

/** Unique index from supabase/migrations/20261001020000_jamendo_import.sql. */
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

/** All rows of a query, 1000 at a time (PostgREST's default page size). */
async function selectAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
    const out: T[] = []
    for (let from = 0; ; from += 1000) {
        const { data, error } = await query(from, from + 999)
        if (error) throw error
        out.push(...(data ?? []))
        if (!data || data.length < 1000) return out
    }
}

type ImportedTrack = { id: string; user_id: string | null; album_id: string | null; title: string; audio_url: string | null; cover_url: string | null; duration_seconds: number | null; metadata: any }

function importedTracks(db: Db): Promise<ImportedTrack[]> {
    return selectAll<ImportedTrack>((from, to) => db.from('tracks')
        .select('id, user_id, album_id, title, audio_url, cover_url, duration_seconds, metadata')
        .eq('metadata->>source', 'jamendo')
        .order('id')
        .range(from, to) as any)
}

function importedProfileIds(db: Db): Promise<string[]> {
    return selectAll<{ id: string }>((from, to) => db.from('profiles')
        .select('id')
        .not('settings->>jamendo_artist_id', 'is', null)
        .order('id')
        .range(from, to)).then(rows => rows.map(r => r.id))
}

/** Deletes tracks with the rows that point at them, like the admin delete endpoint does. */
async function deleteTracks(db: Db, ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200)
        for (const table of ['playlist_tracks', 'track_authors', 'track_genres', 'track_embeddings', 'play_history'] as const) {
            const { error } = await db.from(table).delete().in('track_id', chunk)
            if (error) throw error
        }
        const { error: likesError } = await db.from('likes').delete().eq('target_type', 'track').in('target_id', chunk)
        if (likesError) throw likesError
        const { error } = await db.from('tracks').delete().in('id', chunk)
        if (error) throw error
    }
}

/** Removes an imported artist: cover copies left by the first version of this script, albums, profile, auth user. */
async function deleteArtist(db: Db, profileId: string): Promise<void> {
    const { data: files } = await db.storage.from('covers').list(profileId, { limit: 1000 })
    const paths = (files ?? []).filter(f => f.name.startsWith('jamendo-')).map(f => `${profileId}/${f.name}`)
    if (paths.length) await db.storage.from('covers').remove(paths)

    const { error: albumsError } = await db.from('albums').delete().eq('user_id', profileId)
    if (albumsError) throw albumsError
    const { error: userError } = await db.auth.admin.deleteUser(profileId)
    if (userError && !/not found/i.test(userError.message)) throw userError
    // In case profiles has no ON DELETE CASCADE from auth.users.
    const { error } = await db.from('profiles').delete().eq('id', profileId)
    if (error) throw error
}

/** Deletes the given albums and imported artists when no track is left on them. */
async function deleteOrphans(db: Db, albumIds: Iterable<string>, profileIds: Iterable<string>): Promise<{ albums: number; artists: number }> {
    const counts = { albums: 0, artists: 0 }
    const isUnused = async (column: 'album_id' | 'user_id', id: string) => {
        const { count, error } = await db.from('tracks').select('id', { count: 'exact', head: true }).eq(column, id)
        if (error) throw error
        return count === 0
    }
    for (const id of new Set(albumIds)) {
        if (!(await isUnused('album_id', id))) continue
        const { error } = await db.from('albums').delete().eq('id', id)
        if (error) throw error
        counts.albums++
    }
    const imported = new Set(await importedProfileIds(db))
    for (const id of new Set(profileIds)) {
        if (!imported.has(id) || !(await isUnused('user_id', id))) continue
        await deleteArtist(db, id)
        counts.artists++
    }
    return counts
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

    album(t: JamendoTrack, profileId: string): Promise<string | null> {
        if (!t.album_id || !t.album_name?.trim()) return Promise.resolve(null)
        const key = `${profileId}:${t.album_id}`
        if (!this.albums.has(key)) this.albums.set(key, this.findOrCreateAlbum(t, profileId))
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
                imported_from: 'jamendo',
                settings: { source: 'jamendo', jamendo_artist_id: jamendoId },
            })
            if (!profileError) return data.user.id

            await this.db.auth.admin.deleteUser(data.user.id)
            lastError = profileError
            if (!isUniqueViolation(profileError)) break
        }
        throw lastError
    }

    private async findOrCreateAlbum(t: JamendoTrack, profileId: string): Promise<string> {
        const title = t.album_name.trim()
        const { data: existing, error: findError } = await this.db.from('albums')
            .select('id')
            .eq('user_id', profileId)
            .eq('title', title)
            .limit(1)
            .maybeSingle()
        if (findError) throw findError
        if (existing) return existing.id

        const { data, error } = await this.db.from('albums')
            .insert({ title, cover_url: trackCoverUrl(t), user_id: profileId, author_id: profileId })
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
        const albumId = await this.album(t, profileId)

        let trackId: string | null = null
        try {
            trackId = await this.insertTrack({ ...trackFields(t), user_id: profileId, album_id: albumId })
            if (!trackId) return false

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
            if (trackId) await deleteTracks(this.db, [trackId]).catch(() => {})
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

function supabaseAdmin(): Db {
    return createClient<Database>(requireEnv('NUXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'), requireEnv('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_KEY'), {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}

async function runImport(clientId: string, opts: ImportOptions) {
    const chart = await fetchChart(clientId, opts)
    console.log(`Jamendo: ${chart.length} importable tracks in positions ${opts.offset + 1}–${opts.offset + opts.limit} by ${opts.order}${opts.tags.length ? `, tags ${opts.tags.join(', ')}` : ''}`)

    if (opts.dryRun) {
        chart.forEach((t, i) => console.log(`${String(i + 1).padStart(4)}. ${describe(t)}`))
        return
    }

    const db = supabaseAdmin()
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

async function runSync(clientId: string, opts: ImportOptions) {
    const db = supabaseAdmin()
    const rows = await importedTracks(db)
    console.log(`Checking ${rows.length} imported tracks against Jamendo…`)

    const live = new Map<string, JamendoTrack>()
    const ids = rows.map(r => String(r.metadata?.jamendo_id))
    for (let i = 0; i < ids.length; i += JAMENDO_PAGE_SIZE) {
        for (const t of await jamendoGet<JamendoTrack>(tracksByIdUrl(clientId, ids.slice(i, i + JAMENDO_PAGE_SIZE)))) {
            if (isImportable(t)) live.set(String(t.id), t)
        }
    }

    const gone = rows.filter(r => !live.has(String(r.metadata?.jamendo_id)))
    // A broken API answer must not wipe the catalog.
    if (gone.length > rows.length / 2 && !opts.yes) {
        throw new Error(`${gone.length} of ${rows.length} tracks look gone from Jamendo; re-run with --yes if that is right`)
    }

    let updated = 0
    for (const row of rows) {
        const t = live.get(String(row.metadata?.jamendo_id))
        const patch = t && trackPatch(row, t)
        if (!patch) continue
        const { error } = await db.from('tracks').update(patch).eq('id', row.id)
        if (error) throw error
        updated++
    }

    await deleteTracks(db, gone.map(r => r.id))
    for (const r of gone) console.log(`- ${r.title} — ${r.metadata?.artist_name ?? '?'} (no longer on Jamendo)`)
    const orphans = await deleteOrphans(db, gone.flatMap(r => r.album_id ?? []), gone.flatMap(r => r.user_id ?? []))

    console.log(`\nDone: ${updated} updated, ${gone.length} removed, ${orphans.albums} empty albums and ${orphans.artists} artists without tracks removed`)
}

async function runPurge(opts: ImportOptions) {
    const db = supabaseAdmin()
    const tracks = await importedTracks(db)
    const profiles = await importedProfileIds(db)
    console.log(`Imported from Jamendo: ${tracks.length} tracks, ${profiles.length} artists (with their albums).`)
    if (!opts.yes) {
        console.log('Nothing deleted. Re-run with --purge --yes to delete them.')
        return
    }

    await deleteTracks(db, tracks.map(t => t.id))
    // Tracks credited to an imported artist but owned by someone else are not ours to delete; keep those artists.
    let artists = 0
    for (const id of profiles) {
        const { count, error } = await db.from('tracks').select('id', { count: 'exact', head: true }).eq('user_id', id)
        if (error) throw error
        if (count) {
            console.warn(`! artist ${id} still owns ${count} tracks that are not from Jamendo, kept`)
            continue
        }
        await db.from('track_authors').delete().eq('profile_id', id)
        await deleteArtist(db, id)
        artists++
    }
    console.log(`\nDone: ${tracks.length} tracks and ${artists} artists deleted`)
}

async function main() {
    let opts: ImportOptions
    try {
        opts = parseImportArgs(process.argv.slice(2))
    } catch (err) {
        console.error(`${(err as Error).message}\n\n${USAGE}`)
        process.exit(2)
    }

    if (opts.purge) return runPurge(opts)
    const clientId = requireEnv('JAMENDO_CLIENT_ID')
    if (opts.sync) return runSync(clientId, opts)
    return runImport(clientId, opts)
}

main().catch((err) => {
    console.error(err?.message ?? err)
    process.exit(1)
})
