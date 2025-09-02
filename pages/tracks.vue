<template>
  <div>
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4">All Tracks</h1>

      <div v-if="isLoading" class="flex justify-center items-center py-10">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"/>
      </div>

      <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{{ error }}</p>
        <button class="mt-2 bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded" @click="fetchTracks">
          Try Again
        </button>
      </div>

      <div v-else-if="!tracks || tracks.length === 0" class="text-center py-10">
        <p class="text-gray-500">No tracks found.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        <div v-for="track in tracks" :key="track.id" class="track-card flex flex-col border rounded p-3 shadow hover:shadow-md transition-shadow">
          <div class="track-cover-wrapper relative grow overflow-hidden rounded-md shadow-md mb-3 group">
            <div class="flex justify-center items-center h-full w-full aspect-square bg-gradient-to-br from-gray-200 to-gray-300">
              <UIcon v-if="!track.cover_url" name="i-heroicons-musical-note" class="icon w-10 h-10 text-gray-400" />
              <img
                  v-else
                  :src="track?.cover_url"
                  alt="cover"
                  class="w-full track-info object-cover rounded"
              >
            </div>
            <div class="absolute inset-0 hover:bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
              <button
                  class="track-play-button opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
                  @click="playTrack(track, tracks)"
              >
                <UIcon
                    :name="isCurrentTrack(track) && isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
                    class="w-6 h-6"/>
              </button>
            </div>
          </div>

          <div class="track-label justify-self-start">
            <h2 class="text-lg font-semibold truncate">{{ track?.title || 'No title'}}</h2>
            <p class="text-sm text-gray-600">
          <span v-if="track.authors && track.authors.length">
            <span v-for="(author, index) in track.authors" :key="author.id">
              {{ author.name }}<span v-if="index < track.authors.length - 1">, </span>
            </span>
          </span>
              <span v-else>Unknown Artist</span>
            </p>
          </div>

          <div class="track-controls flex items-center justify-between mt-2">

            <button
                class="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-full flex items-center"
                @click="playTrack(track, tracks)"
            >
              <UIcon
                  :name="isCurrentTrack(track) && isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
                  class="w-4 h-4 mr-2"
              />
              <span>{{ isCurrentTrack(track) && isPlaying ? 'Pause' : 'Play' }}</span>
            </button>

            <div class="flex items-center">
              <span v-if="isCurrentTrack(track) && !isMobile" class="track-playing-label text-xs text-green-500 font-medium mr-2">
                PLAYING
              </span>

              <button
                  :disabled="!!likesStore.pending[track.id]"
                  class="p-2"
                  :title="likesStore.isLiked(track.id) ? 'Unlike' : 'Like'"
                  @click="onToggleLike(track)"
              >
                <UIcon
                    :name="likesStore.isLiked(track.id) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                    :class="likesStore.isLiked(track.id) ? 'text-red-500' : 'text-black'"
                    class="w-6 h-6"
                />
              </button>
              <!--
              <button
                  class="text-gray-500 hover:text-gray-700 p-2"
                  title="Add to playlist"
                  @click="openAddToPlaylistModal(track)"
              >
                <UIcon name="i-heroicons-plus" class="w-5 h-5" />
              </button>
              -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add to Playlist Modal -->
    <AddToPlaylistModal
        :is-open="showAddToPlaylistModal"
        :track="selectedTrack"
        @close="showAddToPlaylistModal = false"
        @add-to-playlist="handleAddToPlaylist"
    />
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/stores/player';
import { storeToRefs } from 'pinia';
import { useWindowSize } from '@vueuse/core';
import type { TrackUI, Database } from "@/types/global";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabase: SupabaseClient<Database> = useSupabaseClient()
const user = useSupabaseUser()

const playerStore = usePlayerStore()
const likesStore = useLikesStore()
likesStore.attachPlayerStore(playerStore)
const tracksStore = useTracksStore()

const { isPlaying } = storeToRefs(playerStore)
const { width } = useWindowSize({ initialWidth: 0 })
const isMobile = computed(() => width.value < 500)

const tracks = ref<TrackUI[]>([])
const isLoading = ref(true)
const error = ref(null)
const showAddToPlaylistModal = ref(false)
const selectedTrack = ref<TrackUI>(null)
const { playTrack, isCurrentTrack } = usePlayTrack()

const fetchTracks = async () => {
  isLoading.value = true
  error.value = null
  try {
    await tracksStore.loadFeed()
    console.log(tracksStore.feedItems)
    tracks.value = tracksStore.feedItems.value
    // batch fetch likes for visible tracks
    const ids = tracks.value.map(t => t.id)
    if (ids.length > 0) {
      await likesStore.fetchLikes(ids, 'track')
    }
  } catch (e) {
    console.error(e)
    error.value = 'Failed to load tracks'
  } finally {
    isLoading.value = false
  }
}

const onToggleLike  = async (track: TrackUI) => {
  if (!user.value || !user.value.id) {
    console.warn('No authenticated user')
    return navigateTo('/login')
  }

  try {
    await likesStore.toggleLike({ id: track.id, type: 'track'})
  } catch (e) {
    console.error(e)
    useToast().add({ title: 'Ошибка', description: 'Не удалось обновить лайк', color: 'error'})
  }
}

// Open add to playlist modal
const openAddToPlaylistModal = (track) => {
  if (!user.value) {
    // Redirect to log in if not logged in
    navigateTo('/login')
    return
  }

  selectedTrack.value = track
  showAddToPlaylistModal.value = true
}

// Handle adding track to playlist
const handleAddToPlaylist = async ({ playlistId, track, playlistName }) => {
  try {
    // Check if the track is already in the playlist
    const { data: existingData } = await supabase
      .from('playlist_tracks')
      .select('id')
      .eq('playlist_id', playlistId)
      .eq('track_id', track.id)
      .single()

    if (existingData) {
      // Track already in the playlist
      useToast().add({
        title: 'Already added',
        description: `This track is already in "${playlistName}"`,
        color: 'blue'
      })
      return
    }

    // Get the current highest position
    const { data: positionData } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = positionData && positionData.length > 0 
      ? positionData[0].position + 1 
      : 0
    // Add track to the playlist
    const { error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: playlistId,
        track_id: track.id,
        position: nextPosition,
        added_at: new Date().toISOString()
      })

    if (error) throw error

    // Update playlist track count
    await supabase.rpc('increment_playlist_track_count', { playlist_id: playlistId })

    // Show a success message
    useToast().add({
      title: 'Added to playlist',
      description: `Added to "${playlistName}"`,
      color: 'green'
    })

    // Close modal
    showAddToPlaylistModal.value = false
  } catch (e) {
    console.error('Error adding track to playlist:', e)
    useToast().add({
      title: 'Error',
      description: 'Failed to add track to playlist',
      color: 'red'
    })
  }
}

// Fetch tracks when a component is mounted
onMounted(() => {
  fetchTracks()
})
</script>

<style scoped>
@reference "tailwindcss";

@media (max-width: 500px) {
  .track-card {
    @apply flex flex-row justify-between;
  }
  .track-cover-wrapper {
    @apply grow-0;
  }
  .track-label {
    @apply ml-3 grow;
  }
  .track-controls {
    @apply m-0;
  }
  .track-playing-label {
    @apply hidden;
  }
  .track-info{
    @apply w-16 h-16;
  }
}

.track-cover-wrapper .icon {
  @apply absolute;
}

</style>
