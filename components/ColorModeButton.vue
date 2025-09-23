<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const store = useSettingsStore()
const colorMode = useColorMode()

const isDark = computed<boolean>({
  get() {
    // unwraps fine in template
    try {
      // поддерживаем разные API
      // @ts-ignore
      return colorMode?.value === 'dark' || colorMode?.preference === 'dark'
    } catch {
      return false
    }
  },
  set(v: boolean) {
    const newVal = v ? 'dark' : 'light'
    try {
      // безопасно пробуем записать
      // @ts-ignore
      if (colorMode && 'preference' in colorMode) {
        // some implementations (nuxt modules) expose .preference
        // @ts-ignore
        colorMode.preference = newVal
        // @ts-ignore
      } else if (colorMode && 'value' in colorMode) {
        // common composable: colorMode.value
        // @ts-ignore
        colorMode.value = newVal
      } else if (typeof colorMode === 'function') {
        // fallback if composable is a function
        // @ts-ignore
        colorMode(newVal)
      } else {
        // last-resort fallback to data-theme attribute
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', newVal)
        }
      }
    } catch (e) {
      // fallback if anything throws
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', newVal)
      }
    } finally {
      // пометить, что тема изменена локально — чтобы плагин не перезаписывал её
      store.markLocalThemeDirty()
    }
  }
})
</script>

<template>
  <ClientOnly v-if="!colorMode?.forced">
    <UButton
        :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
        color="neutral"
        variant="ghost"
        @click="isDark = !isDark"
    />

    <template #fallback>
      <div class="size-8" />
    </template>
  </ClientOnly>
</template>
