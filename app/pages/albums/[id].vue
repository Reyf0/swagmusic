<script setup lang="ts">
import type { Album, Track } from '#shared/types'

type AlbumRow = Album & { author: { id: string; username: string | null; avatar_url: string | null } | null }

const route = useRoute()
const supabase = useSupabase()
const likesStore = useLikesStore()

const albumId = computed(() => String(route.params.id))
const album = ref<AlbumRow | null>(null)
const tracks = ref<Track[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const totalDuration = computed(() => tracks.value.reduce((sum, t) => sum + (t.duration_seconds ?? 0), 0))

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const [{ data: albumRow, error: albumError }, { data: trackRows, error: tracksError }] = await Promise.all([
      supabase.from('albums').select('*, author:profiles!albums_user_id_fkey(id, username, avatar_url)').eq('id', albumId.value).maybeSingle(),
      supabase.from('tracks').select(TRACK_SELECT).eq('album_id', albumId.value).order('created_at', { ascending: true }),
    ])
    if (albumError) throw albumError
    if (tracksError) throw tracksError
    if (!albumRow) {
      error.value = 'Album not found'
      return
    }
    album.value = albumRow as AlbumRow
    tracks.value = toTracks(trackRows)
    likesStore.fetchLikes(tracks.value.map(t => t.id))
  } catch (e: any) {
    console.error('Error loading album', e)
    error.value = 'Failed to load album'
  } finally {
    isLoading.value = false
  }
}

watch(albumId, load, { immediate: true })

useSeoMeta({ title: () => (album.value ? `${album.value.title} · SwagMusic` : 'Album · SwagMusic') })
</script>

<template>
  <div class="p-4 md:p-6">
    <div v-if="isLoading" class="flex justify-center items-center py-20">
      <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-old-neutral-400" />
    </div>

    <UAlert v-else-if="error" color="error" variant="soft" :title="error" :actions="[{ label: 'All albums', to: '/albums' }]" />

    <template v-else-if="album">
      <header class="flex flex-col md:flex-row md:items-end gap-6 mb-6">
        <div class="size-48 shrink-0 mx-auto md:mx-0 rounded-md shadow-lg overflow-hidden bg-old-neutral-200 dark:bg-old-neutral-800 flex items-center justify-center">
          <img v-if="album.cover_url" :src="album.cover_url" class="size-full object-cover" alt="">
          <UIcon v-else name="i-lucide-disc-3" class="size-16 text-old-neutral-400" />
        </div>
        <div class="min-w-0">
          <div class="text-xs uppercase font-semibold text-old-neutral-500 mb-1">Album</div>
          <h1 class="text-3xl md:text-5xl font-bold mb-2 break-words">{{ album.title }}</h1>
          <p v-if="album.description" class="text-old-neutral-500 mb-2">{{ album.description }}</p>
          <div class="text-sm text-old-neutral-500 flex items-center gap-2 flex-wrap">
            <NuxtLink v-if="album.author" :to="`/authors/${album.author.id}`" class="flex items-center gap-2 font-semibold text-old-neutral-800 dark:text-old-neutral-200 hover:underline">
              <UAvatar :src="album.author.avatar_url ?? undefined" :alt="album.author.username ?? undefined" size="xs" />
              {{ album.author.username || 'Unknown artist' }}
            </NuxtLink>
            <span v-if="album.created_at">· {{ new Date(album.created_at).getFullYear() }}</span>
            <span>· {{ tracks.length }} {{ tracks.length === 1 ? 'track' : 'tracks' }}</span>
            <span v-if="totalDuration">· {{ formatDuration(totalDuration) }}</span>
          </div>
        </div>
      </header>

      <PlayAllButton :tracks="tracks" label="Play album" class="mb-4" />

      <TrackList :tracks="tracks" empty-text="This album has no tracks yet." />
    </template>
  </div>
</template>
