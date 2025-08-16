<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  track: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'add-to-playlist', 'create-playlist'])

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const playlists = ref([])
const isLoading = ref(false)
const error = ref(null)
const newPlaylistName = ref('')
const isCreatingPlaylist = ref(false)

// Fetch user's playlists
const fetchPlaylists = async () => {
  if (!user.value) return
  
  isLoading.value = true
  error.value = null
  
  try {
    const { data, error: fetchError } = await supabase
      .from('playlists')
      .select(`
        *,
        playlist_tracks(count)
      `)
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
    
    if (fetchError) throw fetchError
    
    playlists.value = data.map(playlist => ({
      ...playlist,
      track_count: playlist.playlist_tracks.length || 0
    })) || []
  } catch (e) {
    console.error('Error fetching playlists:', e)
    error.value = 'Failed to load your playlists'
  } finally {
    isLoading.value = false
  }
}

// Create a new playlist
const createPlaylist = async () => {
  if (!user.value || !newPlaylistName.value.trim()) return
  
  try {
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        name: newPlaylistName.value.trim(),
        user_id: user.value.id
      })
      .select()
    
    if (error) throw error
    
    if (data) {
      playlists.value.unshift(data[0])
      
      // If a track is provided, add it to the new playlist
      if (props.track) {
        emit('add-to-playlist', { 
          playlistId: data[0].id, 
          track: props.track,
          playlistName: data[0].name
        })
      }
      
      newPlaylistName.value = ''
      isCreatingPlaylist.value = false
      emit('create-playlist', data[0])
    }
  } catch (e) {
    console.error('Error creating playlist:', e)
    error.value = 'Failed to create playlist'
  }
}

// Add track to playlist
const addToPlaylist = (playlist) => {
  if (props.track) {
    emit('add-to-playlist', { 
      playlistId: playlist.id, 
      track: props.track,
      playlistName: playlist.name
    })
  }
}

// Close modal
const closeModal = () => {
  emit('close')
  // Reset state
  newPlaylistName.value = ''
  isCreatingPlaylist.value = false
  error.value = null
}

// Watch for modal open state
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    fetchPlaylists()
  }
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="closeModal"/>
    
    <!-- Modal -->
    <div class="flex items-center justify-center min-h-screen p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto z-10 relative">
        <!-- Header -->
        <div class="px-6 py-4 border-b">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">Add to playlist</h3>
            <button class="text-gray-400 hover:text-gray-500" @click="closeModal">
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="px-6 py-4">
          <!-- Create new playlist section -->
          <div class="mb-4">
            <button 
              class="w-full flex items-center justify-between p-3 rounded-md hover:bg-gray-50 border border-dashed border-gray-300"
              @click="isCreatingPlaylist = !isCreatingPlaylist"
            >
              <div class="flex items-center">
                <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <UIcon name="i-heroicons-plus" class="w-5 h-5 text-white" />
                </div>
                <span class="font-medium">Create new playlist</span>
              </div>
              <UIcon 
                :name="isCreatingPlaylist ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" 
                class="w-5 h-5 text-gray-400" 
              />
            </button>
            
            <div v-if="isCreatingPlaylist" class="mt-3 p-3 bg-gray-50 rounded-md">
              <div class="mb-3">
                <input
                  v-model="newPlaylistName"
                  type="text"
                  placeholder="Playlist name"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  @keyup.enter="createPlaylist"
                >
              </div>
              <div class="flex justify-end gap-2">
                <button
                  class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  @click="isCreatingPlaylist = false"
                >
                  Cancel
                </button>
                <button
                  class="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md"
                  :disabled="!newPlaylistName.trim()"
                  @click="createPlaylist"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{{ error }}</p>
          </div>
          
          <!-- Loading state -->
          <div v-if="isLoading" class="flex justify-center items-center py-6">
            <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"/>
          </div>
          
          <!-- Playlists list -->
          <div v-else-if="playlists.length === 0" class="text-center py-6">
            <p class="text-gray-500">You don't have any playlists yet.</p>
          </div>
          
          <div v-else class="max-h-60 overflow-y-auto">
            <div 
              v-for="playlist in playlists" 
              :key="playlist.id"
              class="flex items-center p-3 hover:bg-gray-50 rounded-md cursor-pointer"
              @click="addToPlaylist(playlist)"
            >
              <div class="w-10 h-10 bg-gray-200 rounded flex items-center justify-center mr-3">
                <UIcon name="i-heroicons-musical-note" class="w-5 h-5 text-gray-500" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{{ playlist.name }}</div>
                <div class="text-xs text-gray-500">{{ playlist.track_count || 0 }} tracks</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <button 
            class="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md" 
            @click="closeModal"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
