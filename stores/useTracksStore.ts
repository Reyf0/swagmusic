import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTracksApi } from '@/composables/useTracksApi'

/**
 * Простая реализация store для поиска и feed:
 * - поддерживает debounce для поиска
 * - поддерживает loadMore для offset-based поиска
 * - поддерживает keyset feed (loadFeed)
 * - кеширование базовое (в памяти)
 */

// Простой debounce (возвращает функцию, которая возвращает промис)
function debounce<T extends (...args: any[]) => any>(fn: T, wait = 300) {
    let t: ReturnType<typeof setTimeout> | null = null
    let lastPromiseResolve: ((value: any) => void) | null = null
    return (...args: Parameters<T>) => {
        if (t) clearTimeout(t)
        if (lastPromiseResolve) {
            // предыдущий debounced promise — мы не резолвим его, потому вернём новый промис
            lastPromiseResolve = null
        }
        return new Promise((resolve) => {
            lastPromiseResolve = resolve
            t = setTimeout(async () => {
                try {
                    // @ts-ignore
                    const r = await fn(...args)
                    resolve(r)
                } catch (e) {
                    resolve(null)
                } finally {
                    t = null
                    lastPromiseResolve = null
                }
            }, wait)
        })
    }
}

export const useTracksStore = defineStore('tracks', () => {
    const api = useTracksApi()

    // state
    const items = ref<Array<any>>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // search params
    const q = ref<string>('')
    const language = ref<string | null>(null)
    const genreIds = ref<string[] | null>(null)
    const limit = ref<number>(20)
    const offset = ref<number>(0)
    const hasMore = ref<boolean>(true)

    // feed state (keyset)
    const feedItems = ref<Array<any>>([])
    const feedLoading = ref(false)
    const feedHasMore = ref(true)
    const feedCursor = ref<{ createdAt: string; id: string } | null>(null)

    // selected track
    const selected = ref<any | null>(null)

    // Ensure we cancel pending API calls on unmount (or when store is disposed)
    onUnmounted(() => {
        api.cancelAll()
    })

    // internal search using api.searchTracks (api handles abort)
    const _doSearch = async (reset = true) => {
        loading.value = true
        error.value = null
        try {
            if (reset) {
                offset.value = 0
                items.value = []
                hasMore.value = true
            }
            const data = await api.searchTracks({
                q: q.value || null,
                language: language.value,
                genreIds: genreIds.value,
                limit: limit.value,
                offset: offset.value
            })
            if (reset) items.value = data
            else items.value = items.value.concat(data)
            if ((data?.length ?? 0) < limit.value) hasMore.value = false
        } catch (e: any) {
            // если это abort — api возвращает [] и не бросает, но на всякий случай:
            if (e?.name === 'AbortError') {
                // ignore
            } else {
                error.value = String(e?.message ?? e)
            }
        } finally {
            loading.value = false
        }
    }

    const debouncedSearch = debounce(_doSearch, 300)

    function search(reset = true) {
        // cancel any pending feed requests (optional)
        // api.cancelAll() // не вызываем полностью, чтобы не отменять другие параллельные действия
        debouncedSearch(reset)
    }

    async function loadMore() {
        if (loading.value || !hasMore.value) return
        offset.value += limit.value
        await _doSearch(false)
    }

    // feed loader (keyset) — api.getFeed уже поддерживает abort
    async function loadFeed(initial = false) {
        feedLoading.value = true
        feedHasMore.value = true
        try {
            if (initial) {
                feedCursor.value = null
                feedItems.value = []
            }
            const res = await api.getFeed({
                limit: limit.value,
                afterCreatedAt: feedCursor.value?.createdAt ?? null,
                afterId: feedCursor.value?.id ?? null
            })
            if (initial) feedItems.value = res
            else feedItems.value = feedItems.value.concat(res)
            const last = res[res.length - 1]
            if (last) {
                feedCursor.value = { createdAt: last.created_at ?? last.createdAt, id: last.id }
            }
            feedHasMore.value = (res.length ?? 0) >= limit.value
        } catch (e: any) {
            if (e?.name === 'AbortError') {
                // ignore
            } else {
                error.value = String(e?.message ?? e)
            }
        } finally {
            feedLoading.value = false
        }
    }

    // fetch a single track (cancellable)
    async function fetchTrack(id: string) {
        try {
            loading.value = true
            const t = await api.getTrackById(id)
            selected.value = t
            return t
        } catch (e: any) {
            if (e?.name === 'AbortError') {
                // ignore
                return null
            }
            error.value = String(e?.message ?? e)
            return null
        } finally {
            loading.value = false
        }
    }


    function clearSearch() {
        q.value = ''
        language.value = null
        genreIds.value = null
        offset.value = 0
        items.value = []
        // Cancel pending search request if any
        api.cancelSearch()
    }

    // PUBLIC fine-grained cancel methods
    function cancelSearch() {
        api.cancelSearch()
    }
    function cancelFeed() {
        api.cancelFeed()
    }

    const totalLoaded = computed(() => items.value.length)
    const isSearching = computed(() => loading.value && q.value.length > 0)

    return {
        items, loading, error, q, language, genreIds, limit, offset, hasMore,
        feedItems, feedLoading, feedHasMore, feedCursor,
        selected,

        search, loadMore, loadFeed, fetchTrack, clearSearch,

        totalLoaded, isSearching
    }
})
