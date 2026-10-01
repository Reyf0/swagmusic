import { describe, expect, it } from 'vitest'
import {
    artistsUrl,
    isImportable,
    parseImportArgs,
    trackGenres,
    trackFields,
    trackMetadata,
    trackPatch,
    tracksByIdUrl,
    tracksUrl,
    usernameCandidates,
    type JamendoTrack,
} from '../../scripts/jamendo'

const track = (overrides: Partial<JamendoTrack> = {}): JamendoTrack => ({
    id: '1001',
    name: 'Test Track',
    duration: 215,
    artist_id: '77',
    artist_name: 'Test Artist',
    album_id: '500',
    album_name: 'Test Album',
    album_image: 'https://usercontent.jamendo.com/?type=album&id=500&width=600',
    image: 'https://usercontent.jamendo.com/?type=album&id=500&width=600',
    audio: 'https://prod-1.storage.jamendo.com/?trackid=1001&format=mp32',
    license_ccurl: 'http://creativecommons.org/licenses/by-sa/3.0/',
    shareurl: 'https://www.jamendo.com/track/1001',
    musicinfo: { tags: { genres: ['rock', 'indie', 'rock'] } },
    ...overrides,
})

describe('parseImportArgs', () => {
    it('has defaults', () => {
        expect(parseImportArgs([])).toEqual({
            limit: 100, offset: 0, order: 'popularity_total', tags: [], concurrency: 4, dryRun: false, sync: false, purge: false, yes: false,
        })
    })

    it('reads options', () => {
        const opts = parseImportArgs(['--limit', '500', '--offset', '200', '--order', 'popularity_month', '--tags', 'rock, electronic', '--dry-run'])
        expect(opts).toMatchObject({ limit: 500, offset: 200, order: 'popularity_month', tags: ['rock', 'electronic'], dryRun: true })
    })

    it('rejects bad input', () => {
        expect(() => parseImportArgs(['--limit', '0'])).toThrow(/--limit/)
        expect(() => parseImportArgs(['--order', 'random'])).toThrow(/--order/)
        expect(() => parseImportArgs(['--unknown'])).toThrow()
        expect(() => parseImportArgs(['--sync', '--purge'])).toThrow(/together/)
    })
})

describe('Jamendo URLs', () => {
    it('asks for a page of the chart with licenses and genres', () => {
        const url = new URL(tracksUrl('abc', { order: 'popularity_total', tags: ['rock', 'pop'] }, 200, 50))
        expect(url.origin + url.pathname).toBe('https://api.jamendo.com/v3.0/tracks/')
        expect(Object.fromEntries(url.searchParams)).toMatchObject({
            client_id: 'abc', limit: '50', offset: '200', order: 'popularity_total', include: 'licenses musicinfo', fuzzytags: 'rock pop',
        })
        expect(url.search).toContain('include=licenses+musicinfo')
    })

    it('asks for specific tracks by id', () => {
        const url = new URL(tracksByIdUrl('abc', ['1', '2']))
        expect(url.searchParams.get('id')).toBe('1 2')
        expect(url.searchParams.get('include')).toBe('licenses musicinfo')
    })

    it('asks for several artists at once', () => {
        expect(new URL(artistsUrl('abc', ['1', '2'])).searchParams.get('id')).toBe('1 2')
    })
})

describe('track mapping', () => {
    it('skips tracks without a stream or a license', () => {
        expect(isImportable(track())).toBe(true)
        expect(isImportable(track({ audio: '' }))).toBe(false)
        expect(isImportable(track({ license_ccurl: '' }))).toBe(false)
        expect(isImportable(track({ name: '  ' }))).toBe(false)
    })

    it('keeps the source, license and original link in metadata', () => {
        expect(trackMetadata(track())).toEqual({
            source: 'jamendo',
            jamendo_id: '1001',
            license_url: 'http://creativecommons.org/licenses/by-sa/3.0/',
            share_url: 'https://www.jamendo.com/track/1001',
            artist_name: 'Test Artist',
        })
    })

    it('turns tags into genre rows without duplicates', () => {
        expect(trackGenres(track())).toEqual([{ name: 'Rock', slug: 'rock' }, { name: 'Indie', slug: 'indie' }])
        expect(trackGenres(track({ musicinfo: undefined }))).toEqual([])
    })
})

describe('usernameCandidates', () => {
    it('tries the artist name first, then numbered variants within 30 characters', () => {
        expect(usernameCandidates('Test Artist', 3)).toEqual(['Test Artist', 'Test Artist 2', 'Test Artist 3'])
        for (const name of usernameCandidates('x'.repeat(40))) expect(name.length).toBeLessThanOrEqual(30)
    })

    it('pads names shorter than 3 characters', () => {
        expect(usernameCandidates('DJ', 1)).toEqual(['DJ music'])
    })
})

describe('trackPatch', () => {
    const row = () => ({ ...trackFields(track()), metadata: { ...trackMetadata(track()), imported_at: 'x' } })

    it('links the cover on Jamendo instead of copying it', () => {
        expect(trackFields(track()).cover_url).toBe('https://usercontent.jamendo.com/?type=album&id=500&width=600')
        expect(trackFields(track({ album_image: '', image: '' })).cover_url).toBeNull()
    })

    it('is null when nothing changed', () => {
        expect(trackPatch(row(), track())).toBeNull()
    })

    it('updates changed columns and merges metadata', () => {
        const patch = trackPatch(row(), track({ name: 'Renamed', license_ccurl: 'http://creativecommons.org/licenses/by/4.0/' }))
        expect(patch).toEqual({
            title: 'Renamed',
            metadata: { ...trackMetadata(track()), imported_at: 'x', license_url: 'http://creativecommons.org/licenses/by/4.0/' },
        })
    })
})
