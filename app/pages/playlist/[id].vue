<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Track } from '#shared/types'
import type { PlaylistWithMeta } from '@/composables/usePlaylistsApi'

const route = useRoute()
const toast = useToast()
const user = useSupabaseUser()
const api = usePlaylistsApi()
const playlistsStore = usePlaylistsStore()
const likesStore = useLikesStore()

const playlistId = computed(() => String(route.params.id))
const playlist = ref<PlaylistWithMeta | null>(null)
const tracks = ref<(Track & { position: number; added_at: string | null })[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const isOwner = computed(() => !!user.value && playlist.value?.user_id === user.value.id)
const totalDuration = computed(() => tracks.value.reduce((sum, t) => sum + (t.duration_seconds ?? 0), 0))

async function fetchPlaylist() {
  isLoading.value = true
  error.value = null
  try {
    const [p, t] = await Promise.all([api.getPlaylist(playlistId.value), api.getPlaylistTracks(playlistId.value)])
    playlist.value = p
    tracks.value = t
    if (!p) error.value = 'Playlist not found'
    likesStore.fetchLikes(t.map(x => x.id))
  } catch (e: any) {
    console.error('Error fetching playlist:', e)
    error.value = 'Failed to load playlist'
  } finally {
    isLoading.value = false
  }
}

watch(playlistId, fetchPlaylist, { immediate: true })

useSeoMeta({ title: () => playlist.value ? `${playlist.value.name}` : 'Playlist' })

/* ── owner actions ── */
const editOpen = ref(false)
const editName = ref('')
const editDescription = ref('')
const saving = ref(false)

function openEdit() {
  if (!playlist.value) return
  editName.value = playlist.value.name
  editDescription.value = playlist.value.description ?? ''
  editOpen.value = true
}

async function saveEdit() {
  if (!playlist.value || !editName.value.trim()) return
  saving.value = true
  try {
    const updated = await playlistsStore.rename(playlist.value.id, { name: editName.value.trim(), description: editDescription.value.trim() || null })
    playlist.value = { ...updated, owner: playlist.value.owner }
    editOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Could not save playlist', description: e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const deleteOpen = ref(false)
async function deletePlaylist() {
  if (!playlist.value) return
  try {
    await playlistsStore.remove(playlist.value.id)
    toast.add({ title: 'Playlist deleted', color: 'success' })
    await navigateTo('/library')
  } catch (e: any) {
    toast.add({ title: 'Could not delete playlist', description: e?.message, color: 'error' })
  }
}

async function removeTrack(track: Track) {
  if (!playlist.value) return
  try {
    await playlistsStore.removeTrack(playlist.value.id, track.id)
    tracks.value = tracks.value.filter(t => t.id !== track.id)
  } catch (e: any) {
    toast.add({ title: 'Could not remove track', description: e?.message, color: 'error' })
  }
}

const rowItems = (track: Track): DropdownMenuItem[] => isOwner.value
  ? [{ label: 'Remove from this playlist', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => removeTrack(track) }]
  : []

const headerMenu = computed<DropdownMenuItem[]>(() => [
  { label: 'Edit details', icon: 'i-lucide-pencil', onSelect: openEdit },
  { label: 'Delete playlist', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => { deleteOpen.value = true } },
])

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.add({ title: 'Link copied', color: 'success' })
  } catch {
    toast.add({ title: 'Could not copy link', color: 'error' })
  }
}
</script>

<template>
  <div class="p-4 md:p-6">
    <div v-if="isLoading && !playlist" class="flex justify-center items-center py-20">
      <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-old-neutral-400" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="error"
      :actions="[{ label: 'Back to library', to: '/library' }]"
    />

    <div v-else-if="playlist">
      <header class="flex flex-col md:flex-row md:items-end gap-6 mb-6">
        <div class="size-48 shrink-0 mx-auto md:mx-0 rounded-md shadow-lg overflow-hidden bg-old-neutral-200 dark:bg-old-neutral-800 flex items-center justify-center">
          <img v-if="playlist.cover_url" :src="playlist.cover_url" class="size-full object-cover" alt="">
          <img v-else-if="tracks[0]?.cover_url" :src="tracks[0].cover_url" class="size-full object-cover" alt="">
          <UIcon v-else name="i-heroicons-musical-note" class="size-16 text-old-neutral-400" />
        </div>

        <div class="min-w-0">
          <div class="text-xs uppercase font-semibold text-old-neutral-500 mb-1">Playlist</div>
          <h1 class="text-3xl md:text-5xl font-bold mb-2 break-words">{{ playlist.name }}</h1>
          <p v-if="playlist.description" class="text-old-neutral-500 mb-2">{{ playlist.description }}</p>
          <div class="text-sm text-old-neutral-500">
            <span class="font-semibold text-old-neutral-800 dark:text-old-neutral-200">{{ playlist.owner?.username || 'Unknown' }}</span>
            · {{ tracks.length }} {{ tracks.length === 1 ? 'track' : 'tracks' }}
            <template v-if="totalDuration"> · {{ formatDuration(totalDuration) }}</template>
          </div>
        </div>
      </header>

      <div class="flex items-center gap-2 mb-4">
        <PlayAllButton :tracks="tracks" label="Play playlist" />
        <UButton icon="i-lucide-link" variant="ghost" color="neutral" aria-label="Copy link" title="Copy link" @click="copyLink" />
        <UDropdownMenu v-if="isOwner" :items="headerMenu">
          <UButton icon="i-heroicons-ellipsis-horizontal" variant="ghost" color="neutral" aria-label="Playlist options" />
        </UDropdownMenu>
      </div>

      <TrackList
        :tracks="tracks"
        show-added
        :row-items="rowItems"
        :empty-text="isOwner ? 'This playlist is empty. Add tracks from any track’s “…” menu.' : 'This playlist is empty.'"
      />
    </div>

    <UModal v-model:open="editOpen" title="Edit playlist">
      <template #body>
        <form id="edit-playlist-form" class="space-y-4" @submit.prevent="saveEdit">
          <UFormField label="Name" required>
            <UInput v-model="editName" class="w-full" maxlength="100" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="editDescription" class="w-full" maxlength="500" />
          </UFormField>
        </form>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="editOpen = false">Cancel</UButton>
          <UButton type="submit" form="edit-playlist-form" :loading="saving" :disabled="!editName.trim()">Save</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" title="Delete playlist?" :description="`“${playlist?.name}” will be deleted. This cannot be undone.`">
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="deleteOpen = false">Cancel</UButton>
          <UButton color="error" @click="deletePlaylist">Delete</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
