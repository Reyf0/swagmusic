<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const playerStore = usePlayerStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)

const favoritesTracks = ref([])
const isLoading = ref(true)
const error = ref(null)

// Fetch user's favorite tracks
const fetchFavorites = async () => {
  if (!user.value) return

  isLoading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await supabase
        .from('favorites')
        .select(`
        *,
        track:tracks(
          *,
          track_authors(
            *,
            author:authors(*)
          )
        )
      `)
        .eq('user_id', user.value.id)

    if (fetchError) throw fetchError

    favoritesTracks.value = data?.map(item => item.track) || []
  } catch (e) {
    console.error('Error fetching favorites:', e)
    error.value = 'Failed to load your favorite tracks'
  } finally {
    isLoading.value = false
  }
}

// Player functions (similar to tracks.vue)
const playTrack = (track, trackList) => {
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

// Format seconds to mm:ss
const formatDuration = (seconds) => {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

onMounted(() => {
  if (user.value) {
    fetchFavorites();
    fetchPlaylists();
  }
})

watch(user, (newUser) => {
  if (newUser) {
    fetchFavorites()
    fetchPlaylists()
  } else {
    favoritesTracks.value = []
  }
})

const playlists = ref([])
const newPlaylistName = ref('')
const isCreatingPlaylist = ref(false)

const fetchPlaylists = async () => {
  if (!user.value) return

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
  }
}

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
      newPlaylistName.value = ''
      isCreatingPlaylist.value = false
    }
  } catch (e) {
    console.error('Error creating playlist:', e)
  }
}


const recentlyPlayed = ref([])

const fetchRecentlyPlayed = async () => {
  if (!user.value) return

  try {
    const { data, error: fetchError } = await supabase
        .from('play_history')
        .select(`
        *,
        track:tracks(
          *,
          track_authors(
            *,
            author:authors(*)
          )
        )
      `)
        .eq('user_id', user.value.id)
        .order('played_at', { ascending: false })
        .limit(10)

    if (fetchError) throw fetchError

    recentlyPlayed.value = data?.map(item => item.track) || []
  } catch (e) {
    console.error('Error fetching play history:', e)
  }
}

fetchRecentlyPlayed()

