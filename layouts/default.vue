<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { useSearchStore } from '@/stores/searchStore'
import { storeToRefs } from 'pinia'
import MiniPlayer from '@/components/MiniPlayer.vue'
import PlayerViews from '@/components/player/PlayerViews.vue'
import ResizablePanel from '@/components/ResizablePanel.vue'
import PlaylistSidebar from '@/components/PlaylistSidebar.vue'
import { ref, onMounted, watch } from 'vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const router = useRouter()
const toast = useToast()

const profile = ref(null)
const loading = ref(true)
const error = ref(null)

// Sidebar state
const sidebarCollapsed = ref(false)
const sidebarWidth = ref(240)
const rightSidebarWidth = ref(360)
const collapseThreshold = 240
const collapseWidth = 60
const expandedDefaultWidth = 240

const playerStore = usePlayerStore()
const searchStore = useSearchStore()
const { query } = storeToRefs(searchStore)
const { currentTrack } = storeToRefs(playerStore)

const fetchProfile = async () => {
  if (!user.value) return
  loading.value = true
  error.value = null

  try {
    const { data, error: supabaseError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

    if (supabaseError) throw supabaseError
    profile.value = data || {
      id: user.value.id,
      username: user.value.user_metadata?.username || user.value.email?.split('@')[0] || 'User'
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
  if (user.value) fetchProfile()
})
</script>

<template>
  <div>
    <UApp>
      <div class="flex flex-col h-screen">
        <!-- NAVIGATION -->
        <nav class="bg-gray-800 p-4">
          <div class="container mx-auto flex justify-between items-center">
            <UButton><NuxtLink to="/" class="text-white text-xl font-bold">SwagMusic</NuxtLink></UButton>
            <input
                v-model="query"
                type="text"
                placeholder="Search by title or artist"
                class="w-full px-4 py-1 mx-10 border border-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                @keydown.enter="handleSearch"
            />
            <div class="flex space-x-4">
              <UButton><NuxtLink to="/" class="text-white hover:text-gray-300">Home</NuxtLink></UButton>
              <UButton><NuxtLink to="/tracks" class="text-white hover:text-gray-300">Tracks</NuxtLink></UButton>
              <template v-if="user">
                <UButton><NuxtLink to="/library" class="text-white hover:text-gray-300">Library</NuxtLink></UButton>
                <UButton><NuxtLink to="/upload" class="text-white hover:text-gray-300">Upload</NuxtLink></UButton>
                <UButton><NuxtLink to="/profile" class="text-white hover:text-gray-300">Profile</NuxtLink></UButton>
                <UButton class="text-white hover:text-gray-300" @click="signOut">Sign out</UButton>
                <UButton v-if="profile?.is_admin" class="text-white hover:text-gray-300"><NuxtLink to="/admin">Admin</NuxtLink></UButton>
              </template>
              <template v-else>
                <UButton><NuxtLink to="/login" class="text-white hover:text-gray-300">Login</NuxtLink></UButton>
                <UButton><NuxtLink to="/register" class="text-white hover:text-gray-300">Register</NuxtLink></UButton>
              </template>
            </div>
          </div>
        </nav>

        <!-- MAIN CONTENT -->
        <!-- Main content + sidebar + views -->
        <div class="flex flex-1 overflow-hidden">
          <!-- Playlist Sidebar -->
          <ResizablePanel
            :width="sidebarWidth"
            :default-width="sidebarWidth"
            :min-width="60"
            :max-width="400"
            position="left"
            :resizable="true"
            @resize="handleSidebarResize"
            class="shrink-0"
          >
            <PlaylistSidebar
              :is-collapsed="sidebarCollapsed"
              @toggle-collapse="toggleSidebarCollapse"
              @resize="handleSidebarResize"
            />
          </ResizablePanel>

          <!-- Page Content -->
          <main class="flex-1 overflow-y-auto p-4">
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
              @resize="handleRightSidebarResize"
              class="shrink-0"
          >
            <aside class="w-full h-full border-l border-neutral-700 bg-neutral-800 text-white overflow-y-auto">
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
  font-weight: bold;
  color: #4ade80;
}
</style>
