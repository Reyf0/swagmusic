<script setup lang="ts">
// Top of a track / album / playlist / artist page: cover, what it is, title, description and a line of
// details separated by dots. The `lead` slot is the first item of that line (e.g. the artist).
export type MediaHeaderDetail = string | { text: string; to: string; external?: boolean }

const props = withDefaults(defineProps<{
  /** "Track", "Album", "Playlist", "Artist". */
  label: string
  title: string
  description?: string | null
  cover?: string | null
  coverAlt?: string
  /** Placeholder icon when there is no cover. */
  icon?: string
  /** Round cover (artist photo). */
  round?: boolean
  /** Falsy items are skipped, so callers can write `cond && 'text'`. */
  details?: (MediaHeaderDetail | false | null | undefined | 0 | '')[]
}>(), {
  description: null,
  cover: null,
  coverAlt: '',
  icon: 'i-heroicons-musical-note',
  round: false,
  details: () => [],
})

// `default`: an extra line under the details (e.g. a license credit).
const slots = defineSlots<{ lead?: () => unknown; default?: () => unknown }>()
const items = computed(() => props.details.filter((d): d is MediaHeaderDetail => !!d))
</script>

<template>
  <header class="flex flex-col md:flex-row items-center md:items-end gap-6 mb-6">
    <CoverImage
      :src="cover"
      :size="320"
      :alt="coverAlt"
      :icon="icon"
      icon-class="size-16"
      priority
      class="size-48 md:size-56 shrink-0 object-cover shadow-lg"
      :class="round ? 'rounded-full' : 'rounded-md'"
    />
    <div class="min-w-0 w-full text-center md:text-left">
      <div class="text-xs uppercase font-semibold text-old-neutral-500 mb-1">{{ label }}</div>
      <h1 class="text-3xl md:text-5xl font-bold mb-2 break-words">{{ title }}</h1>
      <p v-if="description" class="text-old-neutral-500 mb-2">{{ description }}</p>
      <div v-if="slots.lead || items.length" class="text-sm text-old-neutral-500 flex flex-wrap items-center justify-center md:justify-start gap-x-1.5 gap-y-1">
        <span v-if="slots.lead" class="font-semibold text-old-neutral-800 dark:text-old-neutral-200"><slot name="lead" /></span>
        <template v-for="(item, i) in items" :key="i">
          <span v-if="slots.lead || i > 0" aria-hidden="true">·</span>
          <span v-if="typeof item === 'string'">{{ item }}</span>
          <a v-else-if="item.external" :href="item.to" target="_blank" rel="noopener noreferrer nofollow" class="hover:underline">{{ item.text }}</a>
          <NuxtLink v-else :to="item.to" class="hover:underline">{{ item.text }}</NuxtLink>
        </template>
      </div>
      <slot />
    </div>
  </header>
</template>
