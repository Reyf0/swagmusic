<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()

const profileStore = useProfileStore()
const { displayName, avatarUrl, isLoggedIn, isAdmin } = storeToRefs(profileStore)
const playerStore = usePlayerStore()
const { currentTrack } = storeToRefs(playerStore)
const studioStore = useStudioStore()
const { pendingInviteCount } = storeToRefs(studioStore)

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

/* Drag / swipe state for mobileMenu */
const menuTouching = ref(false)
const menuStartX = ref(0)
const menuDrag = ref(0) // negative when dragging left
const MENU_CLOSE_THRESHOLD = -80 // px threshold to trigger close

/* Drag / swipe state for mobileSidebar (playlist drawer) */
const sidebarTouching = ref(false)
const sidebarStartX = ref(0)
const sidebarDrag = ref(0)
const SIDEBAR_CLOSE_THRESHOLD = -80

// The feedback form remembers which page it was opened from.
const feedbackLink = computed(() => route.path === '/feedback' ? '/feedback' : `/feedback?from=${encodeURIComponent(route.fullPath)}`)

/* Profile dropdown items */
const profileDropdownMenuItems = computed<DropdownMenuItem[][]>(() => {
  const groups: DropdownMenuItem[][] = [
    [
      { label: 'Profile', icon: 'i-lucide-user-round', to: '/profile' },
      { label: 'Upload', icon: 'i-lucide-upload', to: '/upload' },
      { label: pendingInviteCount.value ? `Studio (${pendingInviteCount.value})` : 'Studio', icon: 'i-lucide-audio-lines', to: '/studio' },
      { label: 'Settings', icon: 'i-lucide-settings', to: '/settings' },
      { label: 'Keyboard shortcuts', icon: 'i-lucide-keyboard', kbds: ['?'], onSelect: () => { shortcutsOpen.value = true } },
      { label: 'Send feedback', icon: 'i-lucide-message-square-text', to: feedbackLink.value },
    ],
  ]
  if (isAdmin.value) groups.push([{ label: 'Admin', icon: 'i-lucide-shield', to: '/admin' }])
  groups.push([{ label: 'Log out', icon: 'i-lucide-log-out', onSelect: () => { signOut() } }])
  return groups
})

async function signOut() {
  try {
    await profileStore.signOut()
    toast.add({ title: 'Signed out', color: 'success' })
    await navigateTo('/')
  } catch (err: any) {
    toast.add({ title: 'Could not sign out', description: err?.message, color: 'error' })
  }
}

/* Search: typing on /search updates results live, Enter elsewhere opens /search */
const searchText = ref(typeof route.query.q === 'string' ? route.query.q : '')
watch(() => route.query.q, (v) => {
  if (route.path === '/search') searchText.value = typeof v === 'string' ? v : ''
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchText, (text) => {
  if (route.path !== '/search') return
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    navigateTo({ path: '/search', query: text.trim() ? { q: text.trim() } : {} }, { replace: true })
  }, 300)
})

async function handleSearch() {
  mobileSearchOpen.value = false
  const text = searchText.value.trim()
  await navigateTo({ path: '/search', query: text ? { q: text } : {} })
}

/* Keyboard shortcuts ("?" lists them) */
useHotkeys({
  focusSearch: () => {
    const input = [...document.querySelectorAll<HTMLInputElement>('nav input[role="combobox"]')].find(i => i.offsetParent)
    if (input) input.focus()
    else openMobileSearch()
  },
})
const shortcutsOpen = useShortcutsOpen()

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
    menuTouching.value = false
    menuDrag.value = 0
  }
}
const openMobileSidebar = () => {
  mobileSidebarOpen.value = true
  mobileMenuOpen.value = false
  mobileSearchOpen.value = false
  sidebarTouching.value = false
  sidebarDrag.value = 0
}
const closeMobileSidebar = () => {
  mobileSidebarOpen.value = false
  sidebarTouching.value = false
  sidebarDrag.value = 0
}
const openMobileSearch = () => {
  mobileSearchOpen.value = true
  mobileMenuOpen.value = false
  mobileSidebarOpen.value = false
}
const closeMobileSearch = () => { mobileSearchOpen.value = false }

