<script setup lang="ts">
import * as Sentry from '@sentry/nuxt'

// Catches render errors below it and shows a recovery screen instead of a blank page.
const { t, isDev } = useI18n()
const route = useRoute()

const error = ref<{ message: string; stack?: string } | null>(null)

onErrorCaptured((err: unknown, _instance, info: string) => {
  console.error('Error captured by ErrorBoundary:', err, info)
  // Returning false stops propagation, so report to Sentry here.
  Sentry.captureException(err, { extra: { info } })
  error.value = {
    message: (err as any)?.message ?? String(err ?? 'Unknown error'),
    stack: (err as any)?.stack,
  }
  return false
})

// Leaving the broken page resets the boundary.
watch(() => route.fullPath, () => { error.value = null })

function retry() {
  window.location.reload()
}
</script>

<template>
  <div v-if="error" class="min-h-dvh flex items-center justify-center bg-old-neutral-50 dark:bg-old-neutral-950 p-6 text-old-neutral-900 dark:text-white">
    <div class="w-full max-w-2xl bg-white dark:bg-old-neutral-900 rounded-2xl shadow-xl p-6">
      <NuxtLink to="/" class="text-[#4ade80] text-xl font-bold">SwagMusic</NuxtLink>
      <h1 class="text-2xl font-bold mt-4">{{ t('error.title') }}</h1>
      <p class="mt-2 text-old-neutral-500">{{ t('error.description') }}</p>

      <div class="mt-4 flex flex-wrap gap-3">
        <UButton @click="retry">{{ t('error.tryAgain') }}</UButton>
        <UButton variant="outline" color="neutral" to="/">{{ t('error.goHome') }}</UButton>
      </div>

      <div class="mt-5 text-sm">
        <strong>{{ t('error.message') }}:</strong>
        <div class="mt-1 break-words bg-old-neutral-100 dark:bg-old-neutral-800 p-3 rounded text-xs">{{ error.message }}</div>
      </div>

      <details v-if="isDev && error.stack" class="mt-3">
        <summary class="cursor-pointer text-sm text-old-neutral-500">{{ t('error.showDetails') }}</summary>
        <pre class="mt-2 max-h-56 overflow-auto text-xs bg-black/5 dark:bg-white/5 p-3 rounded whitespace-pre-wrap">{{ error.stack }}</pre>
      </details>
    </div>
  </div>

  <slot v-else />
</template>
