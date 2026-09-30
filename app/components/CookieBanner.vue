<script setup lang="ts">
// Cookie notice: shown until the visitor chooses, and again from "Cookie settings".
// Both choices are equally easy; declining only turns off anonymous visit statistics.
const consent = useCookieConsent()
const settingsOpen = useCookieSettingsOpen()
const { currentTrack } = storeToRefs(usePlayerStore())

function choose(analytics: boolean) {
  consent.value = storeConsent(analytics)
  settingsOpen.value = false
}
</script>

<template>
  <section
    role="region"
    aria-label="Cookie settings"
    class="fixed z-50 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-md rounded-xl border border-old-neutral-200 dark:border-old-neutral-800 bg-white dark:bg-old-neutral-900 text-old-neutral-900 dark:text-white shadow-2xl p-4"
    :class="currentTrack ? 'bottom-24' : 'bottom-3 sm:bottom-4'"
  >
    <div class="flex items-start gap-3">
      <UIcon name="i-lucide-cookie" class="size-6 shrink-0 text-green-500 mt-0.5" />
      <div class="min-w-0 space-y-2 text-sm">
        <h2 class="font-semibold text-base">Cookies and privacy</h2>
        <p class="text-old-neutral-600 dark:text-old-neutral-300">
          We use cookies that keep you signed in and store your settings (theme, volume, recent searches) in your browser.
          These are needed for the site to work.
        </p>
        <p class="text-old-neutral-600 dark:text-old-neutral-300">
          With your permission we also count visits anonymously (Vercel Web Analytics: no cookies, no advertising, no tracking across sites).
        </p>
        <p>
          <NuxtLink to="/privacy" class="text-green-600 dark:text-green-400 hover:underline">Privacy policy</NuxtLink>
          <template v-if="consent">
            <span class="text-old-neutral-500"> · Statistics are now {{ consent.analytics ? 'allowed' : 'off' }}.</span>
          </template>
        </p>
      </div>
      <UButton
        v-if="settingsOpen"
        icon="i-heroicons-x-mark"
        variant="ghost"
        color="neutral"
        size="sm"
        aria-label="Close"
        class="-mt-1 -mr-1"
        @click="settingsOpen = false"
      />
    </div>
    <div class="mt-4 grid grid-cols-2 gap-2">
      <UButton color="neutral" variant="subtle" block @click="choose(false)">Only necessary</UButton>
      <UButton color="primary" block @click="choose(true)">Allow statistics</UButton>
    </div>
  </section>
</template>
