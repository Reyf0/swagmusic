<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { ref, onMounted } from 'vue'
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale
} from 'chart.js'
import {storeToRefs} from "pinia";

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale)

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const topTracks = ref([])
const recentTracks = ref([])
const dailyStats = ref([])
const playerStore = usePlayerStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)
const { playTrack, isCurrentTrack } = usePlayTrack()


const fetchTopTracks = async () => {
  const { data, error } = await supabase
      .from('play_history')
      .select(`
      track_id,
      tracks (
        *,
        track_authors(
          *,
          author:authors(*)
        )
      )
    `)
      .order('played_at', { ascending: false })
      .limit(1000)

  if (!data) return

  // Подсчет вручную на клиенте (если нет группировки в SQL)
  const countMap = new Map()
  data.forEach(item => {
    const id = item.tracks.id
    if (!countMap.has(id)) {
      countMap.set(id, { ...item.tracks, count: 1 })
    } else {
      countMap.get(id).count++
    }
  })

  topTracks.value = [...countMap.values()].sort((a, b) => b.count - a.count).slice(0, 10)
}

const fetchRecentPlays = async () => {
  const { data } = await supabase
      .from('play_history')
      .select(`
      played_at,
      tracks (
        id,
        title,
        audio_url,
        cover_url
      )
    `)
      .eq('user_id', user.value.id)
      .order('played_at', { ascending: false })
      .limit(10)

  console.log("Recent Plays Data:", data)
  recentTracks.value = data || []
}

const scrollCarousel = (refName: string, direction: 'left' | 'right') => {
  const container = document.querySelector(refName) as HTMLElement
  if (container) {
    const scrollAmount = direction === 'left' ? -300 : 300
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }
}

onMounted(() => {
  fetchTopTracks()
  fetchRecentPlays()
})
</script>

<template>
  <div class="p-6 space-y-12">

    <div class="p-6">
      <h1 class="text-3xl font-bold mb-6">Welcome to SwagMusic</h1>
      <p class="mb-4">Your ultimate music streaming platform.</p>
      <p class="mb-4">Discover new tracks, upload your own music, and connect with other music lovers.</p>
    </div>
    <!-- Top Tracks -->
    <section>
      <h2 class="text-2xl font-bold mb-4">🔥 Top 10 Tracks</h2>
      <div class="relative carousel-container">
        <button
            class="carousel-button left-0"
            @click="scrollCarousel('.top-tracks-carousel', 'left')"
        >
          <UIcon name="i-heroicons-chevron-left" class="w-6 h-6" />
        </button>
        <div class="flex gap-4 overflow-x-scroll scrollbar-hide top-tracks-carousel">
          <div
              v-for="track in topTracks"
              :key="track.id"
              class="flex-shrink-0 w-48 flex flex-col bg-gray-100 rounded shadow p-3 hover:shadow-md transition track-card"
          >
            <div class="relative flex justify-center items-center grow overflow-hidden rounded-md shadow-md mb-3">
              <UIcon v-if="!track.cover_url" name="i-heroicons-musical-note" class="icon text-gray-400" />
              <img
                  v-else
                  :src="track.cover_url || 'https://via.placeholder.com/300x300?text=No+Cover'"
                  alt="cover"
                  class="w-full object-cover rounded"
              />
              <div class="absolute inset-0 hover:bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                <button
                    class="play-button opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
                    @click="playTrack(track, topTracks)"
                >
                  <UIcon :name="isCurrentTrack(track) && isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
                         class="w-6 h-6" />
                </button>
              </div>
            </div>
            <div class="track-label">
              <p class="font-semibold">{{ track.title }}</p>
              <span v-if="track.track_authors && track.track_authors.length">
            <span v-for="(rel, index) in track.track_authors" :key="rel.author.id" class="text-sm text-gray-500">
              {{ rel.author.name }}<span v-if="index < track.track_authors.length - 1">, </span>
            </span>
          </span>
              <p class="text-sm text-gray-500">Plays: {{ track.count }}</p>
            </div>
          </div>
        </div>
        <button
            class="carousel-button right-0"
            @click="scrollCarousel('.top-tracks-carousel', 'right')"
        >
          <UIcon name="i-heroicons-chevron-right" class="w-6 h-6" />
        </button>
      </div>
    </section>

    <!-- Recent Listens -->
    <section>
      <h2 class="text-2xl font-bold mb-4">🎧 Recently Listened</h2>
      <div class="relative carousel-container">
        <button
            class="carousel-button left-0"
            @click="scrollCarousel('.recent-tracks-carousel', 'left')"
        >
          <UIcon name="i-heroicons-chevron-left" class="w-6 h-6" />
        </button>
        <div class="flex gap-4 overflow-x-scroll scrollbar-hide recent-tracks-carousel">
          <div
              v-for="track in recentTracks"
              :key="track.tracks.id + track.played_at"
              class="flex-shrink-0 w-48 flex flex-col bg-gray-100 rounded shadow p-3 hover:shadow-md transition group track-card"
          >
            <div class="relative flex justify-center items-center grow overflow-hidden rounded-md shadow-md mb-3 group">
              <UIcon v-if="!track.tracks.cover_url" name="i-heroicons-musical-note" class="icon text-gray-400" />
              <img
                  v-else
                  :src="track.tracks.cover_url || '  https://via.placeholder.com/300x300?text=No+Cover'"
                  alt="cover"
                  class="w-full object-cover rounded"
              />
              <div class="absolute inset-0 hover:bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                <button
                    class="play-button opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
                    @click="playTrack(track.tracks, recentTracks.map(t => t.tracks))"
                >
                  <UIcon :name="isCurrentTrack(track.tracks) && isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
                         class="w-6 h-6" />
                </button>
              </div>
            </div>
            <div>
              <p class="font-semibold">{{ track.tracks.title }}</p>
              <p class="text-sm text-gray-400">{{ new Date(track.played_at).toLocaleString() }}</p>
            </div>
          </div>
        </div>
        <button
            class="carousel-button right-0"
            @click="scrollCarousel('.recent-tracks-carousel', 'right')"
        >
          <UIcon name="i-heroicons-chevron-right" class="w-6 h-6" />
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
@import "tailwindcss";

.icon {
  @apply w-5 h-5 text-gray-400;
}

.scrollbar-hide {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none; /* Chrome, Safari, and Opera */
}


.group:hover > .carousel-button {
  opacity: 1;
}

.carousel-button {
  @apply bg-gray-200 hover:bg-gray-300 rounded-full shadow flex items-center justify-center opacity-0 transition-opacity duration-300;
  width: 40px;
  height: 40px;
  z-index: 10;
}

.carousel-button.left-0 {
  left: -20px;
}

.carousel-button.right-0 {
  right: -20px;
}

.track-card .play-button {
  @apply absolute bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100;
}

.track-card:hover .play-button {
  opacity: 1;
}

.carousel-container {
  position: relative;
  padding: 0 40px; /* чтобы кнопки не перекрывали контент */
}

.carousel-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.3s;
}

.carousel-button.left-0 {
  left: 0;
}
.carousel-button.right-0 {
  right: 0;
}

.carousel-container:hover .carousel-button {
  opacity: 1;
}



</style>
  