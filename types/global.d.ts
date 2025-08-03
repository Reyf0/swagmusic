import type { Database } from './database-extended.types'
import type { TrackWithAuthors, TrackWithAlbumAndAuthors } from './extended'

type Album = Database['public']['Tables']['albums']['Row']
type Track = Database['public']['Tables']['tracks']['Row'] & {
  track_authors: {
    author: Database['public']['Tables']['authors']['Row']
  }[]
}
type Profile = Database['public']['Tables']['profiles']['Row']
type Author = Database['public']['Tables']['authors']['Row']
type Like = Database['public']['Tables']['likes']['Row']
type PlayHistory = Database['public']['Tables']['play_history']['Row']
type Playlist = Database['public']['Tables']['playlists']['Row']
type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row']
type TrackAuthor = Database['public']['Tables']['track_authors']['Row']

export { Album, Track, Profile, Author, Like, PlayHistory, Playlist, PlaylistTrack, TrackAuthor, TrackWithAuthors, TrackWithAlbumAndAuthors }
