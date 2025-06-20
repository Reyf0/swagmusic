<script setup lang="ts">
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { ref, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale)

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const topTracks = ref([])
const recentTracks = ref([])
const dailyStats = ref([])

const fetchTopTracks = async () => {
  const { data, error } = await supabase
      .from('play_history')
      .select(`
      track_id,
      tracks (
        id,
        title,
        cover_url
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
        cover_url
      )
    `)
      .eq('user_id', user.value.id)
      .order('played_at', { ascending: false })
      .limit(10)

  recentTracks.value = data || []
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
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
            v-for="track in topTracks"
            :key="track.id"
            class="bg-gray-100 rounded shadow p-3 hover:shadow-md transition"
        >
          <img :src="track.cover_url" class="w-full h-40 object-cover rounded mb-2" />
          <p class="font-semibold">{{ track.title }}</p>
          <p class="text-sm text-gray-500">Plays: {{ track.count }}</p>
        </div>
      </div>
    </section>

    <!-- Recent Listens -->
    <section>
      <h2 class="text-2xl font-bold mb-4">🎧 Recently Listened</h2>
      <ul class="space-y-3">
        <li
            v-for="track in recentTracks"
            :key="track.tracks.id + track.played_at"
            class="flex items-center space-x-4"
        >
          <img :src="track.tracks.cover_url" class="w-12 h-12 object-cover rounded" />
          <div>
            <p class="font-semibold">{{ track.tracks.title }}</p>
            <p class="text-sm text-gray-400">{{ new Date(track.played_at).toLocaleString() }}</p>
          </div>
        </li>
      </ul>
    </section>


  </div>
</template>
