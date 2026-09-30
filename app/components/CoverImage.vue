<script setup lang="ts">
// A cover or avatar from storage, resized and re-encoded (WebP / AVIF) by the image optimizer
// instead of downloading the original upload. `size` is the rendered size in CSS pixels and must be
// one of the widths in `image.screens` (nuxt.config.ts); 2x is served for high-density screens.
withDefaults(defineProps<{
  src: string
  size: CoverSize
  alt?: string
  /** Above-the-fold image that is likely the LCP element: load it first, not lazily. */
  priority?: boolean
}>(), {
  alt: '',
  priority: false,
})
</script>

<template>
  <NuxtImg
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
</template>
