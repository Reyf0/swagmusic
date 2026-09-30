<script setup lang="ts">
const user = useSupabaseUser()
const tracksStore = useTracksStore()
const { feedItems, feedLoading, popularItems, popularLoading, recentItems, recentLoading, error } = storeToRefs(tracksStore)

// Recently played contains repeats of the same track; show each once.
const recentUnique = computed(() => {
  const seen = new Set<string>()
  return recentItems.value.filter(t => !seen.has(t.id) && seen.add(t.id))
})

// Loaded during the server render, so the first paint already has the tracks and their covers
// (the store state is sent to the browser with the page). On client-side navigation the page
// opens at once with placeholders instead of waiting.
const { status, refresh } = useAsyncData('home-tracks', async () => {
  await Promise.all([
    tracksStore.loadFeed(true),
    tracksStore.loadPopular(10),
    user.value ? tracksStore.loadRecent({ userId: user.value.id }) : null,
  ])
  return true
}, { lazy: true })
const pending = computed(() => status.value === 'idle' || status.value === 'pending')

watch(() => user.value?.id, (id) => {
  if (id) tracksStore.loadRecent({ userId: id })
  else tracksStore.clearRecent()
})

onUnmounted(() => tracksStore.cancelFeed())

// The home tab shows just the site name, without the ' | SwagMusic' suffix.
useHead({ titleTemplate: '%s' })
useSeoMeta({
  title: 'SwagMusic',
  description: 'Listen to new tracks, upload your own music and build playlists.',
})
defineOgImage('Share', { subtitle: 'Listen to new tracks, upload your own music and build playlists.' })
</script>

<template>
  <div class="py-6 space-y-10">
    <div class="px-6">
      <h1 class="text-3xl font-bold mb-2">Welcome to SwagMusic</h1>
      <p class="text-old-neutral-500 dark:text-old-neutral-400">Discover new tracks, upload your own music and build playlists.</p>
    </div>

    <UAlert
      v-if="error"
      class="mx-6"
      color="error"
      variant="soft"
      title="Could not load tracks"
      :description="error"
      :actions="[{ label: 'Retry', onClick: () => refresh() }]"
    />

    <section class="pl-6">
      <h2 class="text-2xl font-bold mb-4">Popular</h2>
      <div v-if="(pending || popularLoading) && !popularItems.length" class="flex gap-4 overflow-hidden">
        <UiSkeletonTrackCard v-for="i in 5" :key="i" />
      </div>
      <p v-else-if="!popularItems.length" class="text-old-neutral-500">Nothing has been played yet.</p>
      <UiCarousel v-else :tracks="popularItems" priority />
    </section>

    <section class="pl-6">
      <h2 class="text-2xl font-bold mb-4">New releases</h2>
      <div v-if="(pending || feedLoading) && !feedItems.length" class="flex gap-4 overflow-hidden">
        <UiSkeletonTrackCard v-for="i in 5" :key="i" />
      </div>
      <p v-else-if="!feedItems.length" class="text-old-neutral-500">
        No tracks yet. <NuxtLink to="/upload" class="text-green-500 hover:underline">Upload the first one</NuxtLink>.
      </p>
      <UiCarousel v-else :tracks="feedItems" />
    </section>

    <section v-if="user" class="pl-6">
      <h2 class="text-2xl font-bold mb-4">Recently played</h2>
      <div v-if="(pending || recentLoading) && !recentItems.length" class="flex gap-4 overflow-hidden">
        <UiSkeletonTrackCard v-for="i in 5" :key="i" />
      </div>
      <p v-else-if="!recentUnique.length" class="text-old-neutral-500">Tracks you play will show up here.</p>
      <UiCarousel v-else :tracks="recentUnique" />
    </section>
  </div>
</template>
