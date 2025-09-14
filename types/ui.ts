import type { Database } from './database-extended.types'
import { TrackWithAuthors, TrackWithAlbumAndAuthors } from '@/types/extended'

export type Album = Database['public']['Tables']['albums']['Row']
export type AuthorUI = Database['public']['Tables']['profiles']['Row']
export type Track = Database['public']['Tables']['tracks']['Row']

export type TrackUI = {
    id: string
    title: string
    authors: AuthorUI[]
    likes_count: number
    album_id: string | null
    audio_url: string | null
    cover_url: string | null
    created_at: string | null
    user_id: string | null
    duration_seconds: number | null
    is_liked_by_user: boolean | null
}


export type Profile = Database['public']['Tables']['profiles']['Row']
export type Like = Database['public']['Tables']['likes']['Row']
export type PlayHistory = Database['public']['Tables']['play_history']['Row']
export type Playlist = Database['public']['Tables']['playlists']['Row']
export type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row']
export type TrackAuthor = Database['public']['Tables']['track_authors']['Row']

export type TrackWithAuthorsType = TrackWithAuthors
export type TrackWithAlbumAndAuthorsType = TrackWithAlbumAndAuthors

export type RecentTrackItem = {
    track: TrackUI
    last_played: string
    play_count: number
    authors?: any[] // authors from tracks_with_authors view
}