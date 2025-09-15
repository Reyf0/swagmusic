<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'

const route = useRoute()
const supabase = useSupabaseClient()
const playerStore = usePlayerStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)

const playlistId = route.params.id
const playlist = ref(null)
const tracks = ref([])
const isLoading = ref(true)
const error = ref(null)

// Fetch playlist and its tracks
const fetchPlaylist = async () => {
  if (!playlistId) return
  
  isLoading.value = true
  error.value = null
  
  try {
    // Fetch playlist details
    const { data: playlistData, error: playlistError } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', playlistId)
      .single()
    
    if (playlistError) throw new Error(playlistError)
    
    if (!playlistData) {
      error.value = 'Playlist not found'
      return
    }
    
    playlist.value = playlistData
    
    // Fetch playlist tracks
    const { data: playlistTracksData, error: tracksError } = await supabase
      .from('playlist_tracks')
      .select(`
        *,
        track:tracks(
          *,
          author:profiles(*)
        )
      `)
      .eq('playlist_id', playlistId)
      .order('position')
    
    if (tracksError) throw tracksError
    
    tracks.value = playlistTracksData?.map(item => item.track) || []
  } catch (e) {
    console.error('Error fetching playlist:', e)
    error.value = 'Failed to load playlist'
  } finally {
    isLoading.value = false
  }
}

// Player functions
const playTrack = ({ track, trackList }) => {
  if (isCurrentTrack(track)) {
    if (isPlaying.value) {
      playerStore.pause()
    } else {
      playerStore.resume()
    }
  } else {
    playerStore.play(track, trackList)
  }
}

const isCurrentTrack = (track) => {
  return currentTrack.value && currentTrack.value.id === track.id
}

// Fetch data when component is mounted
onMounted(() => {
  fetchPlaylist()
})

// Watch for route changes
watch(() => route.params.id, (newId) => {
  if (newId) {
    fetchPlaylist()
  }
})
</script>

<template>
  <div class="p-6">
    <div v-if="isLoading && !playlist" class="flex justify-center items-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"><!-- TODO Add icon --></div>
    </div>
    
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <p>{{ error }}</p>
      <NuxtLink to="/library" class="text-red-700 underline">Return to Library</NuxtLink>
    </div>
    
    <div v-else-if="playlist">
      <Playlist
        :playlist="playlist" 
        :tracks="tracks" 
        :isLoading="isLoading"
        @play-track="playTrack"
      />
    </div>
  </div>
</template>