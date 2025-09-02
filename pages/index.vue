<script setup lang="ts">
import { ref, onMounted } from 'vue'
import UiCarousel from "@/components/UiCarousel.vue";
import type { Track } from "@/types/global";

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const topTracks = ref<Track[]>([])
const recentTracks = ref<Track[]>([])

const isLoadingTopTracks = ref(true)
const errorLoadingTopTracks = ref(false)
const isLoadingRecentTracks = ref(true)
const errorLoadingRecentTracks = ref(false)

// TODO Try useAsyncData
const fetchTopTracks = async () => {
  isLoadingTopTracks.value = true
  errorLoadingTopTracks.value = false

  try {
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
    if (error) console.error(error)
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
  } catch (error) {
    errorLoadingTopTracks.value = true
    console.error('Error fetching top tracks:', error)
  } finally {
    isLoadingTopTracks.value = false
  }
}
// TODO Try useAsyncData
// TODO Fix this function. Tracks should be mapped
const fetchRecentPlays = async () => {
  isLoadingRecentTracks.value = true
  errorLoadingRecentTracks.value = false

  try {
    const { data, error } = await supabase
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
    if (error) console.error(error);

    recentTracks.value = data?.map(item => ({ ...item.tracks })) || []
  }
  catch (e) {
    errorLoadingRecentTracks.value = true
    console.error('Error fetching recent plays:', e)
  } finally {
    isLoadingRecentTracks.value = false
  }
}


onMounted(() => {
  fetchTopTracks().catch(console.error)
  fetchRecentPlays().catch(console.error)
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
      <div v-if="isLoadingTopTracks">
        <div class="flex gap-4 overflow-x-scroll scrollbar-hide">
          <div
              v-for="i in 5"
              :key="i"
          >
            <UiSkeletonTrackCard />
          </div>
        </div>
      </div>
      <div v-else-if="errorLoadingTopTracks">Error</div>
      <UiCarousel v-else :tracks="topTracks" />
    </section>

    <!-- Recent Listens -->
    <section>
      <h2 class="text-2xl font-bold mb-4 ">🎧 Recently Listened</h2>
      <div v-if="isLoadingRecentTracks">
        <div class="flex gap-4 overflow-x-scroll scrollbar-hide">
          <div
              v-for="i in 5"
              :key="i"
          >
            <UiSkeletonTrackCard />
          </div>
        </div>
      </div>
      <div v-else-if="errorLoadingRecentTracks">Error</div>
      <UiCarousel v-else :tracks="recentTracks" />
    </section>
  </div>
</template>