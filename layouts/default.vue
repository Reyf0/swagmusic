<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { useSearchStore } from '@/stores/searchStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { storeToRefs } from 'pinia'
import MiniPlayer from '@/components/MiniPlayer.vue'
import PlayerViews from '@/components/player/PlayerViews.vue'
import ResizablePanel from '@/components/ResizablePanel.vue'
import PlaylistSidebar from '@/components/PlaylistSidebar.vue'
import { ref, onMounted, watch } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'

const supabase = useSupabaseClient()

const profileStore = useProfileStore()
const { displayName, avatarUrl, isLoggedIn, isAdmin } = storeToRefs(profileStore)
const playerStore = usePlayerStore()
const searchStore = useSearchStore()
const { query } = storeToRefs(searchStore)
const { currentTrack } = storeToRefs(playerStore)

const loading = ref(true)
const error = ref(null)

const router = useRouter()
const toast = useToast()

// Sidebar state
const sidebarCollapsed = ref(false)
const sidebarWidth = ref(240)
const rightSidebarWidth = ref(360)
const collapseThreshold = 240
const collapseWidth = 60
const expandedDefaultWidth = 240

// Profile state
const profileDropdownMenuItems = ref<DropdownMenuItem[][]>([
    [
      { label: 'Profile', to: '/profile' },
      { label: 'Upload', to: '/upload'},
      { label: 'Settings '}
    ],
    [
      { label: 'Log out', slot: 'logOut', onSelect() { signOut() } }
    ]
])

const fetchProfile = async () => {
  loading.value = true
  error.value = null

  try {
    await profileStore.loadProfile()

    if (isAdmin) {
      profileDropdownMenuItems.value.splice(1, 0,[{ label: 'Admin', to: '/admin' }])
    }
  } catch (err) {
    console.error('Error fetching profile:', err)
    error.value = err.message || 'Ошибка загрузки профиля'
    toast.add({ title: 'Ошибка загрузки профиля', description: error.value, color: 'error' })
  } finally {
    loading.value = false
  }
}

const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    toast.add({ title: 'Ошибка при выходе', description: error.message, color: 'error' })
  } else {
    toast.add({ title: 'Вы вышли из аккаунта', color: 'success' })
    await router.push('/login')
  }
}

const handleSearch = async () => {
  if (query.value) await router.push({ path: '/search', query: { q: query.value } })
}

// Sidebar handlers
const toggleSidebarCollapse = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  // When collapsing, set width to collapsed width (60px)
  // When expanding, set width to default expanded width (240px)
  if (sidebarCollapsed.value) {
    sidebarWidth.value = 60
  } else {
    sidebarWidth.value = 240
  }
}


const handleSidebarResize = (width: number) => {
  if (sidebarCollapsed.value) {
    if (width > collapseThreshold) {
      sidebarCollapsed.value = false
      sidebarWidth.value = Math.max(width, expandedDefaultWidth) // Set to new width when expanding
    }
    return
  }
  // If not collapsed, just update the width
  sidebarWidth.value = width


  // Auto-expand when dragging from collapsed state to larger width
  if (width <= collapseThreshold) {
    sidebarCollapsed.value = true
    sidebarWidth.value = collapseWidth
  }
}

const handleRightSidebarResize = (width: number) => {
  rightSidebarWidth.value = width
}


watch(query, async () => {
  await searchStore.searchTracks(supabase)
})

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div>
    <UApp>
      <div class="flex flex-col h-screen">
        <!-- NAVIGATION -->
        <nav class="bg-black p-4">
          <div class="container mx-auto flex justify-between items-center">
            <UButton><NuxtLink to="/" class="text-[#4ade80] text-xl font-bold">SwagMusic</NuxtLink></UButton>
            <input
                v-model="query"
                type="text"
                placeholder="Search by title or artist"
                class="hover:bg-old-neutral-700 transition w-full px-4 py-1 mx-10 border border-gray-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-white"
                @keydown.enter="handleSearch"
            >
            <div class="flex space-x-4 **:font-bold">
              <UButton><NuxtLink to="/" class="hover:text-white text-gray-300">Home</NuxtLink></UButton>
              <UButton><NuxtLink to="/tracks" class="hover:text-white text-gray-300">Tracks</NuxtLink></UButton>
              <template v-if="isLoggedIn">
                <UButton><NuxtLink to="/library" class="hover:text-white text-gray-300">Library</NuxtLink></UButton>
                <UDropdownMenu
                    :items="profileDropdownMenuItems"
                >
                  <UTooltip :text="displayName">
                    <UAvatar :src="avatarUrl" :alt="displayName"/>
                  </UTooltip>
                </UDropdownMenu>
              </template>
              <template v-else>
                <UButton><NuxtLink to="/register" class="hover:text-white text-gray-300">Register</NuxtLink></UButton>
                <UButton class="has-[a.router-link-active]:bg-transparent border bg-white hover:*:text-white"><NuxtLink to="/login" class="text-black">Login</NuxtLink></UButton>
              </template>
              <ColorModeButton class="text-white hover:bg-gray-800/50"/>
            </div>

          </div>
        </nav>

        <!-- MAIN CONTENT -->
        <!-- Main content + sidebar + views -->
        <div class="flex  dark:text-white dark:bg-old-neutral-900 flex-1 overflow-hidden">
          <!-- Playlist Sidebar -->
          <ResizablePanel
            :width="sidebarWidth"
            :default-width="sidebarWidth"
            :min-width="60"
            :max-width="400"
            position="left"
            :resizable="true"
            class="shrink-0"
            @resize="handleSidebarResize"
          >
            <PlaylistSidebar
              :is-collapsed="sidebarCollapsed"
              @toggle-collapse="toggleSidebarCollapse"
              @resize="handleSidebarResize"
            />
          </ResizablePanel>

          <!-- Page Content -->
          <main class="flex-1 overflow-y-auto">
            <!-- Если открыт fullscreen View, рендерим его -->
            <PlayerViews
                v-if="playerStore.getFullscreenView"
                :view="playerStore.getFullscreenView!"
                mode="fullscreen"
            />
            <!-- Иначе рендерим NuxtPage -->
            <NuxtPage v-else />
          </main>


          <!-- Sidebar View -->
          <ResizablePanel
              v-if="playerStore.getSidebarView"
              :width="rightSidebarWidth"
              :default-width="rightSidebarWidth"
              :min-width="300"
              :max-width="600"
              position="right"
              :resizable="true"
              class="shrink-0"
              @resize="handleRightSidebarResize"
          >
            <aside class="w-full h-full border-l border-old-neutral-700 bg-old-neutral-900 text-white overflow-y-auto">
              <PlayerViews
                  :view="playerStore.getSidebarView!"
                  mode="sidebar"
              />
            </aside>
          </ResizablePanel>


        </div>

        <!-- MINI PLAYER -->
        <MiniPlayer v-if="currentTrack" />
      </div>
    </UApp>
  </div>
</template>

<style scoped>
nav a.router-link-active {
  color: #4ade80;
}
</style>
