import { describe, expect, it } from 'vitest'
import { artistNames, extractArtists, toTrack, toTracks } from '~/utils/tracks'

const profile = (id: string, username: string) => ({ id, username, slug: null, avatar_url: null })

describe('extractArtists', () => {
    it('reads the track_authors embed, hides pending credits and keeps order', () => {
        const row = {
            track_authors: [
                { order_index: 1, status: 'approved', profile: profile('b', 'Second') },
                { order_index: 2, status: 'pending', profile: profile('c', 'Invited') },
                { order_index: 0, status: 'approved', profile: profile('a', 'First') },
            ],
        }
        expect(extractArtists(row).map(a => a.username)).toEqual(['First', 'Second'])
    })

    it('reads the authors json returned by RPCs / tracks_with_authors', () => {
        const row = {
            authors: [
                { profile_id: 'p1', username: 'Nikita', avatar_url: 'x.jpg', status: 'approved', order_index: 0 },
                { profile_id: 'p2', username: 'Pending', status: 'pending', order_index: 1 },
            ],
        }
        expect(extractArtists(row)).toEqual([{ id: 'p1', username: 'Nikita', slug: null, avatar_url: 'x.jpg' }])
    })

    it('accepts authors serialized as a JSON string and de-duplicates', () => {
        const row = { authors: JSON.stringify([{ id: 'a', username: 'A' }, { id: 'a', username: 'A' }]) }
        expect(extractArtists(row)).toHaveLength(1)
    })

    it('returns [] when there is no author information', () => {
        expect(extractArtists({})).toEqual([])
        expect(extractArtists({ authors: null })).toEqual([])
    })
})

describe('toTrack', () => {
    it('fills defaults and normalizes authors', () => {
        const track = toTrack({ id: 't1', title: 'Song', audio_url: 'a.mp3', authors: [{ id: 'a', username: 'A' }] })
        expect(track).toMatchObject({
            id: 't1',
            title: 'Song',
            audio_url: 'a.mp3',
            cover_url: null,
            likes_count: 0,
            authors: [{ id: 'a', username: 'A' }],
        })
    })

    it('unwraps `{ track: {...} }` rows', () => {
        expect(toTrack({ track: { id: 't2', title: 'Nested' } }).id).toBe('t2')
    })

    it('toTracks skips empty rows', () => {
        expect(toTracks([null, { id: 'x', title: 'X' }, { track: null }])).toHaveLength(1)
    })
})

describe('artistNames', () => {
    it('joins names and falls back when unknown', () => {
        expect(artistNames({ authors: [profile('a', 'A'), profile('b', 'B')] })).toBe('A, B')
        expect(artistNames({ authors: [] })).toBe('Unknown artist')
        expect(artistNames(null, '')).toBe('')
    })
})
