<script setup lang="ts">
import Queue from '@/components/player/views/Queue.vue'
import Lyrics from '@/components/player/views/Lyrics.vue'

// Mobile player: a mini bar at the bottom of the layout that expands into a
// full-screen sheet (swipe down or tap the chevron to close).
const player = usePlayerStore()
const { currentTrack, isPlaying, isLoading, currentTime, duration, repeatMode, isShuffle } = storeToRefs(player)

const expanded = ref(false)
const tab = ref<'player' | 'queue' | 'lyrics'>('player')

const progress = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0)
const repeatIcon = computed(() => repeatMode.value === 'one' ? 'i-lucide-repeat-1' : 'i-lucide-repeat')

function open() {
  tab.value = 'player'
  expanded.value = true
}

function close() {
  expanded.value = false
}

// Close the sheet when navigating (e.g. tapping an artist link inside it).
const route = useRoute()
watch(() => route.fullPath, close)

// Prevent the page behind the sheet from scrolling.
watch(expanded, (v) => {
  document.documentElement.style.overflow = v ? 'hidden' : ''
})
onBeforeUnmount(() => { document.documentElement.style.overflow = '' })

function onSeekInput(e: Event) {
  player.seek((e.target as HTMLInputElement).valueAsNumber)
}

/* swipe down to close */
const dragY = ref(0)
let startY: number | null = null
let startedAtTop = false

function onTouchStart(e: TouchEvent) {
  const scroller = (e.currentTarget as HTMLElement).querySelector('[data-scroll]')
  startedAtTop = !scroller || scroller.scrollTop <= 0
  startY = e.touches[0]?.clientY ?? null
  dragY.value = 0
}

function onTouchMove(e: TouchEvent) {
  if (startY === null || !startedAtTop) return
  const dy = (e.touches[0]?.clientY ?? startY) - startY
  dragY.value = Math.max(0, dy)
}

function onTouchEnd() {
  if (dragY.value > 100) close()
  dragY.value = 0
  startY = null
}

const sheetStyle = computed(() => dragY.value
  ? { transform: `translateY(${dragY.value}px)`, transition: 'none' }
  : {})
</script>

<template>
  <div v-if="currentTrack">
    <!-- Mini bar -->
    <div class="relative bg-old-neutral-100 dark:bg-old-neutral-950 border-t border-old-neutral-200 dark:border-old-neutral-800">
      <div class="absolute top-0 left-0 h-0.5 bg-green-500" :style="{ width: `${progress}%` }" />
      <div class="flex items-center gap-3 px-3 py-2">
        <button type="button" class="flex items-center gap-3 min-w-0 flex-1 text-left" aria-label="Open player" @click="open">
          <CoverImage :src="currentTrack.cover_url" :size="48" priority class="size-11 rounded-md object-cover shrink-0" />
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">{{ currentTrack.title }}</div>
            <div class="text-xs text-old-neutral-500 truncate">{{ artistNames(currentTrack) }}</div>
          </div>
        </button>
        <LikeButton :track-id="currentTrack.id" />
        <button
          type="button"
          class="size-10 rounded-full flex items-center justify-center"
          :aria-label="isPlaying ? 'Pause' : 'Play'"
          @click="player.togglePlay()"
        >
          <UIcon v-if="isLoading" name="i-lucide-loader-circle" class="size-6 animate-spin" />
          <UIcon v-else :name="isPlaying ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'" class="size-7" />
        </button>
      </div>
    </div>

    <!-- Full-screen sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <section
          v-if="expanded"
          class="fixed inset-0 z-50 flex flex-col bg-white text-old-neutral-900 dark:bg-old-neutral-900 dark:text-white transition-transform duration-200"
          :style="sheetStyle"
          role="dialog"
          aria-modal="true"
          aria-label="Now playing"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend.passive="onTouchEnd"
        >
          <header class="flex items-center justify-between px-3 pt-3 pb-1">
            <UButton icon="i-heroicons-chevron-down" variant="ghost" color="neutral" size="lg" aria-label="Close player" @click="close" />
            <div class="flex rounded-full bg-old-neutral-100 dark:bg-old-neutral-800 p-1 text-sm">
              <button
                v-for="t in (['player', 'queue', 'lyrics'] as const)"
                :key="t"
                type="button"
                class="px-3 py-1 rounded-full capitalize"
                :class="tab === t ? 'bg-white dark:bg-old-neutral-700 font-medium' : 'text-old-neutral-500'"
                @click="tab = t"
              >
                {{ t === 'player' ? 'Now playing' : t }}
              </button>
            </div>
            <TrackMenu :track="currentTrack" />
          </header>

          <div data-scroll class="flex-1 overflow-y-auto">
            <div v-if="tab === 'player'" class="flex flex-col h-full px-6 pb-8 pt-4">
              <div class="flex-1 flex items-center justify-center min-h-0">
                <CoverImage
                  :src="currentTrack.cover_url"
                  :size="640"
                  priority
                  icon-class="size-20"
                  class="w-full max-w-sm aspect-square object-cover rounded-xl shadow-2xl"
                />
              </div>

              <div class="mt-6 flex items-center gap-3">
                <div class="min-w-0 flex-1">
                  <h2 class="text-xl font-bold truncate">{{ currentTrack.title }}</h2>
                  <p class="text-old-neutral-500 dark:text-old-neutral-400 truncate">
                    <TrackArtists :authors="currentTrack.authors" />
                  </p>
                </div>
                <LikeButton :track-id="currentTrack.id" size="lg" />
              </div>

              <div class="mt-4">
                <input
                  type="range"
                  min="0"
                  :max="duration || 0"
                  step="1"
                  :value="currentTime"
                  class="w-full accent-green-500"
                  aria-label="Seek"
                  @change="onSeekInput"
                >
                <div class="flex justify-between text-xs text-old-neutral-500 tabular-nums">
                  <span>{{ formatDuration(currentTime) }}</span>
                  <span>{{ formatDuration(duration) }}</span>
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between">
                <UButton
                  icon="i-lucide-shuffle"
                  variant="ghost"
                  color="neutral"
                  size="lg"
                  :class="isShuffle ? 'text-green-500' : ''"
                  :aria-pressed="isShuffle"
                  aria-label="Shuffle"
                  @click="player.toggleShuffle()"
                />
                <UButton icon="i-heroicons-backward-solid" variant="ghost" color="neutral" size="xl" aria-label="Previous track" @click="player.playPrevious()" />
                <button
                  type="button"
                  class="size-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition"
                  :aria-label="isPlaying ? 'Pause' : 'Play'"
                  @click="player.togglePlay()"
                >
                  <UIcon v-if="isLoading" name="i-lucide-loader-circle" class="size-8 animate-spin" />
                  <UIcon v-else :name="isPlaying ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'" class="size-8" />
                </button>
                <UButton icon="i-heroicons-forward-solid" variant="ghost" color="neutral" size="xl" aria-label="Next track" @click="player.playNext()" />
                <UButton
                  :icon="repeatIcon"
                  variant="ghost"
                  color="neutral"
                  size="lg"
                  :class="repeatMode !== 'off' ? 'text-green-500' : ''"
                  :aria-label="`Repeat: ${repeatMode}`"
                  @click="player.cycleRepeat()"
                />
              </div>
            </div>

            <Queue v-else-if="tab === 'queue'" mode="sidebar" />
            <Lyrics v-else mode="sidebar" />
          </div>
        </section>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.25s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}
</style>