// Close drawers after navigating from them.
watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
  mobileSidebarOpen.value = false
})

/* Swipe handlers for mobile menu (left drawer) */
const onMenuTouchStart = (e: TouchEvent) => {
  if (!mobileMenuOpen.value || !e.touches[0]) return
  menuTouching.value = true
  menuStartX.value = e.touches[0].clientX
  menuDrag.value = 0
}
const onMenuTouchMove = (e: TouchEvent) => {
  if (!menuTouching.value || !e.touches[0]) return
  menuDrag.value = Math.min(0, e.touches[0].clientX - menuStartX.value) // only allow left dragging
}
const onMenuTouchEnd = () => {
  if (!menuTouching.value) return
  if (menuDrag.value <= MENU_CLOSE_THRESHOLD) mobileMenuOpen.value = false
  menuTouching.value = false
  menuDrag.value = 0
}

/* Swipe handlers for mobile playlist sidebar */
const onSidebarTouchStart = (e: TouchEvent) => {
  if (!mobileSidebarOpen.value || !e.touches[0]) return
  sidebarTouching.value = true
  sidebarStartX.value = e.touches[0].clientX
  sidebarDrag.value = 0
}
const onSidebarTouchMove = (e: TouchEvent) => {
  if (!sidebarTouching.value || !e.touches[0]) return
  sidebarDrag.value = Math.min(0, e.touches[0].clientX - sidebarStartX.value) // only left drag to close
}
const onSidebarTouchEnd = () => {
  if (!sidebarTouching.value) return
  if (sidebarDrag.value <= SIDEBAR_CLOSE_THRESHOLD) mobileSidebarOpen.value = false
  sidebarTouching.value = false
  sidebarDrag.value = 0
}

/* computed inline styles used while dragging */
const mobileMenuAsideStyle = computed(() => menuTouching.value ? { transform: `translateX(${menuDrag.value}px)` } : {})
const mobileSidebarAsideStyle = computed(() => sidebarTouching.value ? { transform: `translateX(${sidebarDrag.value}px)` } : {})
</script>

