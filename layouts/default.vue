<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useProfileStore } from '@/stores/useProfileStore'
import { useTracksStore } from '@/stores/useTracksStore'
import MiniPlayer from '@/components/MiniPlayer.vue'
import PlayerViews from '@/components/player/PlayerViews.vue'
import ResizablePanel from '@/components/ResizablePanel.vue'
import PlaylistSidebar from '@/components/PlaylistSidebar.vue'
import type { DropdownMenuItem } from '@nuxt/ui'

const supabase = useSupabaseClient()

const profileStore = useProfileStore()
const { displayName, avatarUrl, isLoggedIn, isAdmin } = storeToRefs(profileStore)
const playerStore = usePlayerStore()
const { currentTrack } = storeToRefs(playerStore)
const tracksStore = useTracksStore()
const { q } = storeToRefs(tracksStore)

const loading = ref(true)
const error = ref(null)

const router = useRouter()
const toast = useToast()

/* Desktop sidebar state */
const sidebarCollapsed = ref(false)
const sidebarWidth = ref(240)
const rightSidebarWidth = ref(360)
const collapseThreshold = 240
const collapseWidth = 60
const expandedDefaultWidth = 240

/* Mobile UI state */
const mobileMenuOpen = ref(false)
const mobileSidebarOpen = ref(false)
const mobileSearchOpen = ref(false)

/* mounted flag to avoid SSR/client mismatches */
const mounted = ref(false)

/* Profile dropdown items */
const profileDropdownMenuItems = ref<DropdownMenuItem[][]>([
  [
    { label: 'Profile', to: '/profile' },
    { label: 'Upload', to: '/upload' },
    { label: 'Settings', to: '/settings' },
    { label: 'Studio', to: '/studio' }
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

    // mutate items only on client (we call fetchProfile onMounted)
    if (isAdmin.value) {
      // prevent duplicate Admin insertion
      const hasAdmin = profileDropdownMenuItems.value.some(group =>
          group.some(item => item.label === 'Admin')
      )
      if (!hasAdmin) {
        // insert as a separate group for clarity (client-only)
        profileDropdownMenuItems.value.splice(1, 0, [{ label: 'Admin', to: '/admin' }])
      }
    }
  } catch (err: any) {
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
  if (q.value) {
    mobileSearchOpen.value = false
    await router.push({ path: '/search', query: { q: q.value } })
  }
}

/* Sidebar handlers */
const toggleSidebarCollapse = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  sidebarWidth.value = sidebarCollapsed.value ? collapseWidth : expandedDefaultWidth
}

const handleSidebarResize = (width: number) => {
  if (sidebarCollapsed.value) {
    if (width > collapseThreshold) {
      sidebarCollapsed.value = false
      sidebarWidth.value = Math.max(width, expandedDefaultWidth)
    }
    return
  }
  sidebarWidth.value = width
  if (width <= collapseThreshold) {
    sidebarCollapsed.value = true
    sidebarWidth.value = collapseWidth
  }
}

const handleRightSidebarResize = (width: number) => {
  rightSidebarWidth.value = width
}

/* Mobile toggles */
const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
  if (mobileMenuOpen.value) {
    mobileSearchOpen.value = false
    mobileSidebarOpen.value = false
  }
}
const openMobileSidebar = () => {
  mobileSidebarOpen.value = true
  mobileMenuOpen.value = false
  mobileSearchOpen.value = false
}
const closeMobileSidebar = () => { mobileSidebarOpen.value = false }
const openMobileSearch = () => {
  mobileSearchOpen.value = true
  mobileMenuOpen.value = false
  mobileSidebarOpen.value = false
}
const closeMobileSearch = () => { mobileSearchOpen.value = false }

watch(q, async () => {
  tracksStore.search()
})

onMounted(async () => {
  mounted.value = true
  // fetch profile only on client — avoids changing server HTML after hydration
  await fetchProfile()
  // if you want to programmatically focus the search after opening, do it here via nextTick and only on client
})

</script>

