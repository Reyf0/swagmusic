<script setup lang="ts">
// Heart toggle backed by the likes store (optimistic, rolls back on error).
const props = withDefaults(defineProps<{
  trackId: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const likesStore = useLikesStore()
const liked = computed(() => likesStore.isLiked(props.trackId))

const iconSize = computed(() => ({ sm: 'size-4', md: 'size-5', lg: 'size-6' }[props.size]))
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
    :aria-pressed="liked"
    :aria-label="liked ? 'Remove from liked tracks' : 'Add to liked tracks'"
    :title="liked ? 'Unlike' : 'Like'"
    @click.stop="likesStore.toggleLike({ id: trackId, type: 'track' })"
  >
    <UIcon
      :name="liked ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
      :class="[iconSize, liked ? 'text-red-500' : 'text-old-neutral-500 dark:text-old-neutral-300']"
    />
  </button>
</template>
