<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'
import { ref, computed } from 'vue'


const player = usePlayerStore()
const {
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isRepeat,
  isShuffle
} = storeToRefs(player)
const isMuted = ref(false)
const recentVolume = ref(0)

const toggleMute = () => {
  if (isMuted.value) {
    player.setVolume(recentVolume.value || 0.5) // Restore recent volume or default to 50%
  } else {
    recentVolume.value = volume.value
    player.setVolume(0)
  }
  isMuted.value = !isMuted.value
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const progress = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0)

const onSeek = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
  player.seek(percent * duration.value)
}
</script>

<template>
  <div class="fixed flex flex-row justify-between bottom-0 left-0 right-0 z-30 bg-black text-white p-3 shadow-lg backdrop-blur">
    <div>
      <!-- Track Info -->
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-gray-800 flex items-center justify-center overflow-hidden rounded">
          <img
              v-if="currentTrack?.cover_url"
              :src="currentTrack.cover_url"
              class="w-12 h-12 object-cover"
              alt="Cover"
          />
          <UIcon v-else name="i-heroicons-musical-note" class="text-gray-400" />
        </div>
        <div>
          <div class="font-semibold truncate max-w-[160px]">{{ currentTrack?.title }}</div>
          <div class="text-sm text-gray-400 truncate max-w-[160px]">
            {{ currentTrack?.track_authors?.map(a => a.author.name).join(', ') || 'Unknown Artist' }}
          </div>
        </div>
      </div>
    </div>
    <div class="max-w-6xl flex flex-col gap-2">

      <!-- Top Row: Controls -->
      <div class="flex justify-center items-center">
        <!-- Controls -->
        <div class="flex self-center items-center gap-4">
          <UButton
              icon="i-heroicons-arrow-path-rounded-square"
              variant="ghost"
              color="white"
              :class="{ 'text-green-500': isShuffle }"
              @click="player.toggleShuffle()"
          />
          <UButton icon="i-heroicons-backward" variant="ghost" color="white" @click="player.playPrevious()" />
          <UButton
              color="white"
              class="flex justify-center items-center bg-white text-gray-900 w-10 h-10 rounded-full"
              @click="isPlaying ? player.pause() : player.resume()"
          >
            <UIcon :name="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"/>
          </UButton>
          <UButton icon="i-heroicons-forward" variant="ghost" color="white" @click="player.playNext()" />
          <UButton
              icon="i-heroicons-arrow-path"
              variant="ghost"
              color="white"
              :class="{ 'text-green-500': isRepeat }"
              @click="player.toggleRepeat()"
          />
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="flex items-center gap-2 text-xs min-w-xl">
        <span class="w-10 text-right">{{ formatTime(currentTime) }}</span>
        <div class="flex-grow h-2 bg-gray-700 rounded cursor-pointer relative" @click="onSeek">
          <div class="absolute top-0 left-0 h-full bg-green-500 rounded" :style="{ width: `${progress}%` }" />
        </div>
        <span class="w-10">{{ formatTime(duration) }}</span>
      </div>
    </div>


    <div class="flex items-center">
      <!-- Buttons -->
      <UButton
          icon="i-heroicons-chevron-up"
          size="lg"
          variant="ghost"
          color="white"
          @click="player.isViewOpen('now') ? player.closeView('now') : player.openView('now')"
      />

      <UButton
          icon="i-heroicons-microphone"
          size="lg"
          variant="ghost"
          color="white"
          @click="player.isViewOpen('lyrics') ? player.closeView('lyrics') : player.openView('lyrics')"
      />

      <UButton
          icon="i-heroicons-queue-list"
          size="lg"
          variant="ghost"
          color="white"
          @click="player.isViewOpen('queue') ? player.closeView('queue') : player.openView('queue')"
      />

      <!-- Volume -->
      <div class="flex items-center gap-2 w-24">
        <UIcon
            :name="volume > 0 && !isMuted ? 'i-heroicons-speaker-wave' : 'i-heroicons-speaker-x-mark'"
            class="w-5 h-5"
            @click="toggleMute"
        />
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            @input="player.setVolume($event.target.valueAsNumber); isMuted = $event.target.valueAsNumber === 0"
            class="w-full"
        />
      </div>
    </div>

  </div>
</template>

