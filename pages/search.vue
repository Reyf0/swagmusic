<template>
  <div>
    <div v-if="searchStore.isLoading" class="mt-4 text-center text-gray-500">Searching...</div>
    <div v-if="!searchStore.isLoading && searchStore.results.length === 0 && searchStore.query" class="mt-4 text-center text-gray-500">
      No results found.
    </div>
    <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      <div v-for="track in searchStore.results" :key="track.id" class="border rounded p-3 shadow hover:shadow-md transition-shadow">
        <img
            :src="track?.cover_url"
            class="w-full cover object-cover rounded mb-2"
            alt="Cover">
        <h2 class="text-lg font-semibold truncate">{{ track.title }}</h2>
        <p class="text-sm text-gray-600">
        <span v-if="track.track_authors?.length">
          {{ track.track_authors.map(a => a.author.name).join(', ') }}
        </span>
          <span v-else>Unknown Artist</span>
        </p>
        <div class="flex items-center justify-between mt-2">
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
            <span v-if="isCurrentTrack(track)" class="text-xs text-green-500 font-medium mr-2">
              PLAYING
            </span>
            <button
                class="text-gray-500 hover:text-gray-700 p-2"
                title="Add to playlist"
                @click="openAddToPlaylistModal(track)"
            >
              <UIcon name="i-heroicons-plus" class="w-5 h-5" />
            </button>
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
import { useSearchStore } from '@/stores/searchStore'
import {usePlayerStore} from "~/stores/player";
import {storeToRefs} from "pinia";

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const playerStore = usePlayerStore()
const { isPlaying } = storeToRefs(playerStore)
const showAddToPlaylistModal = ref(false)
const selectedTrack = ref(null)
const tracks = ref([])

const { playTrack, isCurrentTrack } = usePlayTrack()

const searchStore = useSearchStore()

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
</script>
