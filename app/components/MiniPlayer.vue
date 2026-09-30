<script setup lang="ts">
// Desktop player bar (the mobile player is components/player/MobilePlayer.vue).
const player = usePlayerStore()
const {
  currentTrack,
  isPlaying,
  isLoading,
  currentTime,
  duration,
  volume,
  repeatMode,
  isShuffle
} = storeToRefs(player)

const { isMuted } = storeToRefs(player)
const toggleMute = () => player.toggleMute()

const progress = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0)

function onSeek(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
  player.seek(percent * duration.value)
}

function onSeekKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') player.seek(currentTime.value + 5)
  else if (e.key === 'ArrowLeft') player.seek(currentTime.value - 5)
  else return
  e.preventDefault()
}

const repeatIcon = computed(() => repeatMode.value === 'one' ? 'i-lucide-repeat-1' : 'i-lucide-repeat')
const repeatLabel = computed(() => ({ off: 'Repeat: off', all: 'Repeat: all', one: 'Repeat: one' }[repeatMode.value]))
</script>

<template>
  <div v-if="currentTrack" class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-black text-white px-4 py-3 shadow-lg">
    <!-- Track Info -->
    <div class="flex items-center gap-3 min-w-0">
      <button
        type="button"
        class="size-12 shrink-0 bg-old-neutral-800 flex items-center justify-center overflow-hidden rounded"
        aria-label="Show now playing"
        @click="player.toggleView('now')"
      >
        <CoverImage v-if="currentTrack.cover_url" :src="currentTrack.cover_url" :size="48" priority class="size-12 object-cover" />
        <UIcon v-else name="i-heroicons-musical-note" class="text-old-neutral-400" />
      </button>
      <div class="flex flex-col min-w-0">
        <NuxtLink :to="`/tracks/${currentTrack.id}`" class="block font-semibold truncate hover:underline">{{ currentTrack.title }}</NuxtLink>
        <div class="text-sm text-old-neutral-400 truncate">
          <TrackArtists :authors="currentTrack.authors" />
        </div>
      </div>
      <LikeButton :track-id="currentTrack.id" class="shrink-0" />
    </div>

    <div class="flex flex-col items-center gap-1 w-[min(40vw,560px)]">
      <!-- Controls -->
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-shuffle"
          variant="ghost"
          color="neutral"
          size="sm"
          :class="isShuffle ? 'text-green-500' : 'text-old-neutral-400 hover:text-white'"
          :aria-pressed="isShuffle"
          aria-label="Shuffle"
          @click="player.toggleShuffle()"
        />
        <UButton
          icon="i-heroicons-backward-solid"
          variant="ghost"
          color="neutral"
          class="text-old-neutral-300 hover:text-white"
          aria-label="Previous track"
          @click="player.playPrevious()"
        />
        <button
          type="button"
          class="hover:scale-105 transition flex justify-center items-center bg-white text-old-neutral-900 size-10 rounded-full"
          :aria-label="isPlaying ? 'Pause' : 'Play'"
          @click="player.togglePlay()"
        >
          <UIcon v-if="isLoading" name="i-lucide-loader-circle" class="size-5 animate-spin" />
          <UIcon v-else :name="isPlaying ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'" class="size-5" />
        </button>
        <UButton
          icon="i-heroicons-forward-solid"
          variant="ghost"
          color="neutral"
          class="text-old-neutral-300 hover:text-white"
          aria-label="Next track"
          @click="player.playNext()"
        />
        <UButton
          :icon="repeatIcon"
          variant="ghost"
          color="neutral"
          size="sm"
          :class="repeatMode !== 'off' ? 'text-green-500' : 'text-old-neutral-400 hover:text-white'"
          :aria-label="repeatLabel"
          :title="repeatLabel"
          @click="player.cycleRepeat()"
        />
      </div>

      <!-- Progress Bar -->
      <div class="flex items-center gap-2 text-xs w-full">
        <span class="w-10 text-right tabular-nums text-old-neutral-400">{{ formatDuration(currentTime) }}</span>
        <div
          class="group flex-grow h-1.5 bg-old-neutral-700 rounded cursor-pointer relative"
          role="slider"
          tabindex="0"
          aria-label="Seek"
          :aria-valuemin="0"
          :aria-valuemax="Math.round(duration)"
          :aria-valuenow="Math.round(currentTime)"
          :aria-valuetext="formatDuration(currentTime)"
          @click="onSeek"
          @keydown="onSeekKey"
        >
          <div class="absolute top-0 left-0 h-full bg-white group-hover:bg-green-500 rounded" :style="{ width: `${progress}%` }" />
        </div>
        <span class="w-10 tabular-nums text-old-neutral-400">{{ formatDuration(duration) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-end gap-1">
      <UButton
        icon="i-lucide-panel-right"
        variant="ghost"
        color="neutral"
        :class="player.isViewOpen('now') ? 'text-green-500' : 'text-old-neutral-300'"
        aria-label="Now playing"
        title="Now playing"
        @click="player.toggleView('now')"
      />
      <UButton
        icon="i-lucide-mic-vocal"
        variant="ghost"
        color="neutral"
        :class="player.isViewOpen('lyrics') ? 'text-green-500' : 'text-old-neutral-300'"
        aria-label="Lyrics"
        title="Lyrics"
        @click="player.toggleView('lyrics')"
      />
      <UButton
        icon="i-heroicons-queue-list"
        variant="ghost"
        color="neutral"
        :class="player.isViewOpen('queue') ? 'text-green-500' : 'text-old-neutral-300'"
        aria-label="Queue"
        title="Queue"
        @click="player.toggleView('queue')"
      />

      <!-- Volume -->
      <div class="flex items-center gap-2 w-32 ml-2">
        <UButton
          :icon="isMuted ? 'i-heroicons-speaker-x-mark' : 'i-heroicons-speaker-wave'"
          variant="ghost"
          color="neutral"
          size="sm"
          class="text-old-neutral-300"
          :aria-label="isMuted ? 'Unmute' : 'Mute'"
          @click="toggleMute"
        />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="volume"
          class="w-full accent-green-500 cursor-pointer"
          aria-label="Volume"
          @input="player.setVolume(($event.target as HTMLInputElement).valueAsNumber)"
        >
      </div>
    </div>
  </div>
</template>
