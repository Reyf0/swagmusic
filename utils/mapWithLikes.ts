import type {Track, TrackUI} from "@/types/global";

function mapWithLikes(tracks: Track[], likedIds: []): (Track & { is_liked_by_user: boolean })[];
function mapWithLikes(tracks: TrackUI[], likedIds: []): TrackUI[];
function mapWithLikes(tracks: unknown[], likedIds: unknown[]) {
    return tracks.map(track => ({
        ...track,
        is_liked_by_user: likedIds.includes(track.id)
    }))

}

export default mapWithLikes;