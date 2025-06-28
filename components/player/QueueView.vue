<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold mb-2">Up Next</h2>

    <div v-if="queue.length === 0" class="text-gray-400">
      Queue is empty.
    </div>

    <ul class="space-y-4">
      <li
          v-for="(track, index) in queue"
          :key="track.id"
          :ref="el => setTrackRef(track.id, el)"
          :class="{ playing: isCurrent(track) }"
          class="flex items-center gap-4 p-2 hover:bg-white/10 rounded cursor-pointer"
          @click="playTrack(track)"
      >
        <img
            :src="track.cover_url || placeholder"
            alt="Cover"
            class="w-12 h-12 object-cover rounded"
        />
        <div class="flex flex-col truncate">
          <span class="font-semibold truncate">{{ track.title }}</span>
          <span class="text-sm text-gray-400 truncate">
            {{ track.track_authors?.map(a => a.author.name).join(', ') || 'Unknown Artist' }}
          </span>
        </div>
        <span v-if="isCurrent(track)" class="text-green-500 ml-auto">Playing</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'
import { ref, watch, onMounted, nextTick, computed } from 'vue'


const trackRefs = ref<Record<string, HTMLElement>>({})

const setTrackRef = (id: string, el: HTMLElement | null) => {
  if (el) trackRefs.value[id] = el
}

const scrollToCurrentTrack = async () => {
  await nextTick()
  const current = trackRefs.value[currentTrack.value?.id]
  if (current) {
    current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}


const playerStore = usePlayerStore()
const { currentTrackIndex, queue, currentTrack } = storeToRefs(playerStore)

const placeholder = 'https://via.placeholder.com/300x300?text=No+Cover'

const upcoming = computed(() => {
  if (currentTrackIndex.value === -1) return queue.value
  return queue.value.slice(currentTrackIndex.value + 1)
})

const isCurrent = (track: any) => currentTrack.value?.id === track.id

const playTrack = (track: any) => {
  playerStore.play(track, queue.value)
}

watch(currentTrack, () => scrollToCurrentTrack())
onMounted(() => scrollToCurrentTrack())
</script>

<style scoped>
@keyframes flash {
  from { background-color: rgba(34, 197, 94, 0.2); }
  to   { background-color: transparent; }
}

li.playing {
  animation: flash 1s ease-in-out;
}

</style>