<script setup lang="ts">
// Results for ?q=… (the search box lives in the layout header).
const route = useRoute()
const tracksStore = useTracksStore()
const likesStore = useLikesStore()
const { items, loading, hasMore, error, searched } = storeToRefs(tracksStore)

const query = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))

watch(query, async (q) => {
  tracksStore.q = q
  if (!q) {
    tracksStore.clearSearch()
    return
  }
  await tracksStore.runSearch(true)
  likesStore.fetchLikes(items.value.map(t => t.id))
}, { immediate: true })

async function loadMore() {
  await tracksStore.loadMore()
  likesStore.fetchLikes(items.value.map(t => t.id))
}

// Mobile has no header search box, so offer one on the page.
const localText = ref(query.value)
watch(query, (q) => { localText.value = q })
function submitLocal() {
  navigateTo({ path: '/search', query: localText.value.trim() ? { q: localText.value.trim() } : {} })
}

useSeoMeta({ title: () => (query.value ? `“${query.value}” · Search · SwagMusic` : 'Search · SwagMusic') })
</script>

<template>
  <div class="p-4 md:p-6">
    <form class="md:hidden mb-4" role="search" @submit.prevent="submitLocal">
      <UInput v-model="localText" icon="i-heroicons-magnifying-glass" placeholder="Search by title or artist" size="lg" class="w-full" />
    </form>

    <h1 class="text-2xl font-bold mb-4">
      <template v-if="query">Results for “{{ query }}”</template>
      <template v-else>Search</template>
    </h1>

    <p v-if="!query" class="text-old-neutral-500">Type a track title or artist name in the search box.</p>

    <template v-else>
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        title="Search failed"
        :description="error"
        :actions="[{ label: 'Try again', onClick: () => tracksStore.runSearch(true) }]"
        class="mb-4"
      />

      <div v-if="loading && !items.length" class="flex justify-center py-10">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-old-neutral-400" />
      </div>

      <p v-else-if="searched && !items.length && !error" class="text-center py-10 text-old-neutral-500">
        Nothing found for “{{ query }}”. Try another spelling or fewer words.
      </p>

      <template v-else>
        <TrackList :tracks="items" />
        <div v-if="hasMore" class="flex justify-center mt-6">
          <UButton :loading="loading" variant="soft" color="neutral" @click="loadMore">Show more</UButton>
        </div>
      </template>
    </template>
  </div>
</template>
