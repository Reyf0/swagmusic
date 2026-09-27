<script setup lang="ts">
import type { Track } from '#shared/types'

// Big play / pause button for a playlist, album or artist page.
const props = defineProps<{ tracks: Track[]; label: string }>()

const { playList, isListPlaying } = usePlayTrack()
const playing = computed(() => isListPlaying(props.tracks))
</script>

<template>
  <UButton
    :icon="playing ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'"
    size="xl"
    class="rounded-full"
    :disabled="!tracks.length"
    :aria-label="playing ? 'Pause' : label"
    @click="playList(tracks)"
  />
</template>
