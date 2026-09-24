import type { Tables } from './generated/database.types'

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './generated/database.types'

export type Album = Tables<'albums'>
export type Profile = Tables<'profiles'>
export type Like = Tables<'likes'>
export type PlayHistory = Tables<'play_history'>
export type Playlist = Tables<'playlists'>
export type PlaylistTrack = Tables<'playlist_tracks'>
export type TrackRow = Tables<'tracks'>
export type TrackAuthorRow = Tables<'track_authors'>

/** A profile credited as an author of a track. */
export interface TrackArtist {
    id: string
    username: string | null
    slug: string | null
    avatar_url: string | null
}

/**
 * Normalized track used everywhere in the UI (lists, cards, player, queue).
 * Build it from any DB row / RPC result with `toTrack()` (app/utils/tracks.ts).
 */
export interface Track {
    id: string
    title: string
    audio_url: string | null
    cover_url: string | null
    duration_seconds: number | null
    album_id: string | null
    user_id: string | null
    created_at: string | null
    likes_count: number
    slug?: string | null
    lyrics?: string | null
    authors: TrackArtist[]
    is_liked_by_user?: boolean
}