<template>
  <div class="flex flex-col h-dvh">
    <!-- NAVIGATION (desktop) -->
    <nav class="bg-black px-4 py-3 hidden md:block">
      <div class="flex justify-between items-center gap-6">
        <NuxtLink to="/" class="text-[#4ade80] text-xl font-bold shrink-0">SwagMusic</NuxtLink>

        <SearchBox
          v-model="searchText"
          class="flex-1 max-w-xl"
          size="lg"
          :preview="route.path !== '/search'"
          :input-ui="{ base: 'rounded-full bg-old-neutral-800 text-white placeholder:text-old-neutral-400' }"
          @submit="handleSearch"
        />

        <div class="flex items-center gap-1">
          <UButton to="/" variant="ghost" color="neutral" class="text-old-neutral-300 hover:text-white">Home</UButton>
          <UButton to="/tracks" variant="ghost" color="neutral" class="text-old-neutral-300 hover:text-white">Tracks</UButton>
          <UButton to="/albums" variant="ghost" color="neutral" class="text-old-neutral-300 hover:text-white">Albums</UButton>

          <template v-if="isLoggedIn">
            <UButton to="/library" variant="ghost" color="neutral" class="text-old-neutral-300 hover:text-white">Library</UButton>
            <UDropdownMenu :items="profileDropdownMenuItems" :content="{ align: 'end' }">
              <UButton variant="ghost" color="neutral" class="rounded-full p-0.5" :aria-label="`Account menu for ${displayName}`">
                <UChip :show="pendingInviteCount > 0" color="error" size="md">
                  <UAvatar :src="avatarUrl ?? undefined" :alt="displayName ?? undefined" />
                </UChip>
              </UButton>
            </UDropdownMenu>
          </template>

          <template v-else>
            <UButton to="/register" variant="ghost" color="neutral" class="text-old-neutral-300 hover:text-white">Register</UButton>
            <UButton to="/login" color="neutral" variant="solid" class="rounded-full">Log in</UButton>
          </template>

          <ColorModeButton class="text-white" />
        </div>
      </div>
    </nav>

    <!-- NAVIGATION (mobile) -->
    <nav class="bg-black p-3 flex items-center justify-between md:hidden">
      <div class="flex items-center gap-2">
        <UButton icon="i-heroicons-bars-3" variant="ghost" color="neutral" class="text-white" aria-label="Open menu" @click="toggleMobileMenu" />
        <NuxtLink to="/" class="text-[#4ade80] text-lg font-bold">SwagMusic</NuxtLink>
      </div>

      <div class="flex items-center gap-1">
        <UButton icon="i-heroicons-magnifying-glass" variant="ghost" color="neutral" class="text-white" aria-label="Search" @click="openMobileSearch" />
        <UButton icon="i-lucide-list-music" variant="ghost" color="neutral" class="text-white" aria-label="Open playlists" @click="openMobileSidebar" />

        <UDropdownMenu v-if="isLoggedIn" :items="profileDropdownMenuItems" :content="{ align: 'end' }">
          <UButton variant="ghost" color="neutral" class="rounded-full p-0.5" aria-label="Account menu">
            <UChip :show="pendingInviteCount > 0" color="error">
              <UAvatar :src="avatarUrl ?? undefined" :alt="displayName ?? undefined" size="sm" />
            </UChip>
          </UButton>
        </UDropdownMenu>
        <UButton v-else to="/login" size="sm" color="neutral" class="rounded-full">Log in</UButton>
      </div>
    </nav>

    <!-- Mobile menu drawer -->
    <ClientOnly>
      <transition name="slide-in">
        <div v-if="mobileMenuOpen" class="fixed inset-0 z-40 md:hidden">
          <div class="absolute inset-0 bg-black/50" @click="mobileMenuOpen = false" />
          <aside
            class="absolute left-0 top-0 bottom-0 w-72 bg-old-neutral-900 text-white p-4 overflow-y-auto shadow-lg"
            :class="{ 'no-transition': menuTouching }"
            :style="mobileMenuAsideStyle"
            @touchstart.passive="onMenuTouchStart"
            @touchmove.passive="onMenuTouchMove"
            @touchend.passive="onMenuTouchEnd"
          >
            <div class="flex items-center justify-between mb-4">
              <NuxtLink to="/" class="text-[#4ade80] text-lg font-bold">SwagMusic</NuxtLink>
              <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" class="text-white" aria-label="Close menu" @click="mobileMenuOpen = false" />
            </div>

            <nav class="flex flex-col gap-1">
              <NuxtLink to="/" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Home</NuxtLink>
              <NuxtLink to="/tracks" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Tracks</NuxtLink>
              <NuxtLink to="/albums" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Albums</NuxtLink>
              <NuxtLink to="/search" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Search</NuxtLink>

              <template v-if="isLoggedIn">
                <NuxtLink to="/library" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Library</NuxtLink>

                <div class="mt-4 border-t border-old-neutral-800 pt-3">
                  <div class="flex items-center gap-3 px-3 mb-2">
                    <UAvatar :src="avatarUrl ?? undefined" :alt="displayName ?? undefined" size="sm" />
                    <div class="text-sm">{{ displayName }}</div>
                  </div>
                  <template v-for="(group, gIdx) in profileDropdownMenuItems" :key="gIdx">
                    <template v-for="item in group" :key="item.label">
                      <NuxtLink v-if="item.to" :to="item.to" class="block px-3 py-2 rounded-md hover:bg-old-neutral-800">{{ item.label }}</NuxtLink>
                      <button v-else type="button" class="w-full text-left px-3 py-2 rounded-md hover:bg-old-neutral-800" @click="mobileMenuOpen = false; item.onSelect?.($event)">{{ item.label }}</button>
                    </template>
                  </template>
                </div>
              </template>

              <template v-else>
                <NuxtLink to="/register" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Register</NuxtLink>
                <NuxtLink to="/login" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Log in</NuxtLink>
                <NuxtLink :to="feedbackLink" class="px-3 py-2 rounded-md hover:bg-old-neutral-800">Send feedback</NuxtLink>
              </template>

              <div class="mt-4 px-1">
                <ColorModeButton />
              </div>
            </nav>
          </aside>
        </div>
      </transition>
    </ClientOnly>

    <!-- Mobile search overlay -->
    <ClientOnly>
      <transition name="fade">
        <div v-if="mobileSearchOpen" class="fixed inset-0 z-50 flex items-start pt-8 md:hidden">
          <div class="absolute inset-0 bg-black/50" @click="closeMobileSearch" />
          <div class="relative mx-auto w-full px-4">
            <div class="bg-old-neutral-900 rounded-xl p-3 shadow-lg max-h-[85dvh] overflow-y-auto">
              <SearchBox
                v-model="searchText"
                inline
                autofocus
                :preview="route.path !== '/search'"
                @submit="handleSearch"
                @navigate="closeMobileSearch"
              />
            </div>
          </div>
        </div>
      </transition>
    </ClientOnly>

    <!-- MAIN CONTENT -->
    <div class="flex dark:text-white dark:bg-old-neutral-900 flex-1 overflow-hidden">
      <!-- Desktop Playlist Sidebar -->
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
        />
      </ResizablePanel>

      <!-- Page Content (a fullscreen player view temporarily replaces it) -->
      <main class="flex-1 overflow-y-auto overflow-x-hidden">
        <ClientOnly>
          <LazyPlayerViews v-if="playerStore.getFullscreenView" :view="playerStore.getFullscreenView" mode="fullscreen" />
        </ClientOnly>
        <div v-show="!playerStore.getFullscreenView">
          <slot />
          <SiteFooter />
        </div>
      </main>

      <!-- Right Sidebar -->
      <ClientOnly>
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
            <LazyPlayerViews :view="playerStore.getSidebarView" mode="sidebar" />
          </aside>
        </ResizablePanel>
      </ClientOnly>
    </div>

    <!-- Mobile Playlist Drawer -->
    <ClientOnly>
      <transition name="slide-left">
        <div v-if="mobileSidebarOpen" class="fixed inset-0 z-40 md:hidden">
          <div class="absolute inset-0 bg-black/50" @click="closeMobileSidebar" />
          <aside
            class="absolute left-0 top-0 bottom-0 w-80 bg-old-neutral-900 text-white overflow-y-auto p-2"
            :class="{ 'no-transition': sidebarTouching }"
            :style="mobileSidebarAsideStyle"
            @touchstart.passive="onSidebarTouchStart"
            @touchmove.passive="onSidebarTouchMove"
            @touchend.passive="onSidebarTouchEnd"
          >
            <div class="flex items-center justify-between p-2">
              <div class="text-lg font-semibold text-[#4ade80]">Playlists</div>
              <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" class="text-white" aria-label="Close playlists" @click="closeMobileSidebar" />
            </div>
            <PlaylistSidebar :is-collapsed="false" />
          </aside>
        </div>
      </transition>
    </ClientOnly>

    <!-- PLAYER -->
    <ClientOnly>
      <div v-if="currentTrack" class="hidden md:block">
        <LazyMiniPlayer />
      </div>
      <LazyPlayerMobilePlayer v-if="currentTrack" class="md:hidden" />
    </ClientOnly>
  </div>
</template>

<style scoped>
nav a.router-link-active {
  color: #4ade80;
}

/* fade (used for search overlay) */
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* slide-in (mobile nav) */
.slide-in-enter-active, .slide-in-leave-active { transition: transform .25s ease; }
.slide-in-enter-from, .slide-in-leave-to { transform: translateX(-100%); }
.slide-in-enter-to, .slide-in-leave-from { transform: translateX(0); }

/* slide-left (playlist drawer) */
.slide-left-enter-active { transition: transform .25s ease; }
.slide-left-enter-from { transform: translateX(-100%); }
.slide-left-leave-to { transform: translateX(-100%); }

/* during manual dragging we disable transition to make it 'live' */
.no-transition {
  transition: none !important;
}
</style>
