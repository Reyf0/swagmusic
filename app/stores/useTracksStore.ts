import { defineStore } from 'pinia'
import type { Track } from '#shared/types'

type RecentTrack = Track & { last_played: string }

/**
 * Track lists shared across pages: search results, the "new" feed,
 * popular tracks and the user's recently played tracks.
 */
export const useTracksStore = defineStore('tracks', () => {
    const api = useTracksApi()

    const error = ref<string | null>(null)

    // ── search (offset-based) ──
    const items = ref<Track[]>([])
    const loading = ref(false)
    const q = ref<string>('')
    const limit = ref<number>(20)
    const offset = ref<number>(0)
    const hasMore = ref<boolean>(true)
    const searched = ref(false) // a search has completed at least once

    // ── feed (keyset) ──
    const feedItems = ref<Track[]>([])
    const feedLoading = ref(false)
    const feedHasMore = ref(true)
    const feedCursor = ref<{ createdAt: string; id: string } | null>(null)

    // ── popular ──
    const popularItems = ref<Track[]>([])
    const popularLoading = ref(false)

    // ── recently played ──
    const recentItems = ref<RecentTrack[]>([])
    const recentLoading = ref(false)
    const recentHasMore = ref(true)
    const recentCursor = ref<string | null>(null)
    const recentLimit = ref<number>(20)

    async function runSearch(reset = true) {
        loading.value = true
        error.value = null
        if (reset) {
            offset.value = 0
            hasMore.value = true
        }
        const query = q.value.trim()
        const data = await api.searchTracks({ q: query || null, limit: limit.value, offset: offset.value })
        if (api.lastError.value) error.value = api.lastError.value.message
        items.value = reset ? data : items.value.concat(data)
        hasMore.value = data.length >= limit.value
        searched.value = true
        loading.value = false
        return data
    }

    let searchTimer: ReturnType<typeof setTimeout> | null = null

    /** Debounced search with the current `q`. */
    function search(reset = true) {
        if (searchTimer) clearTimeout(searchTimer)
        searchTimer = setTimeout(() => {
            searchTimer = null
            runSearch(reset)
        }, 300)
    }

    async function loadMore() {
        if (loading.value || !hasMore.value) return
        offset.value += limit.value
        await runSearch(false)
    }

    function clearSearch() {
        q.value = ''
        offset.value = 0
        items.value = []
        searched.value = false
        api.cancel('search')
    }

    async function loadFeed(initial = false) {
        if (feedLoading.value && !initial) return
        feedLoading.value = true
        error.value = null
        if (initial) {
            feedCursor.value = null
            feedHasMore.value = true
        }
        const res = await api.getFeed({
            limit: limit.value,
            afterCreatedAt: feedCursor.value?.createdAt ?? null,
            afterId: feedCursor.value?.id ?? null
        })
        if (api.lastError.value) error.value = api.lastError.value.message
        feedItems.value = initial ? res : feedItems.value.concat(res)
        const last = res[res.length - 1]
        if (last?.created_at) feedCursor.value = { createdAt: last.created_at, id: last.id }
        feedHasMore.value = res.length >= limit.value
        feedLoading.value = false
    }

    async function loadPopular(count = 10) {
        popularLoading.value = true
        popularItems.value = await api.getPopular(count)
        popularLoading.value = false
    }

    async function loadRecent(options: { userId: string; limit?: number; reset?: boolean }) {
        const { userId, limit: reqLimit = recentLimit.value, reset = true } = options
        if (!userId || recentLoading.value) return

        recentLoading.value = true
        if (reset) {
            recentCursor.value = null
            recentHasMore.value = true
        }
        const data = await api.getRecentTracksFull({ userId, limit: reqLimit, after: reset ? null : recentCursor.value })
        recentItems.value = reset ? data : recentItems.value.concat(data)
        const last = data[data.length - 1]
        if (last?.last_played) recentCursor.value = last.last_played
        recentHasMore.value = data.length >= reqLimit
        recentLoading.value = false
    }

    function clearRecent() {
        recentItems.value = []
        recentCursor.value = null
        recentHasMore.value = true
        api.cancel('recent')
    }

    const isSearching = computed(() => loading.value && q.value.length > 0)

    return {
        error,
        items, loading, q, limit, offset, hasMore, searched, isSearching,
        search, runSearch, loadMore, clearSearch,
        feedItems, feedLoading, feedHasMore, feedCursor, loadFeed,
        popularItems, popularLoading, loadPopular,
        recentItems, recentLoading, recentHasMore, recentCursor, recentLimit, loadRecent, clearRecent,
        cancelFeed: () => api.cancel('feed'),
        cancelSearch: () => api.cancel('search'),
    }
})
