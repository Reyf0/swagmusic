<script setup lang="ts">
import type { TrackArtist } from '#shared/types'

// Comma-separated artist names, each linking to the artist page.
withDefaults(defineProps<{
  authors?: TrackArtist[] | null
  linked?: boolean
  fallback?: string
}>(), {
  authors: () => [],
  linked: true,
  fallback: 'Unknown artist',
})
</script>

<template>
  <span class="truncate">
    <template v-if="authors?.length">
      <template v-for="(artist, i) in authors" :key="artist.id">
        <NuxtLink
          v-if="linked"
          :to="`/authors/${artist.id}`"
          class="hover:underline"
          @click.stop
        >{{ artist.username || 'Unnamed' }}</NuxtLink>
        <span v-else>{{ artist.username || 'Unnamed' }}</span><span v-if="i < authors.length - 1">, </span>
      </template>
    </template>
    <span v-else>{{ fallback }}</span>
  </span>
</template>
