<script setup lang="ts">
import type { Album, Track } from '#shared/types'

// Creator dashboard: own tracks, albums and co-author invites.
const route = useRoute()
const router = useRouter()
const toast = useToast()
const studioStore = useStudioStore()
const { tracks, albums, invites, loading } = storeToRefs(studioStore)

type Tab = 'tracks' | 'albums' | 'invites'
const tab = computed<Tab>({
  get: () => (['tracks', 'albums', 'invites'].includes(String(route.query.tab)) ? route.query.tab as Tab : 'tracks'),
  set: (t) => { router.replace({ query: { ...route.query, tab: t } }) },
})

const loadError = ref<string | null>(null)
async function load() {
  loadError.value = null
  try {
    await studioStore.loadAll()
  } catch (e: any) {
    loadError.value = e?.message ?? 'Failed to load your studio'
  }
}
onMounted(load)

const editingTrack = ref<Track | null>(null)
const editingAlbum = ref<Album | 'new' | null>(null)

const albumTitle = (id: string | null) => albums.value.find(a => a.id === id)?.title
const trackCount = (albumId: string) => tracks.value.filter(t => t.album_id === albumId).length

const responding = ref<number | null>(null)
async function respond(id: number, accept: boolean) {
  responding.value = id
  try {
    await studioStore.respondToInvite(id, accept)
    toast.add({ title: accept ? 'You are now credited on this track' : 'Invite declined', color: accept ? 'success' : 'neutral' })
  } catch (e: any) {
    toast.add({ title: 'Could not respond to invite', description: e?.message, color: 'error' })
  } finally {
    responding.value = null
  }
}

const tabs = computed(() => [
  { value: 'tracks' as const, label: `Tracks (${tracks.value.length})` },
  { value: 'albums' as const, label: `Albums (${albums.value.length})` },
  { value: 'invites' as const, label: invites.value.length ? `Invites (${invites.value.length})` : 'Invites' },
])

useSeoMeta({ title: 'Studio' })
</script>

<template>
  <div class="p-4 md:p-6">
    <div class="flex items-center justify-between gap-4 mb-4">
      <h1 class="text-2xl font-bold">Studio</h1>
      <UButton to="/upload" icon="i-lucide-upload">Upload track</UButton>
    </div>

    <div class="flex gap-2 mb-6 flex-wrap">
      <UButton
        v-for="t in tabs"
        :key="t.value"
        :variant="tab === t.value ? 'solid' : 'soft'"
        color="neutral"
        class="rounded-full"
        @click="tab = t.value"
      >
        {{ t.label }}
      </UButton>
    </div>

    <UAlert v-if="loadError" color="error" variant="soft" title="Something went wrong" :description="loadError" :actions="[{ label: 'Retry', onClick: load }]" class="mb-4" />

    <div v-if="loading && !tracks.length && !albums.length" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
    </div>

    <!-- Tracks -->
    <section v-else-if="tab === 'tracks'">
      <p v-if="!tracks.length" class="text-center py-10 text-old-neutral-500">
        You haven’t uploaded any tracks yet. <NuxtLink to="/upload" class="text-green-500 hover:underline">Upload your first one</NuxtLink>.
      </p>
      <ul v-else class="divide-y divide-old-neutral-200 dark:divide-old-neutral-800">
        <li v-for="track in tracks" :key="track.id" class="flex items-center gap-3 py-3">
          <img v-if="track.cover_url" :src="track.cover_url" alt="" class="size-12 rounded object-cover shrink-0">
          <div v-else class="size-12 rounded bg-old-neutral-200 dark:bg-old-neutral-800 flex items-center justify-center shrink-0">
            <UIcon name="i-heroicons-musical-note" class="size-5 text-old-neutral-400" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-medium truncate">{{ track.title }}</div>
            <div class="text-sm text-old-neutral-500 truncate">
              <TrackArtists :authors="track.authors" />
              <template v-if="albumTitle(track.album_id)"> · {{ albumTitle(track.album_id) }}</template>
              · {{ formatDuration(track.duration_seconds) }}
              · {{ track.likes_count }} ♥
              <template v-if="track.lyrics"> · lyrics</template>
            </div>
          </div>
          <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" :aria-label="`Edit ${track.title}`" @click="editingTrack = track" />
        </li>
      </ul>
    </section>

    <!-- Albums -->
    <section v-else-if="tab === 'albums'">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          type="button"
          class="aspect-square rounded-lg border-2 border-dashed border-old-neutral-300 dark:border-old-neutral-700 flex flex-col items-center justify-center gap-2 text-old-neutral-500 hover:border-green-500 hover:text-green-500 transition"
          @click="editingAlbum = 'new'"
        >
          <UIcon name="i-heroicons-plus" class="size-8" />
          <span class="font-medium">New album</span>
        </button>
        <div v-for="album in albums" :key="album.id" class="rounded-lg p-3 bg-old-neutral-100 dark:bg-old-neutral-900">
          <NuxtLink :to="`/albums/${album.id}`" class="block aspect-square rounded-md overflow-hidden bg-old-neutral-200 dark:bg-old-neutral-800 mb-2">
            <img v-if="album.cover_url" :src="album.cover_url" alt="" class="size-full object-cover">
            <div v-else class="size-full flex items-center justify-center"><UIcon name="i-lucide-disc-3" class="size-10 text-old-neutral-400" /></div>
          </NuxtLink>
          <div class="flex items-center gap-1">
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate">{{ album.title }}</div>
              <div class="text-sm text-old-neutral-500">{{ trackCount(album.id) }} {{ trackCount(album.id) === 1 ? 'track' : 'tracks' }}</div>
            </div>
            <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="sm" :aria-label="`Edit ${album.title}`" @click="editingAlbum = album" />
          </div>
        </div>
      </div>
      <p class="text-sm text-old-neutral-500 mt-4">Add tracks to an album when uploading, or from a track’s edit dialog.</p>
    </section>

    <!-- Invites -->
    <section v-else>
      <p v-if="!invites.length" class="text-center py-10 text-old-neutral-500">No pending invites. When someone credits you as a co-author, it shows up here.</p>
      <ul v-else class="divide-y divide-old-neutral-200 dark:divide-old-neutral-800">
        <li v-for="invite in invites" :key="invite.id" class="flex items-center gap-3 py-3">
          <img v-if="invite.track?.cover_url" :src="invite.track.cover_url" alt="" class="size-12 rounded object-cover shrink-0">
          <div v-else class="size-12 rounded bg-old-neutral-200 dark:bg-old-neutral-800 flex items-center justify-center shrink-0">
            <UIcon name="i-heroicons-musical-note" class="size-5 text-old-neutral-400" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-medium truncate">{{ invite.track?.title ?? 'Untitled track' }}</div>
            <div class="text-sm text-old-neutral-500 truncate">
              Invited by {{ invite.invited_by?.username ?? 'someone' }}
              <template v-if="invite.invited_at"> · {{ new Date(invite.invited_at).toLocaleDateString() }}</template>
            </div>
          </div>
          <UButton size="sm" :loading="responding === invite.id" @click="respond(invite.id, true)">Accept</UButton>
          <UButton size="sm" variant="ghost" color="neutral" :disabled="responding === invite.id" @click="respond(invite.id, false)">Decline</UButton>
        </li>
      </ul>
    </section>

    <StudioTrackEditModal :track="editingTrack" @close="editingTrack = null" />
    <StudioAlbumEditModal :album="editingAlbum" @close="editingAlbum = null" />
  </div>
</template>
