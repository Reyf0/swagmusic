import type { Playlist, Track } from '#shared/types'

export type PlaylistWithMeta = Playlist & {
    track_count: number
    owner: { id: string; username: string | null; avatar_url: string | null } | null
}

const PLAYLIST_SELECT = '*, playlist_tracks(count), owner:profiles!playlists_user_id_fkey(id, username, avatar_url)'

function withMeta(row: any): PlaylistWithMeta {
    const { playlist_tracks, ...rest } = row
    return { ...rest, track_count: playlist_tracks?.[0]?.count ?? 0, owner: row.owner ?? null }
}

/** Playlist queries and mutations. Mutations throw on failure. */
export const usePlaylistsApi = () => {
    const supabase = useSupabase()

    async function getUserPlaylists(userId: string): Promise<PlaylistWithMeta[]> {
        const { data, error } = await supabase
            .from('playlists')
            .select(PLAYLIST_SELECT)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return (data ?? []).map(withMeta)
    }

    async function getPlaylist(id: string): Promise<PlaylistWithMeta | null> {
        const { data, error } = await supabase
            .from('playlists')
            .select(PLAYLIST_SELECT)
            .eq('id', id)
            .maybeSingle()
        if (error) throw error
        return data ? withMeta(data) : null
    }

    /** Tracks of a playlist in playlist order. */
    async function getPlaylistTracks(playlistId: string): Promise<(Track & { position: number; added_at: string | null })[]> {
        const { data, error } = await supabase
            .from('playlist_tracks')
            .select(`position, added_at, track:tracks(${TRACK_SELECT})`)
            .eq('playlist_id', playlistId)
            .order('position', { ascending: true })
        if (error) throw error
        return (data ?? [])
            .filter((row: any) => row.track)
            .map((row: any) => ({ ...toTrack(row.track), position: row.position, added_at: row.added_at }))
    }

    async function createPlaylist(params: { name: string; description?: string; userId: string }) {
        const { data, error } = await supabase
            .from('playlists')
            .insert({ name: params.name, description: params.description || null, user_id: params.userId })
            .select(PLAYLIST_SELECT)
            .single()
        if (error) throw error
        return withMeta(data)
    }

    async function updatePlaylist(id: string, patch: { name?: string; description?: string | null; cover_url?: string | null }) {
        const { data, error } = await supabase
            .from('playlists')
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select(PLAYLIST_SELECT)
            .single()
        if (error) throw error
        return withMeta(data)
    }

    async function deletePlaylist(id: string) {
        const { error: tracksError } = await supabase.from('playlist_tracks').delete().eq('playlist_id', id)
        if (tracksError) throw tracksError
        const { error } = await supabase.from('playlists').delete().eq('id', id)
        if (error) throw error
    }

    /** Appends a track. Returns false if it was already in the playlist. */
    async function addTrack(playlistId: string, trackId: string) {
        const { data: existing, error: readError } = await supabase
            .from('playlist_tracks')
            .select('track_id, position')
            .eq('playlist_id', playlistId)
            .order('position', { ascending: false })
        if (readError) throw readError
        if (existing?.some(r => r.track_id === trackId)) return false

        const position = (existing?.[0]?.position ?? -1) + 1
        const { error } = await supabase.from('playlist_tracks').insert({ playlist_id: playlistId, track_id: trackId, position })
        if (error) throw error
        await supabase.from('playlists').update({ updated_at: new Date().toISOString() }).eq('id', playlistId)
        return true
    }

    async function removeTrack(playlistId: string, trackId: string) {
        const { error } = await supabase.from('playlist_tracks').delete().match({ playlist_id: playlistId, track_id: trackId })
        if (error) throw error
    }

    return { getUserPlaylists, getPlaylist, getPlaylistTracks, createPlaylist, updatePlaylist, deletePlaylist, addTrack, removeTrack }
}
