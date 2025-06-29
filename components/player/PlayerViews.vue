<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { TransitionGroup } from 'vue'
import NowPlaying from '@/components/player/views/NowPlaying.vue'
import Queue  from '@/components/player/views/Queue.vue'
import Lyrics from '@/components/player/views/Lyrics.vue'

const player = usePlayerStore()

defineProps<{
  view: 'now' | 'queue' | 'lyrics'
  mode: 'sidebar' | 'fullscreen'
}>()

// Карта View → компонент
const viewComponents = {
  now: NowPlaying,
  queue: Queue,
  lyrics: Lyrics
}

</script>

<template>
  <Transition name="fade" mode="out-in">
    <component
        :is="viewComponents[view]"
        :key="`${mode}-${view}`"
    />
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
