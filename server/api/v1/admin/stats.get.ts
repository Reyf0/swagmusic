/**
 * The last `n` calendar days (UTC) ending today, oldest first; days without plays are 0,
 * so the chart shows gaps instead of squeezing active days together.
 */
function lastDays(n: number, rows: { day: string; total_listens: number }[]) {
    const byDay = new Map(rows.map(r => [r.day, Number(r.total_listens)]))
    const today = new Date()
    return Array.from({ length: n }, (_, i) => {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (n - 1 - i)))
        const day = d.toISOString().slice(0, 10)
        return { day, total_listens: byDay.get(day) ?? 0 }
    })
}

/** Admin: totals and plays per day for the dashboard. */
export default defineEventHandler(async (event) => {
    await requireAdmin(event)
    const supabase = useSupabaseAdmin()

    const count = async (table: string) => {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
        if (error) throw createError({ statusCode: 500, statusMessage: error.message })
        return count ?? 0
    }

    const [users, tracks, albums, playlists, plays, daily] = await Promise.all([
        count('profiles'),
        count('tracks'),
        count('albums'),
        count('playlists'),
        count('play_history'),
        supabase.rpc('get_listen_stats_by_day'),
    ])

    return {
        users,
        tracks,
        albums,
        playlists,
        plays,
        playsByDay: lastDays(30, (daily.data ?? []) as { day: string; total_listens: number }[]),
    }
})
