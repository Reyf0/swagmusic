import * as z from 'zod'

/** Admin: delete a track / album / playlist (and its dependent rows and storage files). */
export default defineEventHandler(async (event) => {
    await requireAdmin(event)
    const resource = getAdminResource(event)
    const id = getRouterParam(event, 'id')
    if (!id || !z.string().uuid().safeParse(id).success) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

    const supabase = useSupabaseAdmin()
    const files = ADMIN_RESOURCES[resource].files as Record<string, string>
    const fileColumns = Object.keys(files)

    let row: Record<string, unknown> | null = null
    if (fileColumns.length) {
        const { data } = await supabase.from(resource).select(fileColumns.join(',')).eq('id', id).maybeSingle()
        row = data as Record<string, unknown> | null
    }

    // dependent rows without ON DELETE CASCADE guarantees
    if (resource === 'tracks') {
        await supabase.from('playlist_tracks').delete().eq('track_id', id)
        await supabase.from('track_authors').delete().eq('track_id', id)
        await supabase.from('likes').delete().match({ target_id: id, target_type: 'track' })
    } else if (resource === 'albums') {
        await supabase.from('tracks').update({ album_id: null }).eq('album_id', id)
    } else if (resource === 'playlists') {
        await supabase.from('playlist_tracks').delete().eq('playlist_id', id)
    }

    const { error } = await supabase.from(resource).delete().eq('id', id)
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })

    for (const [column, bucket] of Object.entries(files)) {
        const path = storagePathFromUrl(bucket, row?.[column])
        if (path) await supabase.storage.from(bucket).remove([path])
    }

    return { success: true }
})
