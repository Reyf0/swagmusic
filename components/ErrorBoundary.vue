<template>
  <div v-if="hasError" class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
    <div class="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
      <div class="flex gap-6 p-6 items-center">
        <!-- Logo + animated mark -->
        <div class="flex-none">
          <div class="w-20 h-20 rounded-full bg-black flex items-center justify-center shadow-lg animate-float">
            <UButton><NuxtLink to="/" class="text-[#4ade80] text-xl font-bold">SwagMusic</NuxtLink></UButton>
            <!-- <img src="@/assets/images/swagmusic-logo.png" alt="SwagMusic" class="w-12 h-12" /> -->
          </div>
        </div>

        <div class="flex-1">
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ t('error.title') }}</h1>
          <p class="mt-2 text-slate-600 dark:text-slate-300">{{ t('error.description') }}</p>

          <div class="mt-4 flex flex-wrap gap-3">
            <UButton @click="retry" size="lg" class="px-4" color="primary">
              {{ t('error.tryAgain') }}
            </UButton>

            <UButton @click="goHome" size="lg" variant="outline" class="px-4">
              {{ t('error.goHome') }}
            </UButton>

            <UButton
                :disabled="reporting || reported"
                @click="report"
                size="lg"
                class="px-4"
                color="danger"
            >
              <span v-if="!reporting && !reported">{{ t('error.sendReport') }}</span>
              <span v-else-if="reporting">{{ t('error.sending') }}</span>
              <span v-else>{{ t('error.sent') }}</span>
            </UButton>
          </div>

          <!-- error message + stack (dev only) -->
          <div class="mt-5 text-sm text-slate-700 dark:text-slate-300">
            <div v-if="errorMessage" class="mb-2">
              <strong>{{ t('error.message') }}:</strong>
              <div class="mt-1 break-words bg-slate-100 dark:bg-slate-900 p-3 rounded">
                {{ errorMessage }}
              </div>
            </div>

            <details v-if="isDev && errorStack" class="mt-3">
              <summary class="cursor-pointer text-sm text-slate-600 dark:text-slate-300">
                {{ t('error.showDetails') }}
              </summary>
              <pre class="mt-2 max-h-56 overflow-auto text-xs bg-black/5 dark:bg-white/5 p-3 rounded text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{{ errorStack }}</pre>
            </details>

            <div class="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {{ t('error.note') }}
            </div>
          </div>
        </div>
      </div>

      <!-- decorative illustration footer (wave + subtle animation) -->
      <div class="w-full h-28 bg-gradient-to-t from-white dark:from-slate-800 to-transparent flex items-end">
        <svg class="w-full h-28 -mb-3" viewBox="0 0 1200 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,20 C150,80 350,0 600,20 C850,40 1050,10 1200,60 L1200,120 L0,120 Z" fill="url(#g1)">
          </path>
          <defs>
            <linearGradient id="g1" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stop-color="#6366F1" stop-opacity="0.12" />
              <stop offset="100%" stop-color="#EC4899" stop-opacity="0.08" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  </div>

  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useI18n } from '@/composables/useI18n'

interface ErrorInfo {
  message: string
  stack?: string
  component?: string
}

const { t, isDev } = useI18n()
const hasError = ref(false)
const errorInfo = ref<ErrorInfo | null>(null)
const reporting = ref(false)
const reported = ref(false)

const isDevelopment = isDev.value

onErrorCaptured((error: unknown, instance, info: string) => {
  // keep console logging for diagnostics
  // eslint-disable-next-line no-console
  console.error('Error captured by ErrorBoundary:', error, { info, instance })

  hasError.value = true
  errorInfo.value = {
    message: (error as any)?.message ?? String(error ?? 'Unknown error'),
    stack: (error as any)?.stack,
    component: info
  }

  // optionally send to monitoring here (Sentry) — leave to integration later
  // return false to stop propagation to higher error handlers (NuxtErrorBoundary)
  return false
})

const errorMessage = computed(() => errorInfo.value?.message ?? '')
const errorStack = computed(() => errorInfo.value?.stack ?? '')

function retry() {
  // simple UX: reload to try to recover
  window.location.reload()
}

function goHome() {
  navigateTo('/')
}

async function report() {
  if (reporting.value || reported.value) return
  reporting.value = true
  try {
    await $fetch('/api/v1/error', {
      method: 'POST',
      body: {
        message: errorMessage.value,
        stack: errorStack.value,
        component: errorInfo.value?.component ?? null,
        path: window.location.pathname
      }
    })
    reported.value = true
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to send error report', e)
  } finally {
    reporting.value = false
  }
}
</script>

<style scoped>
@keyframes floatY {
  0% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-6px) rotate(2deg); }
  100% { transform: translateY(0) rotate(-2deg); }
}
.animate-float {
  animation: floatY 4s ease-in-out infinite;
}
</style>
