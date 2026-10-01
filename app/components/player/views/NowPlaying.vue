<script setup lang="ts">
const props = defineProps<{ mode: 'sidebar' | 'fullscreen' }>()

const supabase = useSupabase()
const player = usePlayerStore()
const { queue, currentTrackIndex, currentTrack: track } = storeToRefs(player)

const nextIndex = computed(() => {
  if (currentTrackIndex.value < 0 || currentTrackIndex.value + 1 >= queue.value.length) return -1
  return currentTrackIndex.value + 1
})
const nextTrack = computed(() => (nextIndex.value >= 0 ? queue.value[nextIndex.value] : null))

const mainArtist = computed(() => track.value?.authors?.[0] ?? null)

// Album title is not part of the track lists; fetch it when needed.
const albumTitle = ref<string | null>(null)
watch(() => track.value?.album_id, async (albumId) => {
  albumTitle.value = null
  if (!albumId) return
  const { data } = await supabase.from('albums').select('title').eq('id', albumId).maybeSingle()
  if (track.value?.album_id === albumId) albumTitle.value = data?.title ?? null
}, { immediate: true })

const imgEl = ref<HTMLImageElement | null>(null)
// A plain <img> (the dominant colour is read from it), with a resized cover from the image optimizer.
const img = useImage()
const { color } = useDominantColorFromImg(imgEl, { sampleSize: 900, k: 3, saturationThreshold: 0.5 })

const uploadedAt = computed(() => track.value?.created_at
  ? new Date(track.value.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  : null)
</script>

<template>
  <div
    v-if="track"
    class="h-full w-full flex flex-col text-white"
    :class="props.mode === 'fullscreen' ? 'min-h-full' : ''"
    :style="props.mode === 'fullscreen' ? { background: `linear-gradient(to bottom, ${color}, #171717 70%)` } : {}"
  >
    <!-- Top bar -->
    <div class="sticky top-0 z-10 px-4 py-3 flex items-center justify-between gap-2" :class="props.mode === 'sidebar' ? 'bg-old-neutral-900' : ''">
      <div class="flex items-center gap-2 min-w-0">
        <UButton
          icon="i-heroicons-x-mark"
          variant="ghost"
          color="neutral"
          size="sm"
          class="text-white"
          aria-label="Close now playing"
          @click="player.closeView('now')"
        />
        <span class="font-medium text-sm truncate">
          <TrackArtists :authors="track.authors" />
        </span>
      </div>
      <div class="flex items-center gap-1">
        <TrackMenu :track="track" class="text-white" />
        <UButton
          :icon="props.mode === 'sidebar' ? 'i-heroicons-arrows-pointing-out' : 'i-heroicons-arrows-pointing-in'"
          size="sm"
          variant="ghost"
          color="neutral"
          class="text-white"
          :aria-label="props.mode === 'sidebar' ? 'Expand' : 'Collapse'"
          @click="player.switchViewMode('now')"
        />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4" :class="props.mode === 'fullscreen' ? 'md:px-10' : ''">
      <div :class="props.mode === 'fullscreen' ? 'md:flex md:items-end md:gap-8 mb-8' : 'space-y-4 mb-6'">
        <!-- Cover -->
        <div
          class="aspect-square rounded-lg overflow-hidden shadow-2xl bg-old-neutral-800 flex items-center justify-center shrink-0"
          :class="props.mode === 'fullscreen' ? 'w-full max-w-sm mx-auto md:mx-0 md:w-72' : 'w-full'"
        >
          <img
            v-if="track.cover_url"
            ref="imgEl"
            :src="img(track.cover_url, { width: 640, format: 'webp' })"
            class="size-full object-cover"
            alt="Cover"
            crossorigin="anonymous"
          >
          <UIcon v-else name="i-heroicons-musical-note" class="size-16 text-old-neutral-500" />
        </div>

        <!-- Title + artists -->
        <div class="flex items-start gap-2 min-w-0 mt-4 md:mt-0">
          <div class="min-w-0 flex-1">
            <h2 class="font-bold truncate" :class="props.mode === 'fullscreen' ? 'text-3xl md:text-5xl' : 'text-xl'">
              <NuxtLink :to="`/tracks/${track.id}`" class="hover:underline">{{ track.title }}</NuxtLink>
            </h2>
            <p class="text-old-neutral-300 truncate"><TrackArtists :authors="track.authors" /></p>
          </div>
          <LikeButton :track-id="track.id" size="lg" />
        </div>
      </div>

      <div
        :class="props.mode === 'fullscreen' ? 'grid md:grid-cols-2 gap-4' : 'flex flex-col gap-4'"
        class="*:rounded-xl *:bg-old-neutral-800/80"
      >
        <!-- About the artist -->
        <NuxtLink v-if="mainArtist" :to="`/authors/${mainArtist.id}`" class="p-4 flex items-center gap-3 hover:bg-old-neutral-700 transition">
          <UAvatar :src="mainArtist.avatar_url ?? undefined" :alt="mainArtist.username ?? undefined" size="xl" />
          <div class="min-w-0">
            <h3 class="text-sm text-old-neutral-400">About the artist</h3>
            <p class="font-semibold truncate">{{ mainArtist.username || 'Unnamed artist' }}</p>
            <p v-if="track.authors.length > 1" class="text-xs text-old-neutral-400 truncate">with {{ track.authors.slice(1).map(a => a.username).join(', ') }}</p>
          </div>
        </NuxtLink>

        <!-- Details -->
        <div class="p-4">
          <h3 class="font-semibold mb-1">Details</h3>
          <ul class="text-sm text-old-neutral-400 space-y-1">
            <li v-if="albumTitle">
              Album: <NuxtLink :to="`/albums/${track.album_id}`" class="hover:underline text-old-neutral-200">{{ albumTitle }}</NuxtLink>
            </li>
            <li>Length: {{ formatDuration(track.duration_seconds) }}</li>
            <li v-if="uploadedAt">Released: {{ uploadedAt }}</li>
          </ul>
        </div>

        <!-- Up next -->
        <div class="p-4" :class="props.mode === 'fullscreen' ? 'md:col-span-2' : ''">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold">Up next</h3>
            <UButton size="sm" variant="ghost" color="neutral" class="text-old-neutral-300" @click="player.openView('queue')">
              Open queue
            </UButton>
          </div>
          <button
            v-if="nextTrack"
            type="button"
            class="flex items-center gap-3 w-full text-left rounded p-1 hover:bg-old-neutral-700"
            @click="player.playAt(nextIndex)"
          >
            <CoverImage :src="nextTrack.cover_url" :size="48" placeholder-class="bg-old-neutral-700" class="size-12 rounded object-cover" />
            <div class="min-w-0">
              <p class="font-semibold truncate">{{ nextTrack.title }}</p>
              <p class="text-sm text-old-neutral-400 truncate">{{ artistNames(nextTrack) }}</p>
            </div>
          </button>
          <p v-else class="text-sm text-old-neutral-400">This is the last track in the queue.</p>
        </div>
      </div>
    </div>
  </div>
</template>
