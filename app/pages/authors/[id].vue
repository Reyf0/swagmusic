<script setup lang="ts">
import type { Album, Profile, Track } from '#shared/types'

// Artist page: a profile, the tracks it is credited on and its albums.
const route = useRoute()
const supabase = useSupabase()
const likesStore = useLikesStore()
const { playTrack } = usePlayTrack()

const artistId = computed(() => String(route.params.id))
const artist = ref<Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url' | 'website'> | null>(null)
const tracks = ref<Track[]>([])
const albums = ref<Album[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const [{ data: profile, error: profileError }, { data: credits, error: creditsError }, { data: albumRows, error: albumsError }] = await Promise.all([
      supabase.from('profiles').select('id, username, full_name, avatar_url, website').eq('id', artistId.value).maybeSingle(),
      supabase.from('track_authors').select(`track:tracks(${TRACK_SELECT})`).eq('profile_id', artistId.value).eq('status', 'approved'),
      supabase.from('albums').select('*').eq('user_id', artistId.value).order('created_at', { ascending: false }),
    ])
    if (profileError) throw profileError
    if (creditsError) throw creditsError
    if (albumsError) throw albumsError
    if (!profile) {
      error.value = 'Artist not found'
      return
    }
    artist.value = profile
    tracks.value = toTracks((credits ?? []).map((c: any) => c.track))
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    albums.value = albumRows ?? []
    likesStore.fetchLikes(tracks.value.map(t => t.id))
  } catch (e: any) {
    console.error('Error loading artist', e)
    error.value = 'Failed to load artist'
  } finally {
    isLoading.value = false
  }
}

watch(artistId, load, { immediate: true })

const displayName = computed(() => artist.value?.username || artist.value?.full_name || 'Unnamed artist')
// Only link http(s) URLs (the field is user-provided).
const website = computed(() => /^https?:\/\//i.test(artist.value?.website ?? '') ? artist.value!.website! : null)

useSeoMeta({ title: () => `${displayName.value} · SwagMusic` })
</script>

<template>
  <div class="p-4 md:p-6">
    <div v-if="isLoading" class="flex justify-center items-center py-20">
      <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-old-neutral-400" />
    </div>

    <UAlert v-else-if="error" color="error" variant="soft" :title="error" :actions="[{ label: 'Go home', to: '/' }]" />

    <template v-else-if="artist">
      <header class="flex flex-col md:flex-row items-center md:items-end gap-6 mb-6">
        <UAvatar :src="artist.avatar_url ?? undefined" :alt="displayName" class="size-40 text-5xl shadow-lg" />
        <div class="text-center md:text-left min-w-0">
          <div class="text-xs uppercase font-semibold text-old-neutral-500 mb-1">Artist</div>
          <h1 class="text-4xl md:text-6xl font-bold break-words">{{ displayName }}</h1>
          <p class="text-sm text-old-neutral-500 mt-2">
            {{ tracks.length }} {{ tracks.length === 1 ? 'track' : 'tracks' }}
            <template v-if="albums.length"> · {{ albums.length }} {{ albums.length === 1 ? 'album' : 'albums' }}</template>
            <template v-if="website">
              · <a :href="website" target="_blank" rel="noopener noreferrer nofollow" class="hover:underline">{{ website.replace(/^https?:\/\//, '') }}</a>
            </template>
          </p>
        </div>
      </header>

      <UButton
        icon="i-heroicons-play-solid"
        size="xl"
        class="rounded-full mb-6"
        :disabled="!tracks.length"
        aria-label="Play all tracks"
        @click="tracks[0] && playTrack(tracks[0], tracks)"
      />

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
