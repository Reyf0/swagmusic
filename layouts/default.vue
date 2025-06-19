<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'
import FullPlayerModal from '@/components/FullPlayerModal.vue'

const user = useSupabaseUser();
const supabase = useSupabaseClient()
const router = useRouter()
const toast = useToast()


const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    toast.add({
      title: 'Ошибка при выходе',
      description: error.message,
      color: 'error',
    })
  } else {
    toast.add({
      title: 'Вы вышли из аккаунта',
      color: 'success',
    })
    await router.push('/login')
  }
}

const playerStore = usePlayerStore()
const { 
  currentTrack, 
  isPlaying, 
  currentTime, 
  duration, 
  volume, 
  isRepeat, 
  isShuffle 
} = storeToRefs(playerStore)

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

</script>

<template>
  <div>
    <UApp>
      <nav class="bg-gray-800 p-4">
        <div class="container mx-auto flex justify-between items-center">
          <UButton><NuxtLink to="/" class="text-white text-xl font-bold">SwagMusic</NuxtLink></UButton>
          <div class="flex space-x-4">
            <UButton><NuxtLink to="/" class="text-white hover:text-gray-300">Home</NuxtLink></UButton>
            <UButton><NuxtLink to="/tracks" class="text-white hover:text-gray-300">Tracks</NuxtLink></UButton>
            <template v-if="user">
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
      <div class="container mx-auto mt-4">
        <NuxtPage/>
      </div>
      <div v-if="currentTrack" class="fixed bottom-0 w-full bg-gray-900 text-white p-4 shadow-md">
        <div class="flex flex-col max-w-6xl mx-auto">
          <!-- Track info and controls -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-4">
              <img 
                :src="currentTrack.cover_url || 'https://via.placeholder.com/300x300?text=No+Cover'" 
                class="w-12 h-12 rounded object-cover" 
                alt="Track cover"
                @click="playerStore.openFullPlayer"
              />
              <div>
                <p class="font-semibold">{{ currentTrack.title }}</p>
                <p class="text-sm text-gray-400">
                  {{ currentTrack.track_authors?.map(a => a.author.name).join(', ') || 'Unknown Artist' }}
                </p>
              </div>
            </div>

            <!-- Main controls -->
            <div class="flex items-center space-x-4">
              <!-- Shuffle button -->
              <button 
                @click="playerStore.toggleShuffle()" 
                class="p-2 rounded-full hover:bg-gray-700 transition-colors"
                :class="{ 'text-green-500': isShuffle }"
                title="Shuffle"
              >
                <UIcon name="i-heroicons-arrow-path-rounded-square" class="w-5 h-5" />
              </button>

              <!-- Previous track -->
              <button 
                @click="playerStore.playPrevious()" 
                class="p-2 rounded-full hover:bg-gray-700 transition-colors"
                title="Previous"
              >
                <UIcon name="i-heroicons-backward" class="w-5 h-5" />
              </button>

              <!-- Play/Pause -->
              <button 
                @click="isPlaying ? playerStore.pause() : playerStore.resume()" 
                class="p-3 bg-white text-gray-900 rounded-full hover:bg-gray-200 transition-colors"
                title="Play/Pause"
              >
                <UIcon 
                  :name="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'" 
                  class="w-6 h-6" 
                />
              </button>

              <!-- Next track -->
              <button 
                @click="playerStore.playNext()" 
                class="p-2 rounded-full hover:bg-gray-700 transition-colors"
                title="Next"
              >
                <UIcon name="i-heroicons-forward" class="w-5 h-5" />
              </button>

              <!-- Repeat button -->
              <button 
                @click="playerStore.toggleRepeat()" 
                class="p-2 rounded-full hover:bg-gray-700 transition-colors"
                :class="{ 'text-green-500': isRepeat }"
                title="Repeat"
              >
                <UIcon name="i-heroicons-arrow-path" class="w-5 h-5" />
              </button>
            </div>

            <!-- Volume control -->
            <div class="flex items-center space-x-2">
              <UIcon 
                :name="volume > 0 ? 'i-heroicons-speaker-wave' : 'i-heroicons-speaker-x-mark'" 
                class="w-5 h-5" 
              />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                :value="volume" 
                @input="playerStore.setVolume($event.target.value)" 
                class="w-24"
              />
            </div>


          </div>



          <!-- Progress bar -->
          <div class="flex items-center space-x-2">
            <span class="text-xs w-10 text-right">{{ formatTime(currentTime) }}</span>
            <div class="relative flex-grow h-2 bg-gray-700 rounded cursor-pointer" @click="playerStore.seek($event.offsetX / $event.target.offsetWidth * duration)">
              <div 
                class="absolute top-0 left-0 h-full bg-green-500 rounded" 
                :style="{ width: `${duration > 0 ? (currentTime / duration * 100) : 0}%` }"
              ></div>
            </div>
            <span class="text-xs w-10">{{ formatTime(duration) }}</span>
          </div>
        </div>
        <button
            class="absolute right-4 bottom-4 p-1 rounded-full bg-gray-700 hover:bg-gray-600"
            title="Открыть плеер"
            @click="playerStore.openFullPlayer"
        >
          <UIcon name="i-heroicons-chevron-up" class="w-5 h-5 text-white" />
        </button>
      </div>
    </UApp>
    <FullPlayerModal v-if="playerStore.showFullPlayer" />
  </div>
</template>

<style scoped>
nav a.router-link-active {
  font-weight: bold;
  color: #4ade80;
}
</style>
