<script setup lang="ts">
import type { Track } from '#shared/types'

// Ids are UUIDs; anything else is an unknown page (404) rather than a database error.
definePageMeta({ validate: route => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(route.params.id)) })

// Track page: cover, artists, album, lyrics and more tracks by the same artist.
type TrackRow = Track & { album: { id: string; title: string } | null }

const route = useRoute()
const supabase = useSupabase()
const likesStore = useLikesStore()
const { playTrack, isTrackPlaying } = usePlayTrack()

const trackId = computed(() => String(route.params.id))

async function loadMoreByArtist(t: Track): Promise<Track[]> {
  const artist = t.authors[0]
  if (!artist) return []
  const { data } = await supabase
    .from('track_authors')
    .select(`track:tracks(${TRACK_SELECT})`)
    .eq('profile_id', artist.id)
    .in('status', CREDITED_STATUSES)
    .neq('track_id', t.id)
    .limit(5)
  return toTracks((data ?? []).map((c: any) => c.track))
}

// Loaded during the server render (the page is in the HTML for visitors and search engines).
const pageData = useAsyncData(`track-page-${trackId.value}`, async () => {
  const { data, error } = await supabase
    .from('tracks')
    .select(`${TRACK_SELECT}, lyrics, album:albums(id, title)`)
    .eq('id', trackId.value)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const track: TrackRow = { ...toTrack(data), album: (data as any).album ?? null }
  return { track, moreByArtist: await loadMoreByArtist(track) }
})

// Title, description and link preview, fetched in parallel with the page.
const share = await useShareInfo('track', trackId)
useShareMeta('track', share)

const { data, status, error: loadError } = await pageData
if (!data.value && !loadError.value) notFound()
if (loadError.value) console.error('Error loading track', loadError.value)

const track = computed(() => data.value?.track ?? null)
const moreByArtist = computed(() => data.value?.moreByArtist ?? [])
const isLoading = computed(() => status.value === 'pending' && !data.value)
const error = computed(() => loadError.value ? 'Failed to load track' : !data.value ? 'Track not found' : null)

// Liked state is per viewer, so it is fetched in the browser.
onMounted(() => watch(() => [track.value, ...moreByArtist.value].filter(Boolean).map(t => t!.id), ids => likesStore.fetchLikes(ids), { immediate: true }))

const year = computed(() => track.value?.created_at ? new Date(track.value.created_at).getFullYear() : null)
const playing = computed(() => !!track.value && isTrackPlaying(track.value))

function play() {
  if (track.value) playTrack(track.value, [track.value, ...moreByArtist.value])
}
</script>

<template>
  <div class="p-4 md:p-6">
    <div v-if="isLoading" class="flex justify-center items-center py-20">
      <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-old-neutral-400" />
    </div>

    <UAlert v-else-if="error" color="error" variant="soft" :title="error" :actions="[{ label: 'All tracks', to: '/tracks' }]" />

    <template v-else-if="track">
      <MediaHeader
        label="Track"
        :title="track.title"
        :cover="track.cover_url"
        :cover-alt="`Cover for ${track.title}`"
        :details="[
          track.album && { text: track.album.title, to: `/albums/${track.album.id}` },
          year && String(year),
          track.duration_seconds && formatDuration(track.duration_seconds),
          track.likes_count && plural(track.likes_count, 'like'),
        ]"
      >
        <template #lead><TrackArtists :authors="track.authors" /></template>
      </MediaHeader>

      <div class="flex items-center gap-2 mb-8">
        <UButton
          :icon="playing ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'"
          size="xl"
          class="rounded-full"
          :disabled="!track.audio_url"
          :aria-label="playing ? 'Pause' : `Play ${track.title}`"
          @click="play"
        />
        <LikeButton :track-id="track.id" />
        <TrackMenu :track="track" />
      </div>

      <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section>
          <h2 class="text-xl font-bold mb-3">Lyrics</h2>
          <p v-if="track.lyrics" class="whitespace-pre-line leading-relaxed text-old-neutral-700 dark:text-old-neutral-300">{{ track.lyrics }}</p>
          <p v-else class="text-old-neutral-500">No lyrics have been added for this track yet.</p>
        </section>

        <section v-if="moreByArtist.length">
          <h2 class="text-xl font-bold mb-3">More by {{ track.authors[0]?.username || 'this artist' }}</h2>
          <TrackList :tracks="moreByArtist" />
        </section>
      </div>
    </template>
  </div>
</template>
