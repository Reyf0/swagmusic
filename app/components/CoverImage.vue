<script setup lang="ts">
// A cover or avatar from storage, resized and re-encoded (WebP / AVIF) by the image optimizer
// instead of downloading the original upload. `size` is the rendered size in CSS pixels and must be
// one of the widths in `image.screens` (nuxt.config.ts); 2x is served for high-density screens.
// Without a `src` it shows a placeholder with `icon`. Size / shape classes go on the component.
const props = withDefaults(defineProps<{
  src?: string | null
  size: CoverSize
  alt?: string
  /** Placeholder icon when there is no image. */
  icon?: string
  /** Placeholder icon size; by default it follows `size`. */
  iconClass?: string
  /** Placeholder background; panels that are always dark (sidebar, player) pass their own. */
  placeholderClass?: string
  /** Above-the-fold image that is likely the LCP element: load it first, not lazily. */
  priority?: boolean
}>(), {
  src: null,
  alt: '',
  icon: 'i-heroicons-musical-note',
  iconClass: undefined,
  placeholderClass: 'bg-old-neutral-200 dark:bg-old-neutral-800',
  priority: false,
})

const ICON_SIZES: Record<CoverSize, string> = { 48: 'size-5', 160: 'size-10', 320: 'size-12', 640: 'size-16' }
</script>

<template>
  <NuxtImg
    v-if="src"
    :src="src"
    :alt="alt"
    :width="size"
    :height="size"
    densities="x1 x2"
    quality="75"
    format="webp"
    fit="cover"
    :loading="priority ? 'eager' : 'lazy'"
    :fetchpriority="priority ? 'high' : 'auto'"
    :preload="priority ? { fetchPriority: 'high' } : false"
    decoding="async"
  />
  <div
    v-else
    class="flex items-center justify-center"
    :class="placeholderClass"
    :role="alt ? 'img' : undefined"
    :aria-label="alt || undefined"
    :aria-hidden="alt ? undefined : 'true'"
  >
    <UIcon :name="icon" class="text-old-neutral-400" :class="props.iconClass ?? ICON_SIZES[size]" />
  </div>
</template>
