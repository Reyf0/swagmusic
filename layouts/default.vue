<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { useSearchStore } from '@/stores/searchStore'
import { storeToRefs } from 'pinia'
import MiniPlayer from '@/components/MiniPlayer.vue'
import PlayerViews from '@/components/player/PlayerViews.vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const router = useRouter()
const toast = useToast()

const profile = ref(null)
const loading = ref(true)
const error = ref(null)

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
          <!-- Sidebar (navigation) -->
          <aside class="w-60 bg-black text-white shrink-0">
            Sidebar
          </aside>

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
          <aside
              v-if="playerStore.getSidebarView"
              class="w-[360px] shrink-0 border-l border-neutral-700 bg-neutral-800 text-white overflow-y-auto"
          >
            <PlayerViews
                :view="playerStore.getSidebarView!"
                mode="sidebar"
            />
          </aside>


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
