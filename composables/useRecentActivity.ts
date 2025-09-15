import { ref } from 'vue'
import { useTracksStore } from '@/stores/useTracksStore'
import { useAuthorsApi } from '@/composables/useAuthorsApi'
import { usePlaylistsApi } from '@/composables/usePlaylistsApi'
import type { AuthorRecentRow } from '@/composables/useAuthorsApi'
import type { RecentPlaylistRow } from '@/composables/usePlaylistsApi'
import type { Database, TrackUI, Playlist } from '@/types'

/**
 * useRecentActivity
 * Оркестратор для страницы «Недавно слушали»:
 * - делегирует треки в tracksStore (loadRecent)
 * - получает recent authors и recent playlists через domain APIs
 * - батчево подгружает детали плейлистов и возвращает структурированный результат
 *
 * Возвращает: { tracks, authors, playlists } — удобно для компонентов
 *
 * Порядок вызовов:
 *  1) tracksStore.loadRecent(...) -> tracksStore.recentItems
 *  2) authorsApi.getRecentAuthors(...)
 *  3) playlistsApi.getRecentPlaylists(...) -> playlistsApi.getPlaylistsByIds(...)
 *
 * Отмена: tracksStore.cancelRecent() + api.cancel...
 */

export type RecentTrackItem = TrackUI & {
    last_played?: string
    play_count?: number
}

export const useRecentActivity = () => {
    const user = useSupabaseUser()
    const tracksStore = useTracksStore()
    const authorsApi = useAuthorsApi()
    const playlistsApi = usePlaylistsApi()

    const loading = ref(false)
    const error = ref<string | null>(null)

    /**
     * loadAll — загружает всё сразу.
     * options: { tracksLimit, authorsLimit, playlistsLimit }
     */
    async function loadAll(options?: { tracksLimit?: number; authorsLimit?: number; playlistsLimit?: number }) {
        // cancel previous in-flight requests
        cancel()

        if (!user.value?.id) {
            // неавторизованный — возвращаем пустые массивы
            return { tracks: [], authors: [], playlists: [] }
        }

        loading.value = true
        error.value = null

        const tracksLimit = options?.tracksLimit ?? 20
        const authorsLimit = options?.authorsLimit ?? 10
        const playlistsLimit = options?.playlistsLimit ?? 10

        try {
            // 1) треки — делегируем в tracksStore (get_user_recent_tracks_full + merge в кэш)
            await tracksStore.loadRecent({ userId: user.value.id, limit: tracksLimit, reset: true })
            const tracksResult = tracksStore.recentItems as RecentTrackItem[] // recentItems содержит last_played, play_count и authors

            // 2) недавние авторы
            const authors = await authorsApi.getRecentAuthors({ userId: user.value.id, limit: authorsLimit }) as AuthorRecentRow[]

            // 3) недавние плейлисты -> затем детали
            const recentPlaylistsRows = await playlistsApi.getRecentPlaylists({ userId: user.value.id, limit: playlistsLimit }) as RecentPlaylistRow[]
            let playlists: Array<{ playlist: Playlist | { id: string }; last_played: string; plays: number }> = []

            if (recentPlaylistsRows && recentPlaylistsRows.length > 0) {
                const ids = recentPlaylistsRows.map(r => r.playlist_id)
                const details = await playlistsApi.getPlaylistsByIds(ids)
                const map = new Map<string, any>()
                ;(details ?? []).forEach((p: any) => map.set(p.id, p))

                playlists = recentPlaylistsRows.map(r => ({
                    playlist: map.get(r.playlist_id) ?? { id: r.playlist_id },
                    last_played: r.last_played,
                    plays: r.plays
                }))
            }

            return {
                tracks: tracksResult ?? [],
                authors: authors ?? [],
                playlists
            }
        } catch (err: any) {
            // если отмена — апи/стор возвращают пустые массивы или бросают AbortError, здесь ловим общие ошибки
            console.error('useRecentActivity.loadAll error', err)
            if (err?.name === 'AbortError') {
                // отменено — не считаем это ошибкой
                return { tracks: tracksStore.recentItems ?? [], authors: [], playlists: [] }
            }
            error.value = String(err?.message ?? err)
            return { tracks: tracksStore.recentItems ?? [], authors: [], playlists: [] }
        } finally {
            loading.value = false
        }
    }

    function cancel() {
        // cancel tracks request
        tracksStore.cancelRecent()
        // cancel authors/playlists requests
        authorsApi.cancelRecentAuthors()
        authorsApi.cancelAuthorsByIds()
        playlistsApi.cancelRecentPlaylists()
        playlistsApi.cancelPlaylistsByIds()
    }

    return {
        loading, error, loadAll, cancel
    }
}