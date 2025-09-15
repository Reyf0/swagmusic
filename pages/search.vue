<script setup lang="ts">
import { useTracksStore } from "@/stores/useTracksStore";
import { storeToRefs } from "pinia";
import { SupabaseClient } from '@supabase/supabase-js'

const supabase:SupabaseClient<Database> = useSupabaseClient()
const user = useSupabaseUser()

const tracksStore = useTracksStore()
const { isSearching, q, search, error , items } = storeToRefs(tracksStore)

const showAddToPlaylistModal = ref(false)
const selectedTrack = ref(null)

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

<template>
  <div class="m-5">
    <!-- Loading state -->
    <div v-if="isSearching" class="mt-4 text-center text-gray-500">
      <UIcon name="i-heroicons-magnifying-glass" class="w-6 h-6 animate-spin mx-auto mb-2" />
      Searching...
    </div>

    <!-- Error state -->
    <div v-if="error" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-center">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500 mr-2" />
        <p class="text-red-700">{{ error }}</p>
      </div>
      <UButton
          @click="error.value = null"
          variant="ghost"
          color="red"
          size="sm"
          class="mt-2"
      >
        Dismiss
      </UButton>
    </div>

    <!-- No results state (only show if search was performed and no error) -->
    <div v-if="!isSearching && !error && items.value?.length === 0" class="mt-4 text-center text-gray-500">
      <UIcon name="i-heroicons-musical-note" class="w-12 h-12 mx-auto mb-2 opacity-50" />
      <p>No tracks found for "{{ q }}"</p>
      <p class="text-sm mt-1">Try searching with different keywords or check the spelling.</p>
    </div>
    <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      <TrackCard
          v-for="track in items"
          :key="track.id"
          :track="track"
          :tracks="items"
          variant="grid"
          show-add-to-playlist
          @add-to-playlist="openAddToPlaylistModal"
      />
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
