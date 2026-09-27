<script setup lang="ts">
withDefaults(defineProps<{
  isCollapsed?: boolean
}>(), {
  isCollapsed: false,
})

const emit = defineEmits<{
  'toggle-collapse': []
}>()

const route = useRoute()
const user = useSupabaseUser()
const playlistsStore = usePlaylistsStore()
const { mine: playlists, loading: isLoading } = storeToRefs(playlistsStore)

onMounted(() => playlistsStore.load())
</script>

<template>
  <div
    class="playlist-sidebar bg-black text-white flex flex-col h-full transition-all duration-300"
    :class="{ 'collapsed': isCollapsed }"
  >
    <!-- Header -->
    <div
        class="flex items-center p-4 border-b border-old-neutral-700"
        :class="isCollapsed ? 'justify-center' : 'justify-between'"
    >
      <h2 v-if="!isCollapsed" class="text-lg font-semibold">Your Library</h2>
      <button
        class="flex items-center justify-center rounded-lg p-2 hover:bg-old-neutral-800 transition-colors"
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
          <UButton block icon="i-heroicons-plus" color="neutral" variant="soft" @click="playlistsStore.openCreate()">
            Create playlist
          </UButton>
        </div>

        <!-- Playlists List -->
        <div class="px-2">
          <div v-if="isLoading && !playlists.length" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"/>
          </div>

          <div v-else-if="playlists.length === 0" class="text-center py-8 text-gray-400">
            <UIcon name="i-heroicons-musical-note" class="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p class="text-sm">No playlists yet</p>
            <p v-if="user" class="text-xs mt-1">Create your first playlist</p>
            <NuxtLink v-else to="/login" class="text-xs mt-1 hover:underline">Log in to create playlists</NuxtLink>
          </div>

          <div v-else class="space-y-1">
            <NuxtLink
              v-for="playlist in playlists"
              :key="playlist.id"
              :to="`/playlist/${playlist.id}`"
              class="flex items-center p-3 hover:bg-old-neutral-800 rounded-lg transition-colors group"
              :class="{ 'bg-old-neutral-800': route.path === `/playlist/${playlist.id}` }"
            >
              <div class="size-12 bg-old-neutral-700 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
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
                  Playlist • {{ playlist.track_count }} {{ playlist.track_count === 1 ? 'track' : 'tracks' }}
                </p>
              </div>
            </NuxtLink>
          </div>
        </div>
      </template>

      <!-- Collapsed state -->
      <template v-else>
        <div class="flex flex-col items-center justify-center p-2 space-y-2">
          <button
            class="flex items-center justify-center p-2.5 hover:bg-old-neutral-800 rounded-lg transition-colors"
            title="Create Playlist"
            @click="playlistsStore.openCreate()"
          >
            <UIcon name="i-heroicons-plus" class="w-6 h-6" />
          </button>

          <NuxtLink
            v-for="playlist in playlists.slice(0, 10)"
            :key="playlist.id"
            :to="`/playlist/${playlist.id}`"
            class="flex justify-center items-center w-full p-3 hover:bg-old-neutral-800 rounded-lg transition-colors"
            :title="playlist.name"
          >
            <div class="w-6 h-6 bg-old-neutral-700 rounded flex items-center justify-center mx-auto">
              <img
                v-if="playlist?.cover_url"
                :src="playlist?.cover_url"
                :alt="playlist.name"
                class="w-full h-full object-cover rounded"
              >
              <UIcon v-else name="i-heroicons-musical-note" class="w-4 h-4 text-old-neutral-400" />
            </div>
          </NuxtLink>
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
