<script setup lang="ts">
import type { Track } from "@/types/global";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<{
  tracks: Track[]
}>()

const playerStore = usePlayerStore()
const { isPlaying } = storeToRefs(playerStore)
const { playTrack, isCurrentTrack } = usePlayTrack()

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
        <div
            v-for="track in tracks"
            :key="track.id"
            class="flex-shrink-0 flex flex-col bg-gray-100 rounded shadow p-3 hover:shadow-md transition track-card"
        >
          <div class="h-48 relative flex justify-center items-center aspect-square group grow overflow-hidden rounded shadow-md mb-3">
            <UIcon v-if="!track.cover_url" name="i-heroicons-musical-note" class="icon text-gray-400" />
            <img
                v-else
                :src="track?.cover_url"
                alt="Cover"
                class="w-full object-cover rounded"
            >
            <div class="absolute inset-0 bg-transparent group-hover:bg-black transition-all duration-300 flex items-center justify-center">
              <button
                  class="play-button opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
                  @click="playTrack(track, tracks)"
              >
                <UIcon
                    :name="isCurrentTrack(track) && isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
                    class="w-6 h-6" />
              </button>
            </div>
          </div>
          <div class="track-label">
            <p class="font-semibold">{{ track.title }}</p>
            <span v-if="track.track_authors && track.track_authors.length">
              <div class="truncate whitespace-nowrap overflow-hidden">
                <span v-for="(rel, index) in track.track_authors" :key="rel.author.id" class="text-sm text-gray-500">
                  <NuxtLink
                      :to="`/authors/${rel.author.id}`"
                      class="text-sm text-gray-400 hover:underline"
                  >{{ rel.author.name }}</NuxtLink>
                  <span v-if="index < track.track_authors.length - 1">,&nbsp;</span>
                </span>
              </div>
            </span>
          </div>
        </div>
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

.icon {
  @apply w-5 h-5 text-gray-400;
}

.group:hover > .carousel-button {
  opacity: 1;
}

.carousel-button {
  @apply bg-gray-200 hover:bg-gray-300 rounded-full shadow flex items-center justify-center opacity-0 transition-opacity duration-300;
  width: 40px;
  height: 40px;
  z-index: 10;
}

.carousel-button.left-0 {
  left: -20px;
}

.carousel-button.right-0 {
  right: -20px;
}

.track-card .play-button {
  @apply absolute bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100;
}

.track-card:hover .play-button {
  opacity: 1;
}

.carousel-container {
  position: relative;
}

.carousel-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.3s;
}

.carousel-button.left-0 {
  left: 0;
}
.carousel-button.right-0 {
  right: 0;
}

.carousel-container:hover .carousel-button {
  opacity: 1;
}

</style>