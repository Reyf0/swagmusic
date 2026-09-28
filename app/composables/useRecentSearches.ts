const KEY = 'swagmusic:recent-searches'
const MAX = 6

function read(): string[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
        return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === 'string').slice(0, MAX) : []
    } catch {
        return []
    }
}

function write(list: string[]) {
    try {
        localStorage.setItem(KEY, JSON.stringify(list))
    } catch {
        // storage unavailable (private mode, blocked): recent searches just aren't kept
    }
}

/** The viewer's last search queries, newest first. Kept only in this browser. */
export function useRecentSearches() {
    const recent = useState<string[]>('recent-searches', () => [])

    if (import.meta.client) onMounted(() => { recent.value = read() })

    function add(query: string) {
        const q = query.trim()
        if (!q) return
        recent.value = [q, ...recent.value.filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX)
        write(recent.value)
    }

    function remove(query: string) {
        recent.value = recent.value.filter(x => x !== query)
        write(recent.value)
    }

    function clear() {
        recent.value = []
        write([])
    }

    return { recent, add, remove, clear }
}
