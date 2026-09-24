<script setup lang="ts">
import type { Track } from '#shared/types'

const user = useSupabaseUser()
const likesApi = useLikesApi()
const tracksApi = useTracksApi()
const likesStore = useLikesStore()
const playlistsStore = usePlaylistsStore()
const tracksStore = useTracksStore()
const { mine: playlists, loading: playlistsLoading } = storeToRefs(playlistsStore)
const { recentItems } = storeToRefs(tracksStore)

const tab = ref<'liked' | 'playlists' | 'recent'>('liked')
const likedTracks = ref<(Track & { added_at: string | null })[]>([])
const likedLoading = ref(true)
const likedError = ref<string | null>(null)

async function fetchLikedTracks() {
  likedLoading.value = true
  likedError.value = null
  try {
    const liked = await likesApi.getLikedIds('track')
    const tracks = await tracksApi.getTracksByIds(liked.map(l => l.target_id))
    const likedAt = new Map(liked.map(l => [l.target_id, l.created_at]))
    likedTracks.value = tracks.map(t => ({ ...t, added_at: likedAt.get(t.id) ?? null }))
    likesStore.fetchLikes(tracks.map(t => t.id))
  } catch (e: any) {
    console.error('Error fetching liked tracks:', e)
    likedError.value = 'Failed to load your liked tracks'
  } finally {
    likedLoading.value = false
  }
}

// Unliking a track here removes it from the list right away.
const visibleLiked = computed(() => likedTracks.value.filter(t => likesStore.likes[t.id] !== false))

const recentUnique = computed(() => {
  const seen = new Set<string>()
  return recentItems.value.filter(t => !seen.has(t.id) && seen.add(t.id))
})

watch(() => user.value?.id, (id) => {
  if (!id) return
  fetchLikedTracks()
  playlistsStore.load()
  tracksStore.loadRecent({ userId: id, limit: 50 })
}, { immediate: true })

useSeoMeta({ title: 'Your library · SwagMusic' })
</script>

<template>
  <div class="p-4 md:p-6">
    <h1 class="text-2xl font-bold mb-4">Your Library</h1>

    <div class="flex gap-2 mb-6">
      <UButton
        v-for="t in ([['liked', 'Liked tracks'], ['playlists', 'Playlists'], ['recent', 'Recently played']] as const)"
        :key="t[0]"
        :variant="tab === t[0] ? 'solid' : 'soft'"
        color="neutral"
        class="rounded-full"
        @click="tab = t[0]"
      >
        {{ t[1] }}
      </UButton>
    </div>

    <!-- Liked tracks -->
    <section v-if="tab === 'liked'">
      <UAlert v-if="likedError" color="error" variant="soft" :title="likedError" :actions="[{ label: 'Retry', onClick: fetchLikedTracks }]" />
      <TrackList
        v-else
        :tracks="visibleLiked"
        :loading="likedLoading"
        show-added
        empty-text="You haven’t liked any tracks yet. Tap the heart on a track to save it here."
      />
    </section>

    <!-- Playlists -->
    <section v-else-if="tab === 'playlists'">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          type="button"
          class="aspect-square rounded-lg border-2 border-dashed border-old-neutral-300 dark:border-old-neutral-700 flex flex-col items-center justify-center gap-2 text-old-neutral-500 hover:border-green-500 hover:text-green-500 transition"
          @click="playlistsStore.openCreate()"
        >
          <UIcon name="i-heroicons-plus" class="size-8" />
          <span class="font-medium">New playlist</span>
        </button>

        <NuxtLink
          v-for="playlist in playlists"
          :key="playlist.id"
          :to="`/playlist/${playlist.id}`"
          class="group rounded-lg p-3 bg-old-neutral-100 hover:bg-old-neutral-200 dark:bg-old-neutral-900 dark:hover:bg-old-neutral-800 transition"
        >
          <div class="aspect-square rounded-md overflow-hidden bg-old-neutral-200 dark:bg-old-neutral-800 flex items-center justify-center mb-2">
            <img v-if="playlist.cover_url" :src="playlist.cover_url" alt="" class="size-full object-cover">
            <UIcon v-else name="i-heroicons-musical-note" class="size-10 text-old-neutral-400" />
          </div>
          <div class="font-semibold truncate">{{ playlist.name }}</div>
          <div class="text-sm text-old-neutral-500">{{ playlist.track_count }} {{ playlist.track_count === 1 ? 'track' : 'tracks' }}</div>
        </NuxtLink>
      </div>
      <div v-if="playlistsLoading && !playlists.length" class="flex justify-center py-6">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      </div>
    </section>

    <!-- Recently played -->
    <section v-else>
      <TrackList :tracks="recentUnique" empty-text="Tracks you play will show up here." />
    </section>
  </div>
</template>
