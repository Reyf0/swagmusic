import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Track } from '#shared/types'

// No network in unit tests: the store only records listens through this client.
mockNuxtImport('useSupabase', () => () => ({ from: () => ({ insert: async () => ({ error: null }) }) }))

// Minimal Howl stand-in: play() fires onplay synchronously; tests trigger onend by hand.
const howls: FakeHowl[] = []
class FakeHowl {
    opts: Record<string, any>
    constructor(opts: Record<string, any>) {
        this.opts = opts
        howls.push(this)
    }

    play() { this.opts.onplay?.() }
    pause() { this.opts.onpause?.() }
    stop() { this.opts.onstop?.() }
    seek(pos?: number) { return pos ?? 0 }
    volume() {}
    duration() { return 100 }
    once() {}
    off() {}
    unload() {}
    end() { this.opts.onend?.() }
}

vi.mock('howler', () => ({ Howl: FakeHowl }))

const { usePlayerStore, audioFormat } = await import('~/stores/player')
const { usePlayTrack } = await import('~/composables/usePlayTrack')

const track = (id: string): Track => ({
    id,
    title: `Track ${id}`,
    audio_url: `https://example.com/${id}.mp3`,
    cover_url: null,
    duration_seconds: 100,
    album_id: null,
    user_id: null,
    created_at: null,
    likes_count: 0,
    authors: [],
})

const list = ['a', 'b', 'c'].map(track)
const current = () => usePlayerStore().currentTrack?.id

describe('player store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        howls.length = 0
    })

    it('plays a track from a list and uses the list as the queue', () => {
        const player = usePlayerStore()
        player.play(list[1]!, list)
        expect(current()).toBe('b')
        expect(player.queue.map(t => t.id)).toEqual(['a', 'b', 'c'])
        expect(player.isPlaying).toBe(true)
    })

    it('plays a single track when no list is given', () => {
        const player = usePlayerStore()
        player.play(track('solo'))
        expect(player.queue.map(t => t.id)).toEqual(['solo'])
    })

    it('advances on end and stops at the end of the queue when repeat is off', () => {
        const player = usePlayerStore()
        player.play(list[1]!, list)
        howls.at(-1)!.end()
        expect(current()).toBe('c')
        howls.at(-1)!.end()
        expect(current()).toBe('c')
        expect(player.isPlaying).toBe(false)
    })

    it('wraps around when repeat is "all"', () => {
        const player = usePlayerStore()
        player.cycleRepeat() // off → all
        expect(player.repeatMode).toBe('all')
        player.play(list[2]!, list)
        howls.at(-1)!.end()
        expect(current()).toBe('a')
    })

    it('repeats the same track when repeat is "one"', () => {
        const player = usePlayerStore()
        player.cycleRepeat()
        player.cycleRepeat() // → one
        player.play(list[0]!, list)
        const howlCount = howls.length
        howls.at(-1)!.end()
        expect(current()).toBe('a')
        expect(howls.length).toBe(howlCount) // same sound restarted, not reloaded
    })

    it('next button wraps even with repeat off; previous restarts after 3s', () => {
        const player = usePlayerStore()
        player.play(list[2]!, list)
        player.playNext()
        expect(current()).toBe('a')

        player.currentTime = 10
        player.playPrevious()
        expect(current()).toBe('a')
        expect(player.currentTime).toBe(0)

        player.playPrevious()
        expect(current()).toBe('c')
    })

    it('shuffle never repeats the current track', () => {
        const player = usePlayerStore()
        player.toggleShuffle()
        player.play(list[0]!, list)
        for (let i = 0; i < 10; i++) {
            const before = current()
            player.playNext()
            expect(current()).not.toBe(before)
        }
    })

    it('queue editing: play next, add to queue, remove', () => {
        const player = usePlayerStore()
        player.play(list[0]!, list)
        player.playNextInQueue(track('x'))
        player.addToQueue(track('y'))
        expect(player.queue.map(t => t.id)).toEqual(['a', 'x', 'b', 'c', 'y'])

        player.removeFromQueue(0) // current track cannot be removed
        player.removeFromQueue(2)
        expect(player.queue.map(t => t.id)).toEqual(['a', 'x', 'c', 'y'])

        player.playNext()
        expect(current()).toBe('x')
    })

    it('clamps volume', () => {
        const player = usePlayerStore()
        player.setVolume(2)
        expect(player.volume).toBe(1)
        player.setVolume(-1)
        expect(player.volume).toBe(0)
    })
})

describe('audioFormat', () => {
    it('uses the file extension when there is one', () => {
        expect(audioFormat('https://x.supabase.co/storage/v1/object/public/tracks/u/a.ogg')).toBe('ogg')
        expect(audioFormat('https://x.supabase.co/a.FLAC?v=1')).toBe('flac')
    })
    it('falls back to mp3 for extension-less uploads', () => {
        expect(audioFormat('https://x.supabase.co/storage/v1/object/public/tracks/1756659047987_hdmi_')).toBe('mp3')
        expect(audioFormat('https://x.supabase.co/tracks/1758098623929_kissing%20the%20shadows_')).toBe('mp3')
    })
})

describe('usePlayTrack: play-all button', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        howls.length = 0
    })

    it('shows the list as playing once started from it, and toggles pause', () => {
        const { playList, isListPlaying } = usePlayTrack()
        expect(isListPlaying(list)).toBe(false)
        playList(list)
        expect(current()).toBe('a')
        expect(isListPlaying(list)).toBe(true)
        playList(list) // same button again pauses
        expect(isListPlaying(list)).toBe(false)
        expect(current()).toBe('a')
    })

    it('stays active for the list when a row further down is played', () => {
        const { playTrack, isListPlaying } = usePlayTrack()
        playTrack(list[2]!, list)
        expect(isListPlaying(list)).toBe(true)
    })

    it('is not active for another list, and starts it from the top', () => {
        const other = ['x', 'y'].map(track)
        const { playTrack, playList, isListPlaying } = usePlayTrack()
        playTrack(list[0]!, list)
        expect(isListPlaying(other)).toBe(false)
        playList(other)
        expect(current()).toBe('x')
        expect(isListPlaying(list)).toBe(false)
    })
})
