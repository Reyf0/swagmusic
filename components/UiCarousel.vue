<script setup lang="ts">
import type { Track } from "@/types/global";

const props = defineProps<{
  tracks: Track[]
}>()

const carousel = ref<HTMLElement | null>(null)

const scrollCarousel = (direction: 'left' | 'right') => {
  if (!carousel.value) return
  const scrollAmount = direction === 'left' ? -300 : 300
  carousel.value.scrollBy({ left: scrollAmount, behavior: 'smooth' })
}

</script>

<template>
  <section>
    <div class="relative carousel-container">
      <button
          class="carousel-button left-0"
          @click="scrollCarousel( 'left')"
      >
        <UIcon name="i-heroicons-chevron-left" class="w-6 h-6" />
      </button>
      <div ref="carousel" class="flex gap-4 overflow-x-scroll scrollbar-hide tracks-carousel">
        <TrackCard
          v-for="track in tracks"
          :key="track.id"
          :track="track"
          :tracks="tracks"
          variant="carousel"
        />
      </div>
      <button
          class="carousel-button right-0"
          @click="scrollCarousel('right')"
      >
        <UIcon name="i-heroicons-chevron-right" class="w-6 h-6" />
      </button>
    </div>
  </section>
</template>

<style lang="postcss" scoped>
.carousel-container {
  position: relative;
}

.carousel-button {
  @apply bg-gray-200 hover:bg-gray-300 rounded-full shadow flex items-center justify-center transition-opacity duration-300;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  z-index: 10;
  opacity: 0;
}

.carousel-button.left-0 {
  left: -20px;
}

.carousel-button.right-0 {
  right: -20px;
}

.carousel-container:hover .carousel-button {
  opacity: 1;
}
</style>