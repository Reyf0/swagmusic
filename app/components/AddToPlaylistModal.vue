<script setup lang="ts">
// Global "add to playlist" dialog; open it with usePlaylistsStore().openAddToPlaylist(track).
const playlistsStore = usePlaylistsStore()
const { mine, loading, addModalTrack } = storeToRefs(playlistsStore)
const toast = useToast()

const newName = ref('')
const busy = ref(false)

const open = computed({
  get: () => !!addModalTrack.value,
  set: (v) => { if (!v) addModalTrack.value = null },
})

watch(open, (v) => { if (v) newName.value = '' })

async function addTo(playlistId: string) {
  const track = addModalTrack.value
  if (!track || busy.value) return
  busy.value = true
  try {
    await playlistsStore.addTrack(playlistId, track)
    open.value = false
  } catch (err: any) {
    toast.add({ title: 'Could not add to playlist', description: err?.message, color: 'error' })
  } finally {
    busy.value = false
  }
}

async function createAndAdd() {
  const name = newName.value.trim()
  if (!name || busy.value) return
  busy.value = true
  try {
    const playlist = await playlistsStore.create(name)
    busy.value = false
    if (playlist) await addTo(playlist.id)
  } catch (err: any) {
    toast.add({ title: 'Could not create playlist', description: err?.message, color: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Add to playlist" :description="addModalTrack?.title">
    <template #body>
      <form class="flex gap-2 mb-4" @submit.prevent="createAndAdd">
        <UInput v-model="newName" placeholder="New playlist name" class="flex-1" maxlength="100" />
        <UButton type="submit" icon="i-heroicons-plus" :disabled="!newName.trim()" :loading="busy">Create</UButton>
      </form>

      <div v-if="loading" class="flex justify-center py-6">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      </div>
      <p v-else-if="!mine.length" class="text-center text-sm text-muted py-6">You don't have any playlists yet.</p>
      <ul v-else class="max-h-72 overflow-y-auto space-y-1">
        <li v-for="playlist in mine" :key="playlist.id">
          <button
            type="button"
            class="w-full flex items-center gap-3 p-2 rounded-md hover:bg-elevated text-left disabled:opacity-50"
            :disabled="busy"
            @click="addTo(playlist.id)"
          >
            <img v-if="playlist.cover_url" :src="playlist.cover_url" alt="" class="size-10 rounded object-cover">
            <div v-else class="size-10 rounded bg-elevated flex items-center justify-center">
              <UIcon name="i-heroicons-musical-note" class="size-5 text-muted" />
            </div>
            <div class="min-w-0">
              <div class="font-medium truncate">{{ playlist.name }}</div>
              <div class="text-xs text-muted">{{ playlist.track_count }} {{ playlist.track_count === 1 ? 'track' : 'tracks' }}</div>
            </div>
          </button>
        </li>
      </ul>
    </template>
  </UModal>
</template>
