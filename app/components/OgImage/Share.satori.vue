<script setup lang="ts">
// Link preview image (1200×600) for albums, playlists, artists and the site itself.
// Rendered by nuxt-og-image with Satori: only flexbox layout and a subset of CSS.
const props = withDefaults(defineProps<{
  /** Small label above the title, e.g. "Album". Without it the site card is rendered. */
  kind?: string
  title?: string
  /** Second line: artist / owner (or the tagline on the site card). */
  subtitle?: string
  /** Third line, e.g. "12 tracks". */
  meta?: string
  /** Absolute URL of the cover / avatar. */
  image?: string
  /** Round image (artists). */
  round?: boolean
}>(), {
  kind: undefined,
  title: 'SwagMusic',
  subtitle: undefined,
  meta: undefined,
  image: undefined,
})

const initial = computed(() => (props.title.trim()[0] ?? 'S').toUpperCase())
</script>

<template>
  <!-- Site card: brand + tagline -->
  <div
    v-if="!kind"
    class="w-full h-full flex flex-col justify-center bg-[#121212] text-white px-[96px]"
    style="font-family: 'Inter'"
  >
    <span class="text-[112px] font-bold text-[#4ade80] leading-none">{{ title }}</span>
    <span v-if="subtitle" class="text-[44px] text-[#d4d4d4] mt-[32px] leading-[1.3] max-w-[900px]">{{ subtitle }}</span>
  </div>

  <!-- Album / playlist / artist card -->
  <div
    v-else
    class="w-full h-full flex items-center bg-[#121212] text-white px-[72px]"
    style="font-family: 'Inter'"
  >
    <div
      class="flex shrink-0 w-[400px] h-[400px] items-center justify-center overflow-hidden bg-[#262626]"
      :class="round ? 'rounded-full' : 'rounded-[20px]'"
    >
      <img v-if="image" :src="image" width="400" height="400" class="w-[400px] h-[400px] object-cover">
      <span v-else class="text-[160px] font-bold text-[#4ade80]">{{ initial }}</span>
    </div>

    <div class="flex flex-col flex-1 ml-[64px] min-w-0">
      <span class="text-[26px] font-bold uppercase tracking-[4px] text-[#a3a3a3]">{{ kind }}</span>
      <span class="text-[72px] font-bold leading-[1.1] mt-[12px]" style="display: block; line-clamp: 2; text-overflow: ellipsis;">{{ title }}</span>
      <span v-if="subtitle" class="text-[36px] text-[#d4d4d4] mt-[20px]" style="display: block; line-clamp: 1; text-overflow: ellipsis;">{{ subtitle }}</span>
      <span v-if="meta" class="text-[28px] text-[#a3a3a3] mt-[12px]">{{ meta }}</span>
    </div>

    <span class="absolute right-[48px] bottom-[36px] text-[32px] font-bold text-[#4ade80]">SwagMusic</span>
  </div>
</template>
