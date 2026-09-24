import { defineStore } from 'pinia'
import type { Track } from '#shared/types'
import type { PlaylistWithMeta } from '@/composables/usePlaylistsApi'

/**
 * The signed-in user's playlists (sidebar, library, "add to playlist"),
 * plus the state of the global create / add-to-playlist modals.
 */
export const usePlaylistsStore = defineStore('playlists', () => {
    const api = usePlaylistsApi()
    const user = useSupabaseUser()
    const toast = useToast()

    const mine = ref<PlaylistWithMeta[]>([])
    const loading = ref(false)
    const loadedFor = ref<string | null>(null)

    // global modals
    const createModalOpen = ref(false)
    const addModalTrack = ref<Track | null>(null)

    async function load(force = false) {
        const uid = user.value?.id
        if (!uid) {
            mine.value = []
            loadedFor.value = null
            return
        }
        if (!force && loadedFor.value === uid) return
        loading.value = true
        try {
            mine.value = await api.getUserPlaylists(uid)
            loadedFor.value = uid
        } catch (err: any) {
            console.error('Failed to load playlists', err)
        } finally {
            loading.value = false
        }
    }

    function requireUser() {
        if (user.value) return user.value
        toast.add({ title: 'Sign in to manage playlists', color: 'warning' })
        navigateTo({ path: '/login', query: { redirect: useRoute().fullPath } })
        return null
    }

    async function create(name: string, description?: string) {
        const u = requireUser()
        if (!u) return null
        const playlist = await api.createPlaylist({ name, description, userId: u.id })
        mine.value = [playlist, ...mine.value]
        return playlist
    }

    async function rename(id: string, patch: { name?: string; description?: string | null }) {
        const updated = await api.updatePlaylist(id, patch)
        mine.value = mine.value.map(p => (p.id === id ? updated : p))
        return updated
    }

    async function remove(id: string) {
        await api.deletePlaylist(id)
        mine.value = mine.value.filter(p => p.id !== id)
    }

    async function addTrack(playlistId: string, track: Pick<Track, 'id' | 'title'>) {
        const added = await api.addTrack(playlistId, track.id)
        const playlist = mine.value.find(p => p.id === playlistId)
        if (added && playlist) playlist.track_count += 1
        toast.add({
            title: added ? `Added to ${playlist?.name ?? 'playlist'}` : `Already in ${playlist?.name ?? 'playlist'}`,
            description: track.title,
            color: added ? 'success' : 'info',
        })
        return added
    }

    async function removeTrack(playlistId: string, trackId: string) {
        await api.removeTrack(playlistId, trackId)
        const playlist = mine.value.find(p => p.id === playlistId)
        if (playlist) playlist.track_count = Math.max(0, playlist.track_count - 1)
    }

    function openCreate() {
        if (requireUser()) createModalOpen.value = true
    }

    function openAddToPlaylist(track: Track) {
        if (!requireUser()) return
        addModalTrack.value = track
        load()
    }

    watch(() => user.value?.id, () => load(true))

    return {
        mine, loading, load, create, rename, remove, addTrack, removeTrack,
        createModalOpen, addModalTrack, openCreate, openAddToPlaylist,
    }
})
