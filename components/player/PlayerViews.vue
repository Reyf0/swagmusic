<template>
  <div class="fixed inset-0 z-40 flex pointer-events-none">
    <!-- Основной контентный полноэкранный View (например: Lyrics, Now in fullscreen) -->
    <transition name="fade">
      <div
          v-if="fullscreenView"
          class="absolute inset-0 bg-black pointer-events-auto"
      >
        <component :is="fullscreenViewComponent" />
      </div>
    </transition>

    <!-- Sidebar Views (Now Playing, Queue) -->
    <TransitionGroup name="slide-fade" tag="div" class="ml-auto flex h-full pointer-events-auto">
      <div
          v-for="view in sidebarViews"
          :key="view"
          class="w-[340px] max-w-[50vw] bg-neutral-900 border-l border-white/10 h-full overflow-y-auto"
      >
        <component :is="viewComponents[view]" />
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import NowPlaying from '@/components/player/NowPlaying.vue'
import QueueView from '@/components/player/QueueView.vue'
import LyricsView from '@/components/player/LyricsView.vue'
import { computed } from 'vue'

const playerStore = usePlayerStore()

const viewComponents = {
  now: NowPlaying,
  queue: QueueView,
  lyrics: LyricsView
}

const fullscreenCompatible = {
  now: true,
  lyrics: true,
  queue: false
}

const sidebarCompatible = {
  now: true,
  lyrics: false,
  queue: true
}

const fullscreenView = computed(() =>
    playerStore.activeViews.find(view => fullscreenCompatible[view])
)

const fullscreenViewComponent = computed(() =>
    fullscreenView.value ? viewComponents[fullscreenView.value] : null
)

const sidebarViews = computed(() =>
    playerStore.activeViews.filter(view => sidebarCompatible[view])
)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
