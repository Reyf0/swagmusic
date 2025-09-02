import type { Database } from './database-extended.types'
import type { TrackWithAuthors, TrackWithAlbumAndAuthors } from './extended'
import "@supabase/postgrest-js";

declare module '@supabase/postgrest-js' {
  interface PostgrestFilterBuilder<T> extends PromiseLike<{ data: T; error: any }> {
    /** @internal */
    __promiseBrand?: never;
  }
}

type Album = Database['public']['Tables']['albums']['Row']
type AuthorUI = Database['public']['Tables']['profiles']['Row']
type Track = Database['public']['Tables']['tracks']['Row'] & {
  track_authors: {
    author: Database['public']['Tables']['authors']['Row']
  }[]
}
type TrackUI = {
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
type Profile = Database['public']['Tables']['profiles']['Row']
type Like = Database['public']['Tables']['likes']['Row']
type PlayHistory = Database['public']['Tables']['play_history']['Row']
type Playlist = Database['public']['Tables']['playlists']['Row']
type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row']
type TrackAuthor = Database['public']['Tables']['track_authors']['Row']


export { Album, Track, TrackUI, Profile, Author, Like, PlayHistory, Playlist, PlaylistTrack, TrackAuthor, TrackWithAuthors, TrackWithAlbumAndAuthors, Database }
