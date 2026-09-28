<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Track } from '#shared/types'

// Numbered track table. Clicking a row plays it with the whole list as the queue.
withDefaults(defineProps<{
  tracks: (Track & { added_at?: string | null })[]
  loading?: boolean
  emptyText?: string
  /** Show a "date added" column using `track.added_at`. */
  showAdded?: boolean
  /** Extra menu items for a row (e.g. "Remove from playlist"). */
  rowItems?: (track: Track) => DropdownMenuItem[]
}>(), {
  loading: false,
  emptyText: 'No tracks here yet.',
  showAdded: false,
  rowItems: undefined,
})

const { playTrack, isCurrentTrack, isTrackPlaying } = usePlayTrack()

function formatDate(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''
}
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-old-neutral-400" />
    </div>

    <p v-else-if="!tracks.length" class="text-center py-10 text-old-neutral-500">{{ emptyText }}</p>

    <div v-else role="table" aria-label="Tracks">
      <div
        role="row"
        class="hidden md:grid gap-4 py-2 px-3 border-b border-old-neutral-200 dark:border-old-neutral-800 text-xs uppercase tracking-wide text-old-neutral-500"
        :class="showAdded ? 'grid-cols-[2rem_1fr_10rem_4rem_4.5rem]' : 'grid-cols-[2rem_1fr_4rem_4.5rem]'"
      >
        <span role="columnheader">#</span>
        <span role="columnheader">Title</span>
        <span v-if="showAdded" role="columnheader">Date added</span>
        <span role="columnheader" class="text-right"><UIcon name="i-heroicons-clock" class="size-4" /></span>
        <span />
      </div>

      <div
        v-for="(track, index) in tracks"
        :key="`${track.id}-${index}`"
        role="row"
        class="group grid gap-3 md:gap-4 items-center py-2 px-3 rounded-md hover:bg-old-neutral-100 dark:hover:bg-old-neutral-800 cursor-pointer"
        :class="[
          showAdded ? 'grid-cols-[2rem_1fr_auto] md:grid-cols-[2rem_1fr_10rem_4rem_4.5rem]' : 'grid-cols-[2rem_1fr_auto] md:grid-cols-[2rem_1fr_4rem_4.5rem]',
          { 'bg-old-neutral-100 dark:bg-old-neutral-800/60': isCurrentTrack(track) },
        ]"
        @click="playTrack(track, tracks)"
      >
        <!-- number / play state -->
        <div class="text-old-neutral-500 tabular-nums flex items-center justify-center">
          <UIcon v-if="isTrackPlaying(track)" name="i-heroicons-speaker-wave" class="size-4 text-green-500 group-hover:hidden" />
          <span v-else class="group-hover:hidden" :class="{ 'text-green-500': isCurrentTrack(track) }">{{ index + 1 }}</span>
          <button
            type="button"
            class="hidden group-hover:inline-flex"
            :aria-label="isTrackPlaying(track) ? `Pause ${track.title}` : `Play ${track.title}`"
            @click.stop="playTrack(track, tracks)"
          >
            <UIcon :name="isTrackPlaying(track) ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'" class="size-4" />
          </button>
        </div>

        <!-- title / artists -->
        <div class="flex items-center gap-3 min-w-0">
          <img v-if="track.cover_url" :src="track.cover_url" alt="" class="size-10 rounded object-cover shrink-0" loading="lazy">
          <div v-else class="size-10 rounded bg-old-neutral-200 dark:bg-old-neutral-800 flex items-center justify-center shrink-0">
            <UIcon name="i-heroicons-musical-note" class="size-4 text-old-neutral-400" />
          </div>
          <div class="min-w-0">
            <NuxtLink
              :to="`/tracks/${track.id}`"
              class="block font-medium truncate hover:underline"
              :class="{ 'text-green-500': isCurrentTrack(track) }"
              @click.stop
            >{{ track.title }}</NuxtLink>
            <div class="text-sm text-old-neutral-500 truncate"><TrackArtists :authors="track.authors" /></div>
          </div>
        </div>

        <span v-if="showAdded" class="hidden md:block text-sm text-old-neutral-500 truncate">{{ formatDate(track.added_at) }}</span>

        <span class="hidden md:block text-sm text-old-neutral-500 text-right tabular-nums">{{ formatDuration(track.duration_seconds) }}</span>

        <div class="flex items-center justify-end gap-0.5" @click.stop>
          <LikeButton :track-id="track.id" size="sm" class="md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100" />
          <TrackMenu :track="track" :extra-items="rowItems?.(track)" />
        </div>
      </div>
    </div>
  </div>
</template>
