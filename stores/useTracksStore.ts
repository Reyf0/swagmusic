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
/**
 * Debounce-обёртка для функции `fn`.
 * Возвращает функцию, которая откладывает вызов `fn` на `wait` миллисекунд.
 * Если обёрнутая функция вызывается несколько раз — предыдущий таймаут сбрасывается.
 *
 * Особенности реализации:
 * - Возвращаемая функция всегда возвращает `Promise`, который резолвится значением
 * результата `fn` или `null` в случае ошибки.
 * - Если ранее был создан промис, он не резолвится принудительно при новом вызове;
 * вместо этого создаётся новый промис для нового вызова.
 *
 * @template T
 * @param {(T)} fn - асинхронная или синхронная функция для дебаунса
 * @param {number} [wait=300] - время задержки в миллисекундах
 * @returns {(...args: Parameters<T>) => Promise<ReturnType<T> | null>} debounced function
 *
 * @example
 * const debounced = debounce(async (q: string) => api.search(q), 200)
 * await debounced('hello')
 */
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

    // general cache / items (search results) — can be used as generic cache
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

    // recently played
    const recentItems = ref<Array<any>>([]) // items returned from get_user_recent_tracks_full
    const recentLoading = ref(false)
    const recentHasMore = ref(true)
    const recentCursor = ref<string | null>(null) // timestamptz string for keyset pagination
    const recentLimit = ref<number>(20)

    // Ensure we cancel pending API calls on unmount (or when store is disposed)
    onUnmounted(() => {
        api.cancelAll()
    })

    // internal search using api.searchTracks (api handles abort)
    /**
     * Выполнить внутренний поиск треков через `api.searchTracks`.
     * Эта функция обновляет реактивные переменные состояния поиска (`items`, `offset`, `loading`, `hasMore`, `error`).
     *
     * @param {boolean} [reset=true] - если true, сбрасывает `offset` и `items` перед загрузкой
     * @returns {Promise<any[]>} - массив результатов (массив объектов треков). При ошибке возвращает [] или не бросает ошибку.
     *
     * @sideEffects
     * - loading.value устанавливается в true до завершения и в false в finally
     * - при reset=true: offset.value = 0, items.value = []
     * - items.value заменяется или дополняется в зависимости от reset
     * - hasMore.value = false если получено меньше чем limit.value элементов
     * - error.value заполняется строкой в случае ошибки (кроме AbortError)
     *
     * @example
     * await _doSearch(true) // полная загрузка
     * await _doSearch(false) // подгрузка следующей страницы
     */
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

    /**
     * Триггерить поиск с debounce.
     *
     * @param {boolean} [reset=true] - если true, сбрасывает результаты перед поиском
     * @returns {Promise<any[] | null>} - результат дебаунс-обёртки, либо null при ошибке внутри debounce
     *
     * @example
     * search() // запускает debounced поиск с текущими параметрами q, language и т.д.
     */
    function search(reset = true) {
        // cancel any pending feed requests (optional)
        // api.cancelAll() // не вызываем полностью, чтобы не отменять другие параллельные действия
        debouncedSearch(reset)
    }

    /**
     * Подгрузить следующую страницу поиска (offset-based).
     * Если уже идёт загрузка или hasMore = false — функция ничего не делает.
     *
     * @returns {Promise<void>} - резолвится после завершения загрузки.
     */
    async function loadMore() {
        if (loading.value || !hasMore.value) return
        offset.value += limit.value
        await _doSearch(false)
    }

    /**
     * Загрузчик ленты (feed) с использованием keyset-пагинации.
     *
     * @param {boolean} [initial=false] - если true, очищает feedCursor и feedItems перед загрузкой
     * @returns {Promise<any[]>} - массив загруженных элементов ленты
     *
     * @sideEffects
     * - feedLoading.value управляется во время выполнения
     * - feedItems.value заменяется (initial=true) или дополняется
     * - feedCursor.value обновляется по последнему элементу
     * - feedHasMore.value расчитывается как (res.length >= limit.value)
     * - error.value заполняется в случае ошибки (кроме AbortError)
     */
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

    /**
     * Получить один трек по id (cancellable через api).
     *
     * @param {string} id - идентификатор трека
     * @returns {Promise<any | null>} - объект трека или null при ошибке/отмене
     *
     * @sideEffects
     * - loading.value включает индикатор загрузки на время запроса
     * - selected.value устанавливается в полученный объект при успехе
     * - error.value заполняется при ошибке (кроме AbortError)
     */
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

    /**
     * Очистить параметры поиска и отменить текущий поисковый запрос (если есть).
     *
     * @returns {void}
     */
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
    /**
     * Отменить текущий поисковый запрос.
     */
    function cancelSearch() {
        api.cancelSearch()
    }
    /**
     * Отменить текущий запрос feed.
     */
    function cancelFeed() {
        api.cancelFeed()
    }

    /**
     * Upsert item into items cache (simple id-based upsert)
     *
     * @param {any[]} rows - массив объектов, содержащих как минимум поле `id`
     * @returns {void}
     *
     * @sideEffects
     * - items.value модифицируется: для каждого входного объекта производится merge с существующим
     *
     * @example
     * upsertIntoItemsCache([{ id: '1', title: 'A' }])
     */
    function upsertIntoItemsCache(rows: any[]) {
        if (!rows || rows.length === 0) return
        const map = new Map(items.value.map((it: any) => [it.id, it]))
        for (const r of rows) {
            map.set(r.id, { ...(map.get(r.id) ?? {}), ...r })
        }
        items.value = Array.from(map.values())
    }

    /**
     * Загрузить недавно проигранные треки пользователя и обновить локальные реативные состояния.
     *
     * Поведение:
     * - Если `reset` = true — очищает текущий список и курсор, загружает первые `limit` записей.
     * - Если `reset` = false — подгружает следующую страницу после `recentCursor`.
     * - Если уже идёт загрузка (`recentLoading.value === true`) — функция прерывается и возвращает `undefined`.
     *
     * @param options - параметры загрузки:
     *   - userId: string — id пользователя. Обязательно.
     *   - limit?: number — число записей для загрузки. По умолчанию используется `recentLimit.value`.
     *   - reset?: boolean — сбросить список и курсор перед загрузкой. По умолчанию true.
     *
     * @returns {Promise<Track[] | [] | undefined>} Возвращает промис, который резолвится массивом треков:
     *   - [] — если запрос отменён/ошибка обработана/нет данных;
     *   - массив треков — при успешной загрузке (в том же порядке, в котором возвращает API — ordered by last_played desc);
     *   - undefined — если загрузка не была запущена из-за уже текущей загрузки (`recentLoading`).
     *
     * @throws {Error} Если `userId` не передан — кидает синхронно `Error('userId is required for loadRecent')`.
     *
     * @sideEffects
     * - recentLoading.value изменяется (true во время запроса, false в finally).
     * - recentHasMore.value устанавливается по результату (data.length >= limit).
     * - recentCursor.value обновляется на `last_played` последнего элемента (если есть).
     * - recentItems.value либо заменяется (reset = true), либо дополняется (reset = false).
     * - upsertIntoItemsCache(data) вызывается для мерджа в глобальный кэш.
     * - error.value заполняется строкой при ошибке (кроме AbortError).
     *
     * @example
     * await loadRecent({ userId: 'user-123', limit: 20, reset: true })
     *
     * @see api.getRecentTracksFull — ожидаемый формат возвращаемых объектов (обязательное поле: `last_played`).
     */
    async function loadRecent(options: { userId: string; limit?: number; reset?: boolean } ) {
        const { userId, limit: reqLimit = recentLimit.value, reset = true } = options
        if (!userId) throw new Error('userId is required for loadRecent')
        if (recentLoading.value) return

        recentLoading.value = true
        recentHasMore.value = true
        if (reset) {
            recentCursor.value = null
            recentItems.value = []
        }

        try {
            const after = reset ? null : recentCursor.value
            const data = await api.getRecentTracksFull({ userId, limit: reqLimit, after })
            // data: ordered by last_played desc
            if (!data) {
                // cancelled or error handled in api
                return []
            }
            if (reset) recentItems.value = data
            else recentItems.value = recentItems.value.concat(data)

            // merge into global items cache for reuse
            upsertIntoItemsCache(data)

            // update cursor (last returned last_played)
            const last = data[data.length - 1]
            if (last && last.last_played) {
                recentCursor.value = last.last_played
            }

            // hasMore check
            recentHasMore.value = (data.length ?? 0) >= reqLimit

            return data
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                return []
            }
            error.value = String(err?.message ?? err)
            return []
        } finally {
            recentLoading.value = false
        }
    }

    /**
     * Подгрузить следующую страницу recently-played (если есть).
     *
     * @param {string} userId - идентификатор пользователя
     * @returns {Promise<any[]>} - массив загруженных элементов или [] если не было подгрузки
     */
    async function loadMoreRecent(userId: string) {
        if (!recentHasMore.value || recentLoading.value) return []
        return loadRecent({ userId, limit: recentLimit.value, reset: false })
    }

    /**
     * Очистить состояние recently-played и отменить текущий запрос (если есть).
     */
    function clearRecent() {
        recentItems.value = []
        recentCursor.value = null
        recentHasMore.value = true
        api.cancelRecent()
    }

    /**
     * Отменить текущий запрос recently-played.
     */
    function cancelRecent() {
        api.cancelRecent()
    }

    const totalLoaded = computed(() => items.value.length)
    const isSearching = computed(() => loading.value && q.value.length > 0)

    return {
        // general
        items, loading, error, q, language, genreIds, limit, offset, hasMore,
        feedItems, feedLoading, feedHasMore, feedCursor,
        selected,

        // actions: search/feed/single
        search, loadMore, loadFeed, fetchTrack, clearSearch,
        cancelFeed, cancelSearch,

        // recently played
        recentItems, recentLoading, recentHasMore, recentCursor, recentLimit,
        loadRecent, loadMoreRecent, clearRecent, cancelRecent,

        // helpers
        totalLoaded, isSearching
    }
})
