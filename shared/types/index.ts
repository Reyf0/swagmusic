import type { Database, Json, Tables } from './generated/database.types'

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './generated/database.types'

/**
 * Row type with jsonb columns typed as `unknown`. The recursive `Json` type makes Vue's
 * UnwrapRef blow up ("type instantiation is excessively deep") when rows are kept in refs.
 */
export type Row<T extends keyof Database['public']['Tables']> = {
    [K in keyof Tables<T>]: Json extends Tables<T>[K] ? unknown : Tables<T>[K]
}

export type Album = Row<'albums'>
export type Profile = Row<'profiles'>
export type Like = Row<'likes'>
export type PlayHistory = Row<'play_history'>
export type Playlist = Row<'playlists'>
export type PlaylistTrack = Row<'playlist_tracks'>
export type TrackRow = Row<'tracks'>
export type TrackAuthorRow = Row<'track_authors'>

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
