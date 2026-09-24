<script setup lang="ts">
import type { Album } from '#shared/types'

type AlbumRow = Album & { author: { id: string; username: string | null } | null }

const supabase = useSupabase()
const user = useSupabaseUser()

const albums = ref<AlbumRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function fetchAlbums() {
  loading.value = true
  error.value = null
  const { data, error: err } = await supabase
    .from('albums')
    .select('*, author:profiles!albums_user_id_fkey(id, username)')
    .order('created_at', { ascending: false })

  if (err) error.value = err.message
  else albums.value = (data ?? []) as AlbumRow[]
  loading.value = false
}

onMounted(fetchAlbums)

useSeoMeta({ title: 'Albums · SwagMusic' })
</script>

<template>
  <div class="p-4 md:p-6">
    <div class="flex justify-between items-center mb-6 gap-4">
      <h1 class="text-2xl font-bold">Albums</h1>
      <UButton v-if="user" to="/studio?tab=albums" icon="i-heroicons-plus" variant="soft" color="neutral">New album</UButton>
    </div>

    <div v-if="loading" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-old-neutral-400" />
    </div>
    <UAlert v-else-if="error" color="error" variant="soft" title="Failed to load albums" :description="error" :actions="[{ label: 'Retry', onClick: fetchAlbums }]" />
    <p v-else-if="!albums.length" class="text-center py-10 text-old-neutral-500">No albums yet.</p>
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
      <AlbumCard v-for="album in albums" :key="album.id" :album="album" />
    </div>
  </div>
</template>
