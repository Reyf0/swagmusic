<template>
  <div class="w-full h-full flex flex-col bg-gray-900 text-white p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Lyrics</h2>
      <UButton icon="i-heroicons-x-mark" size="sm" color="gray" @click="player.closeView('lyrics')" />
    </div>

    <div class="flex-grow overflow-y-auto whitespace-pre-line leading-relaxed">
      <p v-if="lyrics" class="text-center text-lg">{{ lyrics }}</p>
      <p v-else class="text-center text-gray-400">Lyrics not available for this track.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'

const player = usePlayerStore()
const { currentTrack } = storeToRefs(player)

const lyrics = ref<string | null>(null)

watch(currentTrack, async (track) => {
  if (!track) return

  // TODO Implement a proper API endpoint to fetch lyrics
  const response = await fetch(`/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`)
  if (response.ok) {
    const data = await response.json()
    lyrics.value = data.lyrics || null
  } else {
    lyrics.value = null
  }
  lyrics.value = track.lyrics || null
})
</script>
