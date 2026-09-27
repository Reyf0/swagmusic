<script setup lang="ts">
defineProps<{
  mode?: 'sidebar' | 'fullscreen'
}>()

const supabase = useSupabase()
const player = usePlayerStore()
const { currentTrack } = storeToRefs(player)

const lyrics = ref<string | null>(null)
const loading = ref(false)
const cache = new Map<string, string | null>()

// Lyrics are not part of list queries, so load them lazily for the current track.
watch(() => currentTrack.value?.id, async (id) => {
  lyrics.value = null
  if (!id) return
  if (currentTrack.value?.lyrics !== undefined) {
    lyrics.value = currentTrack.value.lyrics ?? null
    return
  }
  if (cache.has(id)) {
    lyrics.value = cache.get(id) ?? null
    return
  }

  loading.value = true
  const { data, error } = await supabase.from('tracks').select('lyrics').eq('id', id).maybeSingle()
  loading.value = false
  if (error) {
    console.warn('Could not load lyrics', error.message)
    return
  }
  const text = (data as { lyrics?: string | null } | null)?.lyrics ?? null
  cache.set(id, text)
  if (currentTrack.value?.id === id) lyrics.value = text
}, { immediate: true })
</script>

<template>
  <div class="w-full h-full flex flex-col p-4 md:p-6" :class="mode === 'fullscreen' ? 'bg-old-neutral-900 text-white' : ''">
    <div class="flex justify-between items-center mb-4">
      <div class="min-w-0">
        <h2 class="text-xl font-semibold">Lyrics</h2>
        <p v-if="currentTrack" class="text-sm text-old-neutral-400 truncate">{{ currentTrack.title }} · {{ artistNames(currentTrack) }}</p>
      </div>
      <UButton
        icon="i-heroicons-x-mark"
        size="sm"
        variant="ghost"
        color="neutral"
        class="hidden md:inline-flex"
        aria-label="Close lyrics"
        @click="player.closeView('lyrics')"
      />
    </div>

    <div class="flex-grow overflow-y-auto">
      <div v-if="loading" class="flex justify-center py-10">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      </div>
      <p v-else-if="lyrics" class="whitespace-pre-line leading-relaxed text-lg md:text-2xl font-semibold text-center">{{ lyrics }}</p>
      <p v-else class="text-center text-old-neutral-400 py-10">No lyrics have been added for this track yet.</p>
    </div>
  </div>
</template>
