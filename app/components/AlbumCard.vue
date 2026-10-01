<script setup lang="ts">
import type { Album } from '#shared/types'

defineProps<{
  album: Album & { author?: { id: string; username: string | null } | null }
}>()
</script>

<template>
  <NuxtLink
    :to="`/albums/${album.id}`"
    class="group rounded-lg p-3 bg-old-neutral-100 hover:bg-old-neutral-200 dark:bg-old-neutral-900 dark:hover:bg-old-neutral-800 transition"
  >
    <div class="aspect-square rounded-md overflow-hidden bg-old-neutral-200 dark:bg-old-neutral-800 flex items-center justify-center mb-2 shadow">
      <CoverImage :src="album.cover_url" :size="320" icon="i-lucide-disc-3" class="size-full object-cover" />
    </div>
    <div class="font-semibold truncate">{{ album.title }}</div>
    <div class="text-sm text-old-neutral-500 truncate">
      <template v-if="album.author">{{ album.author.username || 'Unknown artist' }} · </template>
      {{ album.created_at ? new Date(album.created_at).getFullYear() : 'Album' }}
    </div>
  </NuxtLink>
</template>
