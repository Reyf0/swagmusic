<template>
  <div>
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4">All Tracks</h1>

      <div v-if="isLoading" class="flex justify-center items-center py-10">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>

      <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{{ error }}</p>
        <button @click="fetchTracks" class="mt-2 bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded">
          Try Again
        </button>
      </div>

      <div v-else-if="tracks.length === 0" class="text-center py-10">
        <p class="text-gray-500">No tracks found.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="track in tracks" :key="track.id" class="border rounded p-3 shadow hover:shadow-md transition-shadow">
          <img
              :src="track.cover_url || 'https://via.placeholder.com/300x300?text=No+Cover'"
              alt="cover"
              class="w-full h-48 object-cover rounded mb-2"
          />
          <h2 class="text-lg font-semibold truncate">{{ track.title }}</h2>
          <p class="text-sm text-gray-600">
          <span v-if="track.track_authors && track.track_authors.length">
            <span v-for="(rel, index) in track.track_authors" :key="rel.author.id">
              {{ rel.author.name }}<span v-if="index < track.track_authors.length - 1">, </span>
            </span>
          </span>
            <span v-else>Unknown Artist</span>
          </p>
          <div class="flex items-center justify-between mt-2">
            <button
                @click="playTrack(track, tracks)"
                class="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-full flex items-center"
            >
              <UIcon
                  :name="isCurrentTrack(track) && isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
                  class="w-4 h-4 mr-2"
              />
              <span>{{ isCurrentTrack(track) && isPlaying ? 'Pause' : 'Play' }}</span>
            </button>
            <div class="flex items-center">
            <span v-if="isCurrentTrack(track)" class="text-xs text-green-500 font-medium mr-2">
              PLAYING
            </span>
              <button
                  @click="openAddToPlaylistModal(track)"
                  class="text-gray-500 hover:text-gray-700 p-2"
                  title="Add to playlist"
              >
                <UIcon name="i-heroicons-plus" class="w-5 h-5" />
              </button>
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

<script setup>
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const playerStore = usePlayerStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)

const tracks = ref([])
const isLoading = ref(true)
const error = ref(null)
const showAddToPlaylistModal = ref(false)
const selectedTrack = ref(null)

const fetchTracks = async () => {
  isLoading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await supabase
      .from('tracks')
      .select(`
        *,
        track_authors(
          *,
          author:authors(*)
        )
      `)
      .order('created_at', { ascending: false })

    if (fetchError) throw fetchError

    tracks.value = data || []
  } catch (e) {
    console.error('Error fetching tracks:', e)
    error.value = 'Failed to load tracks. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

// Player functions
const playTrack = (track, trackList) => {
  if (isCurrentTrack(track)) {
    // Toggle play/pause for current track
    if (isPlaying.value) {
      playerStore.pause()
    } else {
      playerStore.resume()
    }
  } else {
    // Play new track
    playerStore.play(track, trackList)
  }
}

const isCurrentTrack = (track) => {
  return currentTrack.value && currentTrack.value.id === track.id
}

// Open add to playlist modal
const openAddToPlaylistModal = (track) => {
  if (!user.value) {
    // Redirect to login if not logged in
    navigateTo('/login')
    return
  }

  selectedTrack.value = track
  showAddToPlaylistModal.value = true
}

// Handle adding track to playlist
const handleAddToPlaylist = async ({ playlistId, track, playlistName }) => {
  try {
    // Check if track is already in playlist
    const { data: existingData } = await supabase
      .from('playlist_tracks')
      .select('id')
      .eq('playlist_id', playlistId)
      .eq('track_id', track.id)
      .single()

    if (existingData) {
      // Track already in playlist
      useToast().add({
        title: 'Already added',
        description: `This track is already in "${playlistName}"`,
        color: 'blue'
      })
      return
    }

    // Get current highest position
    const { data: positionData } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = positionData && positionData.length > 0 
      ? positionData[0].position + 1 
      : 0

    // Add track to playlist
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

    // Show success message
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

// Fetch tracks when component is mounted
onMounted(() => {
  fetchTracks()
})
</script>
