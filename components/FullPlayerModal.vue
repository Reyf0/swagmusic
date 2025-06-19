<template>
  <div class="fixed inset-0 bg-neutral-900 text-white z-50 flex flex-col">
    <!-- Верх: кнопка закрытия -->
    <div class="flex justify-end p-4">
      <button @click="closeFullPlayer" class="text-white hover:text-gray-300">
        <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
      </button>
    </div>

    <!-- Центр: обложка и трек -->
    <div class="flex-1 flex flex-col items-center justify-center gap-6 text-center px-4">
      <img
          :src="currentTrack.cover_url || 'https://via.placeholder.com/500x500?text=No+Cover'"
          class="w-60 h-60 md:w-96 md:h-96 rounded-xl object-cover shadow-xl"
      />
      <div>
        <h2 class="text-2xl font-bold">{{ currentTrack.title }}</h2>
        <p class="text-gray-400">
          {{ currentTrack.track_authors?.map(a => a.author.name).join(', ') || 'Unknown Artist' }}
        </p>
      </div>
    </div>

    <!-- Низ: управление и прогресс -->
    <div class="p-6 flex flex-col gap-4">
      <!-- Прогресс -->
      <div class="flex items-center gap-2 text-sm">
        <span class="w-12 text-right">{{ formatTime(currentTime) }}</span>
        <input
            type="range"
            min="0"
            :max="duration"
            v-model.number="currentTimeProxy"
            @change="() => seek(currentTimeProxy)"
            class="w-full accent-green-500"
        />
        <span class="w-12">{{ formatTime(duration) }}</span>
      </div>

      <!-- Управление -->
      <div class="flex justify-center gap-6 mt-2">
        <button @click="toggleShuffle" :class="{ 'text-green-500': isShuffle }" title="Shuffle">
          <UIcon name="i-heroicons-arrow-path-rounded-square" class="w-6 h-6" />
        </button>
        <button @click="playPrevious" title="Previous">
          <UIcon name="i-heroicons-backward" class="w-6 h-6" />
        </button>
        <button
            @click="isPlaying ? pause() : resume()"
            class="p-3 bg-white text-gray-900 rounded-full hover:bg-gray-300"
            title="Play/Pause"
        >
          <UIcon :name="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'" class="w-7 h-7" />
        </button>
        <button @click="playNext" title="Next">
          <UIcon name="i-heroicons-forward" class="w-6 h-6" />
        </button>
        <button @click="toggleRepeat" :class="{ 'text-green-500': isRepeat }" title="Repeat">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const store = usePlayerStore()
const {
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isRepeat,
  isShuffle,
} = storeToRefs(store)

const {
  pause,
  resume,
  playNext,
  playPrevious,
  toggleRepeat,
  toggleShuffle,
  seek,
  closeFullPlayer,
} = store

const currentTimeProxy = computed({
  get: () => currentTime.value,
  set: (value) => {
    currentTime.value = value
  },
})

const formatTime = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec < 10 ? '0' : ''}${sec}`
}
</script>
