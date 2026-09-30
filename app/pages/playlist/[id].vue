<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Track } from '#shared/types'
import type { PlaylistWithMeta } from '@/composables/usePlaylistsApi'

// Ids are UUIDs; anything else is an unknown page (404) rather than a database error.
definePageMeta({ validate: route => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(route.params.id)) })

const route = useRoute()
const toast = useToast()
const user = useSupabaseUser()
const api = usePlaylistsApi()
const playlistsStore = usePlaylistsStore()
const likesStore = useLikesStore()

const playlistId = computed(() => String(route.params.id))

// Loaded during the server render (the page is in the HTML for visitors and search engines).
const pageData = useAsyncData(`playlist-page-${playlistId.value}`, async () => {
  const [playlist, tracks] = await Promise.all([api.getPlaylist(playlistId.value), api.getPlaylistTracks(playlistId.value)])
  return playlist ? { playlist, tracks } : null
})

// Title, description and link preview, fetched in parallel with the page.
const share = await useShareInfo('playlist', playlistId)
useShareMeta('playlist', share)

const { data, error: loadError } = await pageData
if (!data.value && !loadError.value) notFound()
if (loadError.value) console.error('Error fetching playlist:', loadError.value)

// Editable copies: the owner renames, removes and reorders in place.
const playlist = ref<PlaylistWithMeta | null>(data.value?.playlist ?? null)
const tracks = ref<(Track & { position: number; added_at: string | null })[]>(data.value?.tracks ?? [])
const error = computed(() => loadError.value ? 'Failed to load playlist' : !playlist.value ? 'Playlist not found' : null)

const isOwner = computed(() => !!user.value && playlist.value?.user_id === user.value.id)
const totalDuration = computed(() => tracks.value.reduce((sum, t) => sum + (t.duration_seconds ?? 0), 0))

// Liked state is per viewer, so it is fetched in the browser.
onMounted(() => likesStore.fetchLikes(tracks.value.map(t => t.id)))

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
    // The tab title and description come from the share info.
    refreshNuxtData(`share-playlist-${updated.id}`)
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

/* ── sorting & reordering ── */
type SortKey = 'custom' | 'title' | 'artist' | 'added' | 'duration'
const sortItems: { label: string; value: SortKey }[] = [
  { label: 'Custom order', value: 'custom' },
  { label: 'Title', value: 'title' },
  { label: 'Artist', value: 'artist' },
  { label: 'Date added', value: 'added' },
  { label: 'Duration', value: 'duration' },
]
const sortBy = ref<SortKey>('custom')

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
// What the list shows and plays; "custom" is the saved playlist order.
const displayed = computed(() => {
  const list = [...tracks.value]
  switch (sortBy.value) {
    case 'title': return list.sort((a, b) => collator.compare(a.title, b.title))
    case 'artist': return list.sort((a, b) => collator.compare(artistNames(a, ''), artistNames(b, '')))
    case 'added': return list.sort((a, b) => (b.added_at ?? '').localeCompare(a.added_at ?? ''))
    case 'duration': return list.sort((a, b) => (a.duration_seconds ?? 0) - (b.duration_seconds ?? 0))
    default: return list
  }
})
const canReorder = computed(() => isOwner.value && sortBy.value === 'custom' && tracks.value.length > 1)

async function moveTrack(from: number, to: number) {
  if (!playlist.value || from === to || to < 0 || to >= tracks.value.length) return
  const before = tracks.value
  const next = [...before]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved!)
  tracks.value = next
  try {
    await api.reorderTracks(playlist.value.id, next.map(t => t.id), before.map(t => t.id))
  } catch (e: any) {
    tracks.value = before
    toast.add({ title: 'Could not save the new order', description: e?.message, color: 'error' })
  }
}

const rowItems = (track: Track, index: number): DropdownMenuItem[] => {
  if (!isOwner.value) return []
  const items: DropdownMenuItem[] = []
  // Keyboard-friendly alternative to dragging.
  if (canReorder.value) {
    if (index > 0) items.push({ label: 'Move up', icon: 'i-lucide-arrow-up', onSelect: () => moveTrack(index, index - 1) })
    if (index < tracks.value.length - 1) items.push({ label: 'Move down', icon: 'i-lucide-arrow-down', onSelect: () => moveTrack(index, index + 1) })
  }
  items.push({ label: 'Remove from this playlist', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => removeTrack(track) })
  return items
}

const reportSubject = useReportSubject()
const headerMenu = computed<DropdownMenuItem[]>(() => isOwner.value
  ? [
      { label: 'Edit details', icon: 'i-lucide-pencil', onSelect: openEdit },
      { label: 'Delete playlist', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => { deleteOpen.value = true } },
    ]
  : [
      { label: 'Report playlist', icon: 'i-lucide-flag', onSelect: () => { if (playlist.value) reportSubject.value = { type: 'playlist', id: playlist.value.id, title: playlist.value.name } } },
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
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error"
      :actions="[{ label: 'Back to library', to: '/library' }]"
    />

    <div v-else-if="playlist">
      <header class="flex flex-col md:flex-row md:items-end gap-6 mb-6">
        <div class="size-48 shrink-0 mx-auto md:mx-0 rounded-md shadow-lg overflow-hidden bg-old-neutral-200 dark:bg-old-neutral-800 flex items-center justify-center">
          <CoverImage v-if="playlist.cover_url" :src="playlist.cover_url" :size="320" priority class="size-full object-cover" />
          <CoverImage v-else-if="tracks[0]?.cover_url" :src="tracks[0].cover_url" :size="320" priority class="size-full object-cover" />
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
        <PlayAllButton :tracks="displayed" label="Play playlist" />
        <UButton icon="i-lucide-link" variant="ghost" color="neutral" aria-label="Copy link" title="Copy link" @click="copyLink" />
        <UDropdownMenu :items="headerMenu">
          <UButton icon="i-heroicons-ellipsis-horizontal" variant="ghost" color="neutral" aria-label="Playlist options" />
        </UDropdownMenu>

        <div v-if="tracks.length > 1" class="ml-auto flex items-center gap-2">
          <span class="text-sm text-old-neutral-500 hidden sm:inline">Sort by</span>
          <USelect v-model="sortBy" :items="sortItems" class="w-40" aria-label="Sort tracks by" />
        </div>
      </div>

      <p v-if="isOwner && tracks.length > 1" class="text-sm text-old-neutral-500 mb-2">
        <template v-if="canReorder">Drag tracks to change their order.</template>
        <template v-else>Switch to “Custom order” to rearrange tracks.</template>
      </p>

      <TrackList
        :tracks="displayed"
        show-added
        :reorderable="canReorder"
        :row-items="rowItems"
        :empty-text="isOwner ? 'This playlist is empty. Add tracks from any track’s “…” menu.' : 'This playlist is empty.'"
        @reorder="moveTrack"
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
