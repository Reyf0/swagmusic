<script setup lang="ts">
import type { AnyTrack } from '@/types'


interface Props {
  track: AnyTrack
  tracks?: (AnyTrack)[]
  variant?: 'carousel' | 'grid'
  showAddToPlaylist?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'carousel',
  showAddToPlaylist: false,
  tracks: () => []
})

interface Emits {
  (e: 'addToPlaylist', track: AnyTrack): void
}

const emit = defineEmits<Emits>()

const playerStore = usePlayerStore()
const { isPlaying } = storeToRefs(playerStore)
const { playTrack, isCurrentTrack } = usePlayTrack()

const handlePlay = () => {
  playTrack(props.track, props.tracks)
}

const handleAddToPlaylist = () => {
  emit('addToPlaylist', props.track)
}

// Get authors list with proper type checking
const getAuthors = (track: AnyTrack) => {
  if ('track_authors' in track && track.track_authors) {
    return track.track_authors
      .map(ta => ta.author?.name)
      .filter(Boolean)
      .join(', ')
  }
  return 'Unknown Artist'
}

const currentTrack = computed(() => isCurrentTrack(props.track))
const isTrackPlaying = computed(() => currentTrack.value && isPlaying.value)
</script>

<template>
  <!-- Carousel variant - vertical compact card -->
  <div
    v-if="variant === 'carousel'"
    class="flex-shrink-0 flex flex-col bg-gray-100 rounded shadow p-3 hover:shadow-md transition track-card"
  >
    <div class="h-48 relative flex justify-center items-center aspect-square group grow overflow-hidden rounded shadow-md mb-3">
      <UIcon
        v-if="!track.cover_url"
        name="i-heroicons-musical-note"
        class="w-5 h-5 text-gray-400"
      />
      <img
        v-else
        :src="track.cover_url"
        :alt="`Cover for ${track.title}`"
        class="w-full object-cover rounded"
      >
      <div class="absolute inset-0 bg-transparent group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
        <button
          class="play-button opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 bg-green-500 hover:bg-green-400 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
          @click="handlePlay"
          :aria-label="isTrackPlaying ? `Pause ${track.title}` : `Play ${track.title}`"
        >
          <UIcon
            :name="isTrackPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
            class="w-6 h-6"
          />
        </button>
      </div>
    </div>
    <div class="track-label">
      <p class="font-semibold truncate" :title="track.title">{{ track.title }}</p>
      <div v-if="track.track_authors" class="truncate whitespace-nowrap overflow-hidden">
        <span class="text-sm text-gray-500">{{ getAuthors(track) }}</span>
      </div>
    </div>
  </div>

  <!-- Grid variant - horizontal card for search results -->
  <div
    v-else-if="variant === 'grid'"
    class="border rounded p-3 shadow hover:shadow-md transition-shadow"
  >
    <div class="flex justify-center items-center aspect-square bg-gradient-to-br from-gray-200 to-gray-300 mb-2 overflow-hidden rounded-md shadow-md">
      <img
          v-if="track?.cover_url"
          :src="track?.cover_url"
          :alt="`Cover for ${track.title}`"
          class="w-full cover object-cover rounded"
      >
      <UIcon
          v-else
          name="i-heroicons-musical-note"
          class="w-5 h-5 text-gray-400"
      />
    </div>
    <h2 class="text-lg font-semibold truncate" :title="track.title">{{ track.title }}</h2>
    <p class="text-sm text-gray-600 truncate">{{ getAuthors(track) }}</p>

    <div class="flex items-center justify-between mt-2">
      <button
        class="bg-green-500 hover:bg-green-400 text-white py-2 px-4 rounded-full flex items-center transition-colors"
        @click="handlePlay"
        :aria-label="isTrackPlaying ? `Pause ${track.title}` : `Play ${track.title}`"
      >
        <UIcon
          :name="isTrackPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
          class="w-4 h-4 mr-2"
        />
        <span>{{ isTrackPlaying ? 'Pause' : 'Play' }}</span>
      </button>

      <div class="flex items-center">
        <span
          v-if="currentTrack"
          class="text-xs text-green-500 font-medium mr-2"
          aria-label="Currently playing"
        >
          PLAYING
        </span>
        <button
          v-if="showAddToPlaylist"
          class="text-gray-500 hover:text-gray-700 p-2 transition-colors"
          :title="`Add ${track.title} to playlist`"
          @click="handleAddToPlaylist"
          aria-label="Add to playlist"
        >
          <UIcon name="i-heroicons-plus" class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.track-card .play-button {
  @apply absolute bg-green-500 hover:bg-green-400 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100;
}

.track-card:hover .play-button {
  opacity: 1;
}

.cover {
  aspect-ratio: 1;
}
</style>