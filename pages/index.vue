<script setup lang="ts">
import { ref, onMounted } from 'vue'
import UiCarousel from "@/components/UiCarousel.vue";
import type { TrackUI } from "@/types";

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const tracksStore = useTracksStore()
const { feedItems, recentItems } = storeToRefs(tracksStore)

const isLoadingTopTracks = ref(true)
const errorLoadingTopTracks = ref(false)
const isLoadingRecentTracks = ref(true)
const errorLoadingRecentTracks = ref(false)


const fetchTopTracks = async () => {
  isLoadingTopTracks.value = true
  errorLoadingTopTracks.value = false

  try {
    await tracksStore.loadFeed(true)
  } catch (error) {
    errorLoadingTopTracks.value = true
    console.error('Error fetching top tracks:', error)
  } finally {
    isLoadingTopTracks.value = false
  }
}

const fetchRecentPlays = async () => {
  isLoadingRecentTracks.value = true
  errorLoadingRecentTracks.value = false
  try {
    await tracksStore.loadRecent({ userId: user.value.id })
    if (tracksStore.error) throw tracksStore.error
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

onUnmounted(() => {
  tracksStore.cancelFeed()
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
      <UiCarousel v-else :tracks="feedItems" />
    </section>

    <!-- Recent Listens -->
    <section v-if="user?.value?.id">
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
      <UiCarousel v-else :tracks="recentItems" />
    </section>
  </div>
</template>
