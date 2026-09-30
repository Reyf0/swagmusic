<script setup lang="ts">
import type { Album } from '#shared/types'

// Ids are UUIDs; anything else is an unknown page (404) rather than a database error.
definePageMeta({ validate: route => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(route.params.id)) })

type AlbumRow = Album & { author: { id: string; username: string | null; avatar_url: string | null } | null }

const route = useRoute()
const supabase = useSupabase()
const likesStore = useLikesStore()

const albumId = computed(() => String(route.params.id))

// Loaded during the server render (the page is in the HTML for visitors and search engines).
const pageData = useAsyncData(`album-page-${albumId.value}`, async () => {
  const [{ data: albumRow, error: albumError }, { data: trackRows, error: tracksError }] = await Promise.all([
    supabase.from('albums').select('*, author:profiles!albums_user_id_fkey(id, username, avatar_url)').eq('id', albumId.value).maybeSingle(),
    supabase.from('tracks').select(TRACK_SELECT).eq('album_id', albumId.value).order('created_at', { ascending: true }),
  ])
  if (albumError) throw albumError
  if (tracksError) throw tracksError
  if (!albumRow) return null
  return { album: albumRow as AlbumRow, tracks: toTracks(trackRows) }
})

// Title, description and link preview, fetched in parallel with the page.
const share = await useShareInfo('album', albumId)
useShareMeta('album', share)

const { data, status, error: loadError } = await pageData
if (!data.value && !loadError.value) notFound()
if (loadError.value) console.error('Error loading album', loadError.value)

const album = computed(() => data.value?.album ?? null)
const tracks = computed(() => data.value?.tracks ?? [])
const isLoading = computed(() => status.value === 'pending' && !data.value)
const error = computed(() => loadError.value ? 'Failed to load album' : !data.value ? 'Album not found' : null)
const totalDuration = computed(() => tracks.value.reduce((sum, t) => sum + (t.duration_seconds ?? 0), 0))

// Liked state is per viewer, so it is fetched in the browser.
onMounted(() => watch(() => tracks.value.map(t => t.id), ids => likesStore.fetchLikes(ids), { immediate: true }))
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
          <CoverImage v-if="album.cover_url" :src="album.cover_url" :size="320" priority class="size-full object-cover" />
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
