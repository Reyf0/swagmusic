import { describe, it, expect, vi } from 'vitest'

    vi.mock('@supabase/auth-helpers-vue', () => ({
      useSupabaseClient: () => ({}),
      useSupabaseUser: () => ({ value: null }),
    }))

    import { Track, TrackUI } from '../../types/global'
    import { useLikes } from '../../composables/useLikes'

    describe('getTracksWithLikeFlag', () => {
      const { getTracksWithLikeFlag } = useLikes()

      it('добавляет флаг is_liked_by_user для Track', () => {
        const tracks: Track[] = [
          { id: '1', name: 'A' } as Track,
          { id: '2', name: 'B' } as Track,
        ]
        const likedIds = ['2']
        const result = getTracksWithLikeFlag(tracks, likedIds)
        expect(result).toEqual([
          { id: '1', name: 'A', is_liked_by_user: false },
          { id: '2', name: 'B', is_liked_by_user: true },
        ])
      })

      it('возвращает TrackUI без изменений', () => {
        const tracksUI: TrackUI[] = [
          { id: '1', name: 'A', is_liked_by_user: true },
          { id: '2', name: 'B', is_liked_by_user: false },
        ]
        const likedIds = ['1']
        const result = getTracksWithLikeFlag(tracksUI, likedIds)
        expect(result).toEqual(tracksUI)
      })
    })