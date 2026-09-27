<script setup lang="ts">
const colorMode = useColorMode()
const settingsStore = useSettingsStore()

const isDark = computed(() => colorMode.value === 'dark')

function toggle() {
  settingsStore.setTheme(isDark.value ? 'light' : 'dark')
}
</script>

<template>
  <ClientOnly v-if="!colorMode?.forced">
    <UButton
      :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
      color="neutral"
      variant="ghost"
      :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="toggle"
    />
    <template #fallback>
      <div class="size-8" />
    </template>
  </ClientOnly>
</template>
