<script setup lang="ts">
const tracksStore = useTracksStore()
const likesStore = useLikesStore()
const { feedItems, feedLoading, feedHasMore, error } = storeToRefs(tracksStore)

const view = ref<'grid' | 'list'>('grid')

async function load(initial: boolean) {
  await tracksStore.loadFeed(initial)
  likesStore.fetchLikes(feedItems.value.map(t => t.id))
}

onMounted(() => load(true))

useSeoMeta({ title: 'All tracks · SwagMusic' })
</script>

<template>
  <div class="p-4 md:p-6">
    <div class="flex items-center justify-between mb-4 gap-4">
      <h1 class="text-2xl font-bold">All Tracks</h1>
      <div class="flex gap-1">
        <UButton icon="i-heroicons-squares-2x2" :variant="view === 'grid' ? 'solid' : 'ghost'" color="neutral" aria-label="Grid view" @click="view = 'grid'" />
        <UButton icon="i-heroicons-list-bullet" :variant="view === 'list' ? 'solid' : 'ghost'" color="neutral" aria-label="List view" @click="view = 'list'" />
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Failed to load tracks"
      :description="error"
      :actions="[{ label: 'Try again', onClick: () => load(true) }]"
      class="mb-4"
    />

    <div v-if="feedLoading && !feedItems.length" class="flex justify-center items-center py-10">
      <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-old-neutral-400" />
    </div>

    <p v-else-if="!feedItems.length && !error" class="text-center py-10 text-old-neutral-500">
      No tracks yet. <NuxtLink to="/upload" class="text-green-500 hover:underline">Upload one</NuxtLink>.
    </p>

    <template v-else>
      <div v-if="view === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        <TrackCard v-for="track in feedItems" :key="track.id" :track="track" :tracks="feedItems" variant="grid" />
      </div>
      <TrackList v-else :tracks="feedItems" />

      <div v-if="feedHasMore" class="flex justify-center mt-6">
        <UButton :loading="feedLoading" variant="soft" color="neutral" @click="load(false)">Load more</UButton>
      </div>
    </template>
  </div>
</template>
