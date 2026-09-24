<script setup lang="ts">
import type { Track } from '#shared/types'

defineProps<{
  tracks: Track[]
}>()

const carousel = ref<HTMLElement | null>(null)

function scrollCarousel(direction: 'left' | 'right') {
  if (!carousel.value) return
  const amount = Math.max(300, carousel.value.clientWidth * 0.8)
  carousel.value.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
}
</script>

<template>
  <section class="relative group/carousel">
    <button
      type="button"
      class="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full shadow items-center justify-center bg-old-neutral-200/90 hover:bg-old-neutral-300 dark:bg-old-neutral-800/90 dark:hover:bg-old-neutral-700 opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 transition-opacity"
      aria-label="Scroll left"
      @click="scrollCarousel('left')"
    >
      <UIcon name="i-heroicons-chevron-left" class="size-6" />
    </button>
    <div ref="carousel" class="flex gap-4 overflow-x-auto scrollbar-hide pr-6 snap-x">
      <TrackCard
        v-for="track in tracks"
        :key="track.id"
        :track="track"
        :tracks="tracks"
        variant="carousel"
        class="snap-start"
      />
    </div>
    <button
      type="button"
      class="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full shadow items-center justify-center bg-old-neutral-200/90 hover:bg-old-neutral-300 dark:bg-old-neutral-800/90 dark:hover:bg-old-neutral-700 opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 transition-opacity"
      aria-label="Scroll right"
      @click="scrollCarousel('right')"
    >
      <UIcon name="i-heroicons-chevron-right" class="size-6" />
    </button>
  </section>
</template>
