<script setup lang="ts">
import type { Track } from '#shared/types'

interface Props {
  track: Track
  /** List the track belongs to; becomes the play queue. */
  tracks?: Track[]
  variant?: 'carousel' | 'grid'
  /** Above the fold on page load: load the cover first. */
  priority?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'carousel',
  tracks: () => [],
  priority: false
})

const { playTrack, isCurrentTrack, isTrackPlaying } = usePlayTrack()

const isCurrent = computed(() => isCurrentTrack(props.track))
const isPlayingNow = computed(() => isTrackPlaying(props.track))

function handlePlay() {
  playTrack(props.track, props.tracks)
}
</script>

<template>
  <div
    class="group flex flex-col rounded-lg p-3 transition bg-old-neutral-100 hover:bg-old-neutral-200 dark:bg-old-neutral-900 dark:hover:bg-old-neutral-800"
    :class="variant === 'carousel' ? 'w-44 shrink-0' : 'w-full'"
  >
    <div class="relative aspect-square overflow-hidden rounded-md shadow-md mb-3 bg-old-neutral-200 dark:bg-old-neutral-800 flex items-center justify-center">
      <CoverImage
        :src="track.cover_url"
        :size="variant === 'carousel' ? 160 : 320"
        :alt="`Cover for ${track.title}`"
        :priority="priority"
        class="size-full object-cover"
      />

      <button
        type="button"
        class="absolute bottom-2 right-2 size-11 rounded-full bg-green-500 hover:bg-green-400 text-white shadow-lg flex items-center justify-center transition-all duration-200 focus-visible:opacity-100 focus-visible:translate-y-0"
        :class="isPlayingNow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'"
        :aria-label="isPlayingNow ? `Pause ${track.title}` : `Play ${track.title}`"
        @click="handlePlay"
      >
        <UIcon :name="isPlayingNow ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'" class="size-5" />
      </button>
    </div>

    <div class="flex items-start gap-1 min-w-0">
      <div class="min-w-0 flex-1">
        <NuxtLink :to="`/tracks/${track.id}`" class="block font-semibold truncate hover:underline" :class="isCurrent ? 'text-green-500' : ''" :title="track.title">
          {{ track.title }}
        </NuxtLink>
        <p class="text-sm text-old-neutral-500 dark:text-old-neutral-400 truncate">
          <TrackArtists :authors="track.authors" />
        </p>
      </div>
      <TrackMenu :track="track" class="opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100" />
    </div>
  </div>
</template>
