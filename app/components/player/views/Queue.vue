<script setup lang="ts">
const props = defineProps<{
  mode?: 'sidebar' | 'fullscreen'
}>()

const player = usePlayerStore()
const { queue, currentTrackIndex } = storeToRefs(player)

const upNext = computed(() => queue.value
  .map((track, index) => ({ track, index }))
  .filter(({ index }) => index > currentTrackIndex.value))
</script>

<template>
  <div class="w-full h-full flex flex-col p-4 md:p-6" :class="props.mode === 'sidebar' ? '' : 'bg-old-neutral-900 text-white'">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Queue</h2>
      <UButton
        icon="i-heroicons-x-mark"
        size="sm"
        variant="ghost"
        color="neutral"
        class="hidden md:inline-flex"
        aria-label="Close queue"
        @click="player.closeView('queue')"
      />
    </div>

    <template v-if="queue[currentTrackIndex]">
      <h3 class="text-sm font-semibold text-old-neutral-400 mb-2">Now playing</h3>
      <div class="flex items-center gap-3 p-2 rounded bg-old-neutral-800/60 mb-6">
        <CoverImage v-if="queue[currentTrackIndex]!.cover_url" :src="queue[currentTrackIndex]!.cover_url!" :size="48" class="size-12 rounded object-cover" />
        <div v-else class="size-12 rounded bg-old-neutral-700 flex items-center justify-center">
          <UIcon name="i-heroicons-musical-note" class="size-5 text-old-neutral-400" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-green-500 truncate">{{ queue[currentTrackIndex]!.title }}</p>
          <p class="text-sm text-old-neutral-400 truncate">{{ artistNames(queue[currentTrackIndex]) }}</p>
        </div>
        <UIcon name="i-heroicons-speaker-wave" class="text-green-500 shrink-0" />
      </div>
    </template>

    <h3 class="text-sm font-semibold text-old-neutral-400 mb-2">Up next</h3>
    <p v-if="!upNext.length" class="text-sm text-old-neutral-500">Nothing queued. Use “Play next” or “Add to queue” in a track’s menu.</p>
    <ul v-else class="flex-grow overflow-y-auto space-y-1">
      <li
        v-for="{ track, index } in upNext"
        :key="`${track.id}-${index}`"
        class="group flex items-center gap-3 p-2 rounded hover:bg-old-neutral-800"
      >
        <button type="button" class="flex items-center gap-3 min-w-0 flex-1 text-left" @click="player.playAt(index)">
          <CoverImage v-if="track.cover_url" :src="track.cover_url" :size="48" class="size-12 rounded object-cover shrink-0" />
          <div v-else class="size-12 rounded bg-old-neutral-700 flex items-center justify-center shrink-0">
            <UIcon name="i-heroicons-musical-note" class="size-5 text-old-neutral-400" />
          </div>
          <div class="min-w-0">
            <p class="font-semibold truncate">{{ track.title }}</p>
            <p class="text-sm text-old-neutral-400 truncate">{{ artistNames(track) }}</p>
          </div>
        </button>
        <UButton
          icon="i-heroicons-x-mark"
          size="sm"
          variant="ghost"
          color="neutral"
          class="md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
          :aria-label="`Remove ${track.title} from queue`"
          @click="player.removeFromQueue(index)"
        />
      </li>
    </ul>
  </div>
</template>
