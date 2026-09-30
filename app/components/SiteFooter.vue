<script setup lang="ts">
// Small footer under the page content: feedback, legal pages and the cookie choice.
const route = useRoute()
const cookieSettingsOpen = useCookieSettingsOpen()
const feedbackLink = computed(() => `/feedback?from=${encodeURIComponent(route.fullPath)}`)
</script>

<template>
  <footer class="px-4 md:px-6 py-6 mt-6 border-t border-old-neutral-200 dark:border-old-neutral-800 text-xs text-old-neutral-500">
    <nav aria-label="Site" class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span>© {{ new Date().getFullYear() }} SwagMusic</span>
      <NuxtLink :to="feedbackLink" class="hover:text-old-neutral-800 dark:hover:text-white hover:underline">Feedback</NuxtLink>
      <NuxtLink to="/privacy" class="hover:text-old-neutral-800 dark:hover:text-white hover:underline">Privacy</NuxtLink>
      <NuxtLink to="/terms" class="hover:text-old-neutral-800 dark:hover:text-white hover:underline">Terms</NuxtLink>
      <button type="button" class="hover:text-old-neutral-800 dark:hover:text-white hover:underline" @click="cookieSettingsOpen = true">Cookie settings</button>
    </nav>
  </footer>
</template>
