import { defineStore } from 'pinia'
import type { Album, Track } from '#shared/types'

/** A credit on one of my tracks, as shown in the track's co-author list. */
export type Credit = {
    id: number
    profile_id: string
    status: string
    order_index: number | null
    profile: { id: string; username: string | null; avatar_url: string | null } | null
}

export type Invite = {
    id: number
    track_id: string
    invited_at: string | null
    invited_by: { id: string; username: string | null } | null
    track: { id: string; title: string; cover_url: string | null } | null
}

/**
 * Creator dashboard data for the signed-in user: own tracks, own albums and
 * pending co-author invites (track_authors rows with status = 'pending').
 */
export const useStudioStore = defineStore('studio', () => {
    const supabase = useSupabase()
    const user = useSupabaseUser()

    const tracks = ref<Track[]>([])
    const albums = ref<Album[]>([])
    const invites = ref<Invite[]>([])
    const loading = ref(false)

    const pendingInviteCount = computed(() => invites.value.length)

    function requireUserId() {
        const id = user.value?.id
        if (!id) throw new Error('Not signed in')
        return id
    }

    async function loadInvites() {
        const uid = user.value?.id
        if (!uid) {
            invites.value = []
            return
        }
        const { data, error } = await supabase
            .from('track_authors')
            .select('id, track_id, invited_at, invited_by:profiles!track_authors_invited_by_fkey(id, username), track:tracks(id, title, cover_url)')
            .eq('profile_id', uid)
            .eq('status', CREDIT_STATUS.pending)
            .order('invited_at', { ascending: false })
        if (error) {
            console.error('Failed to load invites', error)
            return
        }
        invites.value = (data ?? []) as unknown as Invite[]
    }

    /** Tracks I uploaded or am a credited author of. */
    async function loadTracks() {
        const uid = requireUserId()
        const { data: credits, error: creditsError } = await supabase
            .from('track_authors')
            .select('track_id')
            .eq('profile_id', uid)
            .in('status', CREDITED_STATUSES)
        if (creditsError) throw creditsError

        const ids = (credits ?? []).map(c => c.track_id)
        const filter = ids.length ? `user_id.eq.${uid},id.in.(${ids.join(',')})` : `user_id.eq.${uid}`
        const { data, error } = await supabase
            .from('tracks')
            .select(`${TRACK_SELECT}, lyrics`)
            .or(filter)
            .order('created_at', { ascending: false })
        if (error) throw error
        tracks.value = toTracks(data)
    }

    async function loadAlbums() {
        const uid = requireUserId()
        const { data, error } = await supabase
            .from('albums')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
        if (error) throw error
        albums.value = data ?? []
    }

    async function loadAll() {
        loading.value = true
        try {
            await Promise.all([loadTracks(), loadAlbums(), loadInvites()])
        } finally {
            loading.value = false
        }
    }

    async function respondToInvite(inviteId: number, accept: boolean) {
        const { error } = await supabase
            .from('track_authors')
            .update({ status: accept ? CREDIT_STATUS.accepted : CREDIT_STATUS.rejected, responded_at: new Date().toISOString() })
            .eq('id', inviteId)
            .eq('profile_id', requireUserId())
        if (error) throw error
        invites.value = invites.value.filter(i => i.id !== inviteId)
        if (accept) await loadTracks()
    }

    /** All credits of a track I own, including pending and rejected invites. */
    async function loadCredits(trackId: string): Promise<Credit[]> {
        const { data, error } = await supabase
            .from('track_authors')
            .select('id, profile_id, status, order_index, profile:profiles!track_authors_profile_id_fkey(id, username, avatar_url)')
            .eq('track_id', trackId)
            .order('order_index', { ascending: true })
        if (error) throw error
        return (data ?? []) as unknown as Credit[]
    }

    /** Invites co-authors to a track I own; they are credited once they accept in their Studio. */
    async function inviteCoAuthors(trackId: string, profileIds: string[], nextOrderIndex: number) {
        const uid = requireUserId()
        if (!profileIds.length) return
        const now = new Date().toISOString()
        const { error } = await supabase.from('track_authors').insert(profileIds.map((profileId, i) => ({
            track_id: trackId,
            profile_id: profileId,
            status: CREDIT_STATUS.pending,
            invited_by: uid,
            invited_at: now,
            order_index: nextOrderIndex + i,
        })))
        if (error) throw error
    }

    /** Cancels an invite or removes a co-author from a track I own. */
    async function removeCredit(creditId: number) {
        const { error } = await supabase.from('track_authors').delete().eq('id', creditId)
        if (error) throw error
        await loadTracks()
    }

    async function updateTrack(id: string, patch: { title?: string; cover_url?: string | null; lyrics?: string | null; album_id?: string | null; description?: string | null }) {
        const { error } = await supabase.from('tracks').update(patch).eq('id', id)
        if (error) throw error
        await loadTracks()
    }

    /** Deletes the track row and its files in storage. */
    async function deleteTrack(track: Track) {
        const { error } = await supabase.from('tracks').delete().eq('id', track.id)
        if (error) throw error
        await Promise.all([
            removeStorageObject('tracks', track.audio_url),
            removeStorageObject('covers', track.cover_url),
        ])
        tracks.value = tracks.value.filter(t => t.id !== track.id)
    }

    async function createAlbum(input: { title: string; description?: string | null; cover_url?: string | null }) {
        const uid = requireUserId()
        const { data, error } = await supabase
            .from('albums')
            .insert({ ...input, author_id: uid, user_id: uid })
            .select()
            .single()
        if (error) throw error
        albums.value = [data, ...albums.value]
        return data
    }

    async function updateAlbum(id: string, patch: { title?: string; description?: string | null; cover_url?: string | null }) {
        const { data, error } = await supabase.from('albums').update(patch).eq('id', id).select().single()
        if (error) throw error
        albums.value = albums.value.map(a => (a.id === id ? data : a))
        return data
    }

    async function deleteAlbum(album: Album) {
        const { error: detachError } = await supabase.from('tracks').update({ album_id: null }).eq('album_id', album.id)
        if (detachError) throw detachError
        const { error } = await supabase.from('albums').delete().eq('id', album.id)
        if (error) throw error
        await removeStorageObject('covers', album.cover_url)
        albums.value = albums.value.filter(a => a.id !== album.id)
        tracks.value = tracks.value.map(t => (t.album_id === album.id ? { ...t, album_id: null } : t))
    }

    async function removeStorageObject(bucket: string, publicUrl: string | null | undefined) {
        const path = storagePathFromPublicUrl(bucket, publicUrl)
        if (!path) return
        const { error } = await supabase.storage.from(bucket).remove([path])
        if (error) console.warn(`Could not remove ${bucket}/${path}`, error.message)
    }

    watch(() => user.value?.id, (id) => {
        tracks.value = []
        albums.value = []
        if (id) loadInvites()
        else invites.value = []
    }, { immediate: import.meta.client })

    return {
        tracks, albums, invites, loading, pendingInviteCount,
        loadAll, loadTracks, loadAlbums, loadInvites, respondToInvite,
        loadCredits, inviteCoAuthors, removeCredit,
        updateTrack, deleteTrack, createAlbum, updateAlbum, deleteAlbum,
    }
})
