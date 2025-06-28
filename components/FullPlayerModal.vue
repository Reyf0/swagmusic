<template>
  <transition name="slide-up">
    <div
        v-if="playerStore.showFullPlayer"
        class="fixed inset-0 z-50 bg-black text-white flex flex-col transition-transform duration-500"
    >
      <!-- Tabs -->
      <div class="flex justify-around py-4 border-b border-white/10 text-sm font-semibold uppercase tracking-wider">
        <button
            @click="activeTab = 'now'"
            :class="tabClass('now')"
        >
          Now Playing
        </button>
        <button
            @click="activeTab = 'lyrics'"
            :class="tabClass('lyrics')"
        >
          Lyrics
        </button>
        <button
            @click="activeTab = 'queue'"
            :class="tabClass('queue')"
        >
          Queue
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <Transition name="fade" mode="out-in">
          <component :is="tabComponent" :key="activeTab" />
        </Transition>
      </div>

      <!-- Close button -->
      <button
          @click="playerStore.closeFullPlayer"
          class="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
      >
        <UIcon name="i-heroicons-chevron-down" class="w-5 h-5" />
      </button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import NowPlaying from '@/components/player/NowPlaying.vue'
// следующие подключим позже:
import LyricsView from '@/components/player/LyricsView.vue'
import QueueView from '@/components/player/QueueView.vue'

const playerStore = usePlayerStore()

const activeTab = ref<'now' | 'lyrics' | 'queue'>('now')

const tabComponent = computed(() => {
  switch (activeTab.value) {
    case 'lyrics': return LyricsView
    case 'queue': return QueueView
    default: return NowPlaying
  }
})

const tabClass = (tab: string) =>
    activeTab.value === tab
        ? 'text-green-500 border-b-2 border-green-500 pb-1'
        : 'text-gray-400 hover:text-white pb-1'
</script>

<style scoped>
.slide-up-enter-active {
  transform: translateY(100%);
  animation: slideIn 0.3s forwards ease-out;
}
.slide-up-leave-active {
  animation: slideOut 0.3s forwards ease-in;
}
@keyframes slideIn {
  to {
    transform: translateY(0);
  }
}
@keyframes slideOut {
  to {
    transform: translateY(100%);
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
}
</style>
