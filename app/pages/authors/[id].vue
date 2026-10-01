<script setup lang="ts">
import type { Album, Profile } from '#shared/types'

// Ids are UUIDs; anything else is an unknown page (404) rather than a database error.
definePageMeta({ validate: route => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(route.params.id)) })

// Artist page: a profile, the tracks it is credited on and its albums.
const route = useRoute()
const supabase = useSupabase()
const likesStore = useLikesStore()
const user = useSupabaseUser()
const reportSubject = useReportSubject()

const artistId = computed(() => String(route.params.id))

type ArtistRow = Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url' | 'website' | 'imported_from'>

// Loaded during the server render (the page is in the HTML for visitors and search engines).
const pageData = useAsyncData(`artist-page-${artistId.value}`, async () => {
  const [{ data: profile, error: profileError }, { data: credits, error: creditsError }, { data: albumRows, error: albumsError }] = await Promise.all([
    supabase.from('profiles').select('id, username, full_name, avatar_url, website, imported_from').eq('id', artistId.value).maybeSingle(),
    supabase.from('track_authors').select(`track:tracks(${TRACK_SELECT})`).eq('profile_id', artistId.value).in('status', CREDITED_STATUSES),
    supabase.from('albums').select('*').eq('user_id', artistId.value).order('created_at', { ascending: false }),
  ])
  if (profileError) throw profileError
  if (creditsError) throw creditsError
  if (albumsError) throw albumsError
  if (!profile) return null
  const tracks = toTracks((credits ?? []).map((c: any) => c.track))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  return { artist: profile as ArtistRow, tracks, albums: (albumRows ?? []) as Album[] }
})

const displayName = computed(() => artist.value?.username || artist.value?.full_name || 'Unnamed artist')
// Only link http(s) URLs (the field is user-provided).
const website = computed(() => /^https?:\/\//i.test(artist.value?.website ?? '') ? artist.value!.website! : null)

// Title, description and link preview, fetched in parallel with the page.
const share = await useShareInfo('artist', artistId)
useShareMeta('artist', share)

const { data, status, error: loadError } = await pageData
if (!data.value && !loadError.value) notFound()
if (loadError.value) console.error('Error loading artist', loadError.value)

const artist = computed(() => data.value?.artist ?? null)
const tracks = computed(() => data.value?.tracks ?? [])
const albums = computed(() => data.value?.albums ?? [])
const isLoading = computed(() => status.value === 'pending' && !data.value)
const error = computed(() => loadError.value ? 'Failed to load artist' : !data.value ? 'Artist not found' : null)

// Liked state is per viewer, so it is fetched in the browser.
onMounted(() => watch(() => tracks.value.map(t => t.id), ids => likesStore.fetchLikes(ids), { immediate: true }))
</script>

<template>
  <div class="p-4 md:p-6">
    <div v-if="isLoading" class="flex justify-center items-center py-20">
      <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-old-neutral-400" />
    </div>

    <UAlert v-else-if="error" color="error" variant="soft" :title="error" :actions="[{ label: 'Go home', to: '/' }]" />

    <template v-else-if="artist">
      <MediaHeader
        label="Artist"
        :title="displayName"
        :cover="artist.avatar_url"
        :cover-alt="displayName"
        icon="i-lucide-user-round"
        round
        :details="[
          plural(tracks.length, 'track'),
          albums.length && plural(albums.length, 'album'),
          website && !artist.imported_from && { text: website.replace(/^https?:\/\//, ''), to: website, external: true },
        ]"
      >
        <!-- Profiles made by scripts/import-jamendo.ts: say the artist did not sign up here. -->
        <p v-if="artist.imported_from === 'jamendo'" class="mt-2 text-xs text-old-neutral-500">
          Imported from <a v-if="website" :href="website" target="_blank" rel="noopener" class="underline hover:text-old-neutral-800 dark:hover:text-old-neutral-200">Jamendo</a><template v-else>Jamendo</template>
          · this artist hasn't joined SwagMusic
        </p>
      </MediaHeader>

      <div class="flex items-center gap-2 mb-6">
        <PlayAllButton :tracks="tracks" label="Play all tracks" />
        <UButton
          v-if="artist.id !== user?.id"
          icon="i-lucide-flag"
          variant="ghost"
          color="neutral"
          aria-label="Report artist"
          title="Report artist"
          @click="reportSubject = { type: 'artist', id: artist.id, title: displayName }"
        />
      </div>

      <section class="mb-10">
        <h2 class="text-xl font-bold mb-3">Tracks</h2>
        <TrackList :tracks="tracks" empty-text="This artist has no tracks yet." />
      </section>

      <section v-if="albums.length">
        <h2 class="text-xl font-bold mb-3">Albums</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <AlbumCard v-for="album in albums" :key="album.id" :album="album" />
        </div>
      </section>
    </template>
  </div>
</template>