</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Your Library</h1>

    <div v-if="!user">
      <p>Please <NuxtLink to="/login" class="text-blue-500 hover:underline">login</NuxtLink> to view your library.</p>
    </div>

    <div v-else>
      <!-- Favorites section -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Liked Tracks</h2>
          <button
            v-if="favoritesTracks.length > 0"
            @click="playTrack(favoritesTracks[0], favoritesTracks)"
            class="bg-green-500 hover:bg-green-600 text-white py-1 px-4 rounded-full flex items-center"
          >
            <UIcon name="i-heroicons-play" class="w-4 h-4 mr-1" />
            Play
          </button>
        </div>

        <div v-if="isLoading" class="flex justify-center items-center py-6">
          <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>

        <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{{ error }}</p>
        </div>

        <div v-else-if="favoritesTracks.length === 0" class="text-center py-6 bg-gray-50 rounded-lg">
          <p class="text-gray-500">You haven't added any favorites yet.</p>
          <NuxtLink to="/tracks" class="text-indigo-600 hover:underline mt-2 inline-block">
            Browse tracks to add favorites
          </NuxtLink>
        </div>

        <div v-else>
          <!-- Liked tracks table -->
          <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="grid grid-cols-12 gap-4 py-2 px-4 border-b text-sm font-medium text-gray-500">
              <div class="col-span-1">#</div>
              <div class="col-span-5">Title</div>
              <div class="col-span-4">Artist</div>
              <div class="col-span-2 text-right">Duration</div>
            </div>

            <div 
              v-for="(track, index) in favoritesTracks" 
              :key="track.id"
              class="grid grid-cols-12 gap-4 py-3 px-4 hover:bg-gray-50 border-b items-center"
              :class="{ 'bg-gray-50': isCurrentTrack(track) }"
            >
              <!-- Track Number/Play Button -->
              <div class="col-span-1 flex items-center">
                <span v-if="!isCurrentTrack(track) && !isPlaying" class="text-gray-400">{{ index + 1 }}</span>
                <button 
                  v-else
                  @click="playTrack(track, favoritesTracks)"
                  class="text-gray-600 hover:text-indigo-600"
                >
                  <UIcon 
                    :name="isCurrentTrack(track) && isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'" 
                    class="w-5 h-5" 
                  />
                </button>
              </div>

              <!-- Track Title & Cover -->
              <div class="col-span-5 flex items-center">
                <img 
                  :src="track.cover_url || 'https://via.placeholder.com/40x40?text=No+Cover'" 
                  class="w-10 h-10 object-cover rounded mr-3"
                  alt="Track cover"
                />
                <div>
                  <div class="font-medium" :class="{ 'text-indigo-600': isCurrentTrack(track) }">
                    {{ track.title }}
                  </div>
                </div>
              </div>

              <!-- Artist -->
              <div class="col-span-4 truncate">
                <span v-if="track.track_authors && track.track_authors.length">
                  <span v-for="(rel, idx) in track.track_authors" :key="rel.author.id">
                    {{ rel.author.name }}<span v-if="idx < track.track_authors.length - 1">, </span>
                  </span>
                </span>
                <span v-else>Unknown Artist</span>
              </div>

              <!-- Duration -->
              <div class="col-span-2 text-right text-gray-500">
                {{ track.duration ? formatDuration(track.duration) : '--:--' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Your Playlists</h2>
          <button
              @click="isCreatingPlaylist = !isCreatingPlaylist"
              class="bg-green-500 hover:bg-green-600 text-white py-1 px-4 rounded-full flex items-center"
          >
            <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1" />
            {{ isCreatingPlaylist ? 'Cancel' : 'Create Playlist' }}
          </button>
        </div>

        <div v-if="isCreatingPlaylist" class="mb-6 bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold mb-4">Create New Playlist</h3>
          <div class="flex items-start gap-4">
            <div class="w-32 h-32 bg-gray-200 rounded-md flex items-center justify-center">
              <UIcon name="i-heroicons-musical-note" class="w-12 h-12 text-gray-400" />
            </div>
            <div class="flex-1">
              <div class="mb-4">
                <label for="playlist-name" class="block text-sm font-medium text-gray-700 mb-1">Playlist name</label>
                <input
                    id="playlist-name"
                    v-model="newPlaylistName"
                    type="text"
                    placeholder="My Awesome Playlist"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    @keyup.enter="createPlaylist"
                />
              </div>
              <div class="flex gap-2">
                <button
                    @click="createPlaylist"
                    class="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-full"
                    :disabled="!newPlaylistName.trim()"
                >
                  Create
                </button>
                <button
                    @click="isCreatingPlaylist = false"
                    class="bg-transparent border border-gray-300 hover:bg-gray-100 py-2 px-4 rounded-full"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="playlists.length === 0" class="text-center py-6 bg-gray-50 rounded-lg">
          <p class="text-gray-500">You haven't created any playlists yet.</p>
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          <NuxtLink
              v-for="playlist in playlists"
              :key="playlist.id"
              :to="`/playlist/${playlist.id}`"
              class="playlist-card group"
          >
            <div class="playlist-cover relative overflow-hidden rounded-md shadow-md mb-3">
              <div class="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <UIcon v-if="!playlist.cover_url" name="i-heroicons-musical-note" class="w-16 h-16 text-gray-400" />
                <img v-else :src="playlist.cover_url" class="w-full h-full object-cover" alt="Playlist cover" />
              </div>

              <!-- Play button overlay -->
              <div class="absolute inset-0 hover:bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                <button 
                  class="play-button opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
                >
                  <UIcon name="i-heroicons-play" class="w-6 h-6" />
                </button>
              </div>
            </div>

            <h3 class="font-semibold truncate text-sm">{{ playlist.name }}</h3>
            <p class="text-xs text-gray-500 mt-1">{{ playlist.track_count || 0 }} tracks</p>
          </NuxtLink>
        </div>
      </div>

      <div class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Recently Played</h2>

        <div v-if="recentlyPlayed.length === 0" class="text-center py-6 bg-gray-50 rounded-lg">
          <p class="text-gray-500">No recently played tracks.</p>
        </div>

        <div v-else class="space-y-2">
          <div
              v-for="track in recentlyPlayed"
              :key="track.id"
              class="flex items-center p-2 hover:bg-gray-50 rounded"
          >
            <img
                :src="track.cover_url || 'https://via.placeholder.com/40x40?text=No+Cover'"
                class="w-10 h-10 object-cover rounded mr-3"
            />
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">{{ track.title }}</div>
              <div class="text-sm text-gray-500 truncate">
                {{ track.track_authors?.map(a => a.author.name).join(', ') || 'Unknown Artist' }}
              </div>
            </div>
            <button
                @click="playTrack(track, recentlyPlayed)"
                class="ml-2 p-2 rounded-full hover:bg-gray-200"
            >
              <UIcon
                  :name="isCurrentTrack(track) && isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
                  class="w-5 h-5"
              />
            </button>
          </div>
        </div>
      </div>
      <!-- Additional sections can be added here -->
    </div>
  </div>
</template>

