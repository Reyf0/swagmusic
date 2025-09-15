<template>
  <div class="w-full h-full flex flex-col bg-gray-900 text-white p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Queue</h2>
      <UButton icon="i-heroicons-x-mark" size="sm" color="gray" @click="player.closeView('queue')" />
    </div>

    <div class="flex-grow overflow-y-auto space-y-2">
      <div
          v-for="(track) in queue"
          :key="track.id"
          class="flex items-center justify-between bg-gray-800 p-3 rounded cursor-pointer hover:bg-gray-700"
          @click="player.play(track, queue)"
      >
        <div class="flex items-center space-x-3">
          <div class="flex justify-center items-center w-12 h-12 bg-gray-700 overflow-hidden rounded">
            <img
                v-if="track.cover_url"
                :src="track.cover_url"
                alt="cover"
                class="w-full h-full object-cover"
            >
            <UIcon v-else name="i-heroicons-musical-note" class="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p class="font-semibold">{{ track.title }}</p>
            <p class="text-sm text-gray-400">
              {{ track.track_authors?.map(a => a.author.name).join(', ') || 'Unknown Artist' }}
            </p>
          </div>
        </div>
        <div>
          <UIcon
              v-if="track.id === currentTrack?.id"
              name="i-heroicons-speaker-wave"
              class="text-green-500"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'

const player = usePlayerStore()
const { queue, currentTrack } = storeToRefs(player)
</script>