<template>
  <div>
    <UApp>
      <div class="flex flex-col h-screen">
        <!-- NAVIGATION -->
        <!-- Desktop nav: shell is always rendered (same node on server+client).
             Internal parts that depend on client-only data are wrapped in ClientOnly. -->
        <nav class="bg-black p-4 hidden md:block">
          <div class="container mx-auto flex justify-between items-center">
            <UButton>
              <NuxtLink to="/" class="text-[#4ade80] text-xl font-bold">SwagMusic</NuxtLink>
            </UButton>

            <div class="flex-1 mx-6">
              <input
                  v-model="q"
                  type="text"
                  placeholder="Search by title or artist"
                  class="hover:bg-old-neutral-700 transition w-full px-4 py-1 border border-gray-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-white"
                  @keydown.enter="handleSearch"
              />
            </div>

            <div class="flex items-center space-x-4">
              <UButton><NuxtLink to="/" class="hover:text-white text-gray-300">Home</NuxtLink></UButton>
              <UButton><NuxtLink to="/tracks" class="hover:text-white text-gray-300">Tracks</NuxtLink></UButton>

              <!-- client-only profile area -->
              <ClientOnly>
                <template #default>
                  <template v-if="isLoggedIn">
                    <UButton><NuxtLink to="/library" class="hover:text-white text-gray-300">Library</NuxtLink></UButton>
                    <UDropdownMenu
                        :items="profileDropdownMenuItems"
                        class="bg-old-neutral-800 cursor-pointer"
                        :ui="{ content: 'dark:bg-old-neutral-800 dark:text-old-neutral-300 text-old-neutral-800' }"
                    >
                      <UTooltip :text="displayName">
                        <UAvatar :src="avatarUrl" :alt="displayName" :ui="{ content:'text-white' }"/>
                      </UTooltip>
                    </UDropdownMenu>
                  </template>

                  <template v-else>
                    <UButton><NuxtLink to="/register" class="hover:text-white text-gray-300">Register</NuxtLink></UButton>
                    <UButton class="has-[a.router-link-active]:bg-transparent border bg-white hover:*:text-white">
                      <NuxtLink to="/login" class="text-black">Login</NuxtLink>
                    </UButton>
                  </template>

                  <ColorModeButton class="cursor-pointer text-white hover:bg-gray-800/50"/>
                </template>
              </ClientOnly>
            </div>
          </div>
        </nav>

        <!-- Mobile nav (shell always present; interactive content client-only where needed) -->
        <nav class="bg-black p-3 flex items-center justify-between md:hidden">
          <div class="flex items-center space-x-2">
            <button aria-label="Open menu" @click="toggleMobileMenu" class="p-2 rounded-md hover:bg-gray-800/50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>

            <UButton><NuxtLink to="/" class="text-[#4ade80] text-lg font-bold">SwagMusic</NuxtLink></UButton>
          </div>

          <div class="flex items-center space-x-2">
            <button aria-label="Search" @click="openMobileSearch" class="p-2 rounded-md hover:bg-gray-800/50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/>
              </svg>
            </button>

            <button aria-label="Open playlists" @click="openMobileSidebar" class="p-2 rounded-md hover:bg-gray-800/50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6m6 13V6M3 6h18"/>
              </svg>
            </button>

            <!-- client-only small avatar / auth links -->
            <ClientOnly>
              <template #default>
                <div v-if="isLoggedIn">
                  <UDropdownMenu
                      :items="profileDropdownMenuItems"
                      class="bg-old-neutral-800 cursor-pointer"
                      :ui="{ content: 'dark:bg-old-neutral-800 dark:text-old-neutral-300 text-old-neutral-800' }"
                  >
                    <UTooltip :text="displayName">
                      <UAvatar :src="avatarUrl" :alt="displayName" size="sm" :ui="{ content:'text-white' }"/>
                    </UTooltip>
                  </UDropdownMenu>
                </div>

                <div v-else>
                  <UButton><NuxtLink to="/login" class="text-gray-300">Login</NuxtLink></UButton>
                </div>
              </template>
            </ClientOnly>
          </div>
        </nav>

        <!-- Mobile menu drawer (client-only) -->
        <ClientOnly>
          <transition name="fade">
            <div v-if="mobileMenuOpen" class="fixed inset-0 z-40">
              <div class="absolute inset-0 bg-black/50" @click="mobileMenuOpen = false"></div>
              <aside class="absolute left-0 top-0 bottom-0 w-72 bg-old-neutral-900 text-white p-4 overflow-y-auto shadow-lg">
                <div class="flex items-center justify-between mb-4">
                  <UButton><NuxtLink to="/" class="text-[#4ade80] text-lg font-bold">SwagMusic</NuxtLink></UButton>
                  <button @click="mobileMenuOpen = false" class="p-2 rounded-md hover:bg-gray-800/50">
                    ✕
                  </button>
                </div>

                <nav class="flex flex-col space-y-2">
                  <NuxtLink to="/" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Home</NuxtLink>
                  <NuxtLink to="/tracks" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Tracks</NuxtLink>

                  <template v-if="isLoggedIn">
                    <NuxtLink to="/library" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Library</NuxtLink>
                    <NuxtLink to="/upload" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Upload</NuxtLink>
                  </template>

                  <template v-else>
                    <NuxtLink to="/register" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Register</NuxtLink>
                    <NuxtLink to="/login" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Login</NuxtLink>
                  </template>

                  <div class="mt-4 border-t border-old-neutral-800 pt-3">
                    <div class="text-sm text-old-neutral-400 mb-2">Profile</div>
                    <div class="flex items-center space-x-3">
                      <UAvatar :src="avatarUrl" :alt="displayName" size="sm" />
                      <div>
                        <div class="text-white text-sm">{{ displayName }}</div>
                        <div class="text-xs text-old-neutral-500">{{ isLoggedIn ? 'Signed in' : 'Guest' }}</div>
                      </div>
                    </div>

                    <div class="mt-3 flex flex-col space-y-2">
                      <div v-for="(group, gIdx) in profileDropdownMenuItems" :key="`group-${gIdx}`" class="flex flex-col space-y-1">
                        <template v-for="(item, idx) in group" :key="`item-${gIdx}-${idx}`">
                          <NuxtLink v-if="item.to" :to="item.to" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">
                            {{ item.label }}
                          </NuxtLink>

                          <button v-else-if="item.slot === 'logOut'" @click="item.onSelect && item.onSelect()" class="text-left px-3 py-2 rounded-md hover:bg-old-neutral-800">
                            {{ item.label }}
                          </button>

                          <button v-else @click="item.onSelect && item.onSelect()" class="text-left px-3 py-2 rounded-md hover:bg-old-neutral-800">
                            {{ item.label }}
                          </button>
                        </template>
                      </div>
                    </div>
                  </div>

                  <div class="mt-4">
                    <ColorModeButton />
                  </div>
                </nav>
              </aside>
            </div>
          </transition>
        </ClientOnly>

        <!-- Mobile search overlay (client-only). autofocus removed. -->
        <ClientOnly>
          <transition name="fade">
            <div v-if="mobileSearchOpen" class="fixed inset-0 z-50 flex items-start pt-8">
              <div class="absolute inset-0 bg-black/50" @click="closeMobileSearch"></div>
              <div class="relative mx-auto w-full px-4">
                <div class="bg-old-neutral-900 rounded-xl p-3 shadow-lg">
                  <div class="flex items-center">
                    <input
                        v-model="q"
                        type="text"
                        placeholder="Search by title or artist"
                        class="w-full px-3 py-2 rounded-md bg-old-neutral-800 text-white focus:outline-none"
                        @keydown.enter="handleSearch"
                    />
                    <button @click="handleSearch" class="ml-2 p-2 rounded-md hover:bg-gray-800/50">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </ClientOnly>

        <!-- MAIN CONTENT -->
        <div class="flex dark:text-white dark:bg-old-neutral-900 flex-1 overflow-hidden">
          <!-- Desktop Playlist Sidebar (shell present on both server and client to keep DOM order) -->
          <ResizablePanel
              class="shrink-0 hidden md:block"
              :width="sidebarWidth"
              :default-width="sidebarWidth"
              :min-width="60"
              :max-width="400"
              position="left"
              :resizable="true"
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
            <!-- PlayerViews may change on client only; render client-side to avoid SSR differences -->
            <ClientOnly>
              <template #default>
                <PlayerViews v-if="playerStore.getFullscreenView" :view="playerStore.getFullscreenView!" mode="fullscreen"/>
              </template>
            </ClientOnly>

            <!-- Nuxt page (server-rendered) stays stable -->
            <NuxtPage />
          </main>

          <!-- Right Sidebar (render client-only to avoid mismatch if it only appears on client) -->
          <ClientOnly>
            <template #default>
              <ResizablePanel
                  v-if="playerStore.getSidebarView"
                  class="shrink-0 hidden md:block"
                  :width="rightSidebarWidth"
                  :default-width="rightSidebarWidth"
                  :min-width="300"
                  :max-width="600"
                  position="right"
                  :resizable="true"
                  @resize="handleRightSidebarResize"
              >
                <aside class="w-full h-full border-l border-old-neutral-700 bg-old-neutral-900 text-white overflow-y-auto">
                  <PlayerViews :view="playerStore.getSidebarView!" mode="sidebar" />
                </aside>
              </ResizablePanel>
            </template>
          </ClientOnly>
        </div>

        <!-- Mobile Playlist Drawer (client-only) -->
        <ClientOnly>
          <transition name="slide-left">
            <div v-if="mobileSidebarOpen" class="fixed inset-0 z-40 md:hidden">
              <div class="absolute inset-0 bg-black/50" @click="closeMobileSidebar"></div>
              <aside class="absolute left-0 top-0 bottom-0 w-80 bg-old-neutral-900 text-white overflow-y-auto p-2">
                <div class="flex items-center justify-between p-2">
                  <div class="text-lg font-semibold text-[#4ade80]">Playlists</div>
                  <button @click="closeMobileSidebar" class="p-2 rounded-md hover:bg-gray-800/50">✕</button>
                </div>
                <PlaylistSidebar :is-collapsed="false" @toggle-collapse="() => {}" @resize="() => {}" />
              </aside>
            </div>
          </transition>
        </ClientOnly>

        <!-- MINI PLAYER: render only on client to avoid SSR mismatch if currentTrack differs -->
        <ClientOnly>
          <template #default>
            <MiniPlayer v-if="currentTrack" />
          </template>
        </ClientOnly>
      </div>
    </UApp>
  </div>
</template>

<style scoped>
nav a.router-link-active {
  color: #4ade80;
}

/* transitions */
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-left-enter-active { transition: transform .25s ease; }
.slide-left-enter-from { transform: translateX(-100%); }
.slide-left-leave-to { transform: translateX(-100%); }
</style>
