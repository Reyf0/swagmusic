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
        playsByDay: ((daily.data ?? []) as { day: string; total_listens: number }[]).slice(-30),
    }
})
