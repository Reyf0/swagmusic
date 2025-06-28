import type { Tables } from './database.types'

export type AlbumWithTracks = Tables<'albums'> & {
    tracks: Tables<'tracks'>[]
}

export type TrackWithAuthors = Tables<'tracks'> & {
    track_authors: {
        author: Tables<'authors'>
    }[]
}

export type UserWithProfile = {
    id: string
    email: string | null
    user_metadata?: {
        username?: string
        [key: string]: any
    }
    profile: Tables<'profiles'> | null
}

export type TrackWithAlbumAndAuthors = Tables<'tracks'> & {
    album: Tables<'albums'> | null
    track_authors: {
        author: Tables<'authors'>
    }[]
}
