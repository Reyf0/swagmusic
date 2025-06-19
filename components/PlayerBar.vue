<template>
  <div
      v-if="currentTrack"
      class="fixed bottom-0 left-0 right-0 bg-neutral-900 text-white px-4 py-3 flex items-center justify-between shadow-lg z-50"
  >
    <!-- Левая часть: Обложка и инфо -->
    <div class="flex items-center gap-4 w-1/3 min-w-0">
      <img
          v-if="currentTrack.cover_url"
          :src="currentTrack.cover_url"
          alt="cover"
          class="w-14 h-14 object-cover rounded-md"
      />
      <div class="truncate">
        <div class="font-semibold truncate">{{ currentTrack.title }}</div>
        <div class="text-sm text-gray-400 truncate">
          {{ currentTrack.author_name || 'Unknown Artist' }}
        </div>
      </div>
    </div>

    <!-- Центр: Кнопки и прогресс -->
    <div class="flex flex-col items-center w-1/3">
      <div class="flex items-center gap-6 mb-2">
        <button @click="playPrevious">
          <Icon name="lucide:skip-back" class="w-6 h-6" />
        </button>
        <button @click="togglePlay">
          <Icon
              :name="isPlaying ? 'lucide:pause' : 'lucide:play'"
              class="w-8 h-8"
          />
        </button>
        <button @click="playNext">
          <Icon name="lucide:skip-forward" class="w-6 h-6" />
        </button>
      </div>
      <div class="flex items-center w-full gap-2 text-xs">
        <span class="w-10 text-right">{{ formatTime(currentTime) }}</span>
        <input
            type="range"
            min="0"
            :max="duration"
            step="1"
            v-model.number="currentTimeProxy"
            @change="onSeek"
            class="w-full accent-green-500"
        />
        <span class="w-10 text-left">{{ formatTime(duration) }}</span>
      </div>
    </div>

    <!-- Правая часть: Громкость -->
    <div class="flex items-center gap-2 w-1/3 justify-end pr-2">
      <Icon name="lucide:volume-2" class="w-5 h-5" />
      <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          v-model.number="volume"
          @input="setVolume(volume)"
          class="w-24 accent-green-500"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'

const player = usePlayerStore()
const {
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
} = storeToRefs(player)

const {
  playPrevious,
  playNext,
  resume,
  pause,
  seek,
  setVolume,
} = player

// Прокси для прогресс-бара
const currentTimeProxy = computed({
  get: () => currentTime.value,
  set: (value) => {
    currentTime.value = value
  }
})

const onSeek = () => {
  seek(currentTimeProxy.value)
}

const togglePlay = () => {
  isPlaying.value ? pause() : resume()
}

const formatTime = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec < 10 ? '0' : ''}${sec}`
}
</script>

<style scoped>
input[type="range"] {
  cursor: pointer;
}
</style>
