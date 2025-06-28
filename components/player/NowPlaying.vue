<template>
  <div class="flex flex-col items-center text-center space-y-6">
    <!-- Обложка -->
    <img
        :src="currentTrack.cover_url || placeholder"
        alt="Track cover"
        class="w-64 h-64 md:w-80 md:h-80 rounded-lg object-cover shadow-xl"
    />

    <!-- Название трека -->
    <h2 class="text-2xl font-bold truncate w-full">{{ currentTrack.title }}</h2>

    <!-- Автор(ы) -->
    <p class="text-base text-gray-300">
      {{ artistNames }}
    </p>

    <!-- Прогресс -->
    <div class="w-full px-6 space-y-1">
      <input
          type="range"
          min="0"
          :max="duration"
          step="0.1"
          v-model.number="currentTimeProxy"
          @change="playerStore.seek(currentTimeProxy)"
          class="w-full accent-green-500"
      />
      <div class="flex justify-between text-sm text-gray-400">
        <span>{{ formatTime(currentTimeProxy) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
    </div>

    <!-- Кнопки управления -->
    <div class="flex items-center justify-center space-x-8 mt-4">
      <button @click="playerStore.toggleShuffle()" :class="{ 'text-green-500': isShuffle }">
        <UIcon name="i-heroicons-arrow-path-rounded-square" class="w-6 h-6" />
      </button>
      <button @click="playerStore.playPrevious()">
        <UIcon name="i-heroicons-backward" class="w-6 h-6" />
      </button>
      <button
          @click="isPlaying ? playerStore.pause() : playerStore.resume()"
          class="bg-white text-black p-4 rounded-full hover:bg-gray-200 transition"
      >
        <UIcon :name="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'" class="w-6 h-6" />
      </button>
      <button @click="playerStore.playNext()">
        <UIcon name="i-heroicons-forward" class="w-6 h-6" />
      </button>
      <button @click="playerStore.toggleRepeat()" :class="{ 'text-green-500': isRepeat }">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6" />
      </button>
      <button @click="playerStore.enterFullScreenMode()">Полноэкранный режим</button>
      <button @click="playerStore.exitFullScreenMode()">Назад</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'
import { ref, watch, computed } from 'vue'

const playerStore = usePlayerStore()
const {
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isRepeat,
  isShuffle
} = storeToRefs(playerStore)

const placeholder = 'https://via.placeholder.com/300x300?text=No+Cover'

const currentTimeProxy = ref(currentTime.value)
watch(currentTime, (val) => { currentTimeProxy.value = val })

const formatTime = (s: number) => {
  const min = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

const artistNames = computed(() =>
    currentTrack.value?.track_authors?.map(t => t.author.name).join(', ') || 'Unknown Artist'
)
</script>
