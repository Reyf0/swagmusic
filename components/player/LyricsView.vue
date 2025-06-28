<template>
  <div class="space-y-6 text-center">
    <h2 class="text-xl font-bold mb-4">Lyrics</h2>

    <div v-if="!lyrics" class="text-gray-400">
      No lyrics available.
    </div>

    <pre v-else class="whitespace-pre-wrap text-lg leading-relaxed text-gray-100">
{{ lyrics }}
    </pre>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'

const playerStore = usePlayerStore()
const { currentTrack } = storeToRefs(playerStore)

const lyrics = ref<string | null>(null)

// Загрузка текста песни по текущему треку
const fetchLyrics = async () => {
  lyrics.value = null

  const title = currentTrack.value?.title
  const artist = currentTrack.value?.track_authors?.[0]?.author?.name

  if (!title || !artist) return


  // Здесь можно подключить API или Supabase TODO Заменить способ получение текста (Musixmatch, Genius)
  const response = await fetch(`/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`)
  if (response.ok) {
    const data = await response.json()
    lyrics.value = data.lyrics || null
  } else {
    lyrics.value = null
  }
}

// Следим за сменой трека
watch(currentTrack, () => {
  fetchLyrics()
}, { immediate: true })
</script>
