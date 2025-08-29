<script setup lang="ts">
import { ref, onMounted } from 'vue'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<{
  isCollapsed: boolean
}>()

const emit = defineEmits<{
  'toggle-collapse': []
  'resize': [width: number]
}>()

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const playlists = ref<Playlist[]>([])
const loading = ref(true)

const fetchUserPlaylists = async () => {
  if (!user.value) return

  loading.value = true
  try {
    const { data, error } = await supabase
      .from('playlists')
      .select(`
        *,
        profiles!playlists_user_id_fkey1(username)
      `)
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    playlists.value = data || []
  } catch (err) {
    console.error('Error fetching playlists:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (user.value) {
    void fetchUserPlaylists()
  }
})

const navigateToPlaylist = (playlistId: string) => {
  navigateTo(`/playlist/${playlistId}`)
}
</script>

<template>
  <div 
    class="playlist-sidebar bg-black text-white flex flex-col h-full transition-all duration-300"
    :class="{ 'collapsed': isCollapsed }"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-700">
      <h2 v-if="!isCollapsed" class="text-lg font-semibold">Your Library</h2>
      <button 
        class="p-2 hover:bg-gray-800 rounded-full transition-colors"
        :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="emit('toggle-collapse')"
      >
        <UIcon 
          :name="isCollapsed ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'" 
          class="w-5 h-5" 
        />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <template v-if="!isCollapsed">
        <!-- Create Playlist Button -->
        <div class="p-4">
          <UButton 
            class="w-full bg-gray-800 hover:bg-gray-700 text-white"
            @click="navigateTo('/create-playlist')"
          >
            <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-2" />
            Create Playlist
          </UButton>
        </div>

        <!-- Playlists List -->
        <div class="px-2">
          <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"/>
          </div>

          <div v-else-if="playlists.length === 0" class="text-center py-8 text-gray-400">
            <UIcon name="i-heroicons-musical-note" class="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p class="text-sm">No playlists yet</p>
            <p class="text-xs mt-1">Create your first playlist</p>
          </div>

          <div v-else class="space-y-1">
            <div
              v-for="playlist in playlists"
              :key="playlist.id"
              class="flex items-center p-3 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors group"
              @click="navigateToPlaylist(playlist.id)"
            >
              <div class="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <img 
                  v-if="playlist.cover_url" 
                  :src="playlist.cover_url" 
                  :alt="playlist.name"
                  class="w-full h-full object-cover rounded-lg"
                >
                <UIcon v-else name="i-heroicons-musical-note" class="w-6 h-6 text-gray-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate group-hover:text-white">{{ playlist.name }}</p>
                <p class="text-sm text-gray-400 truncate">
                  Playlist • {{ playlist.profiles?.username || 'You' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Collapsed state -->
      <template v-else>
        <div class="p-2 space-y-2">
          <button 
            class="w-full p-3 hover:bg-gray-800 rounded-lg transition-colors"
            title="Create Playlist"
            @click="navigateTo('/create-playlist')"
          >
            <UIcon name="i-heroicons-plus" class="w-6 h-6" />
          </button>

          <div
            v-for="playlist in playlists.slice(0, 10)"
            :key="playlist.id"
            class="flex justify-center items-center w-full p-3 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
            :title="playlist.name"
            @click="navigateToPlaylist(playlist.id)"
          >
            <div class="w-6 h-6 bg-gray-700 rounded flex items-center justify-center mx-auto">
              <img 
                v-if="playlist.cover_url" 
                :src="playlist.cover_url" 
                :alt="playlist.name"
                class="w-full h-full object-cover rounded"
              >
              <UIcon v-else name="i-heroicons-musical-note" class="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.playlist-sidebar {
  /* Width is controlled by ResizablePanel parent */
  width: 100%;
  height: 100%;
}
.playlist-sidebar:not(.collapsed) {
  min-width: 200px;
}

.playlist-sidebar.collapsed h2,
.playlist-sidebar.collapsed .truncate {
  display: none;
}
</style>
