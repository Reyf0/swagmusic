<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6">
    <div class="w-full max-w-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-2xl shadow-2xl p-6">
      <!-- 404 layout -->
      <template v-if="is404">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="flex-none text-center">
            <div class="w-30 h-30 rounded-full bg-black flex items-center justify-center shadow-2xl animate-float">
              <UButton><NuxtLink to="/" class="text-[#4ade80] text-xl font-bold">SwagMusic</NuxtLink></UButton>
            </div>
            <div class="mt-4 text-6xl font-extrabold text-slate-900 dark:text-white">404</div>
            <div class="text-sm text-slate-500 dark:text-slate-300">— {{ t('notFound.code') }}</div>
          </div>

          <div class="flex-1">
            <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">{{ t('notFound.title') }}</h1>
            <p class="text-slate-600 dark:text-slate-300 mb-4">{{ t('notFound.description') }}</p>

            <div class="flex gap-3 flex-wrap items-center">
              <UButton @click="goHome" class="text-[#4ade80] font-bold bg-black">{{ t('notFound.home') }}</UButton>

              <form @submit.prevent="onSearch" class="flex items-center gap-2">
                <input
                    v-model="q"
                    aria-label="Search"
                    type="search"
                    placeholder="Search tracks, authors, playlists..."
                    class="px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm w-64 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700"
                />
                <UButton type="submit" class="dark:text-black text-white dark:bg-white bg-black border">{{ t('notFound.search') }}</UButton>
              </form>

              <UButton @click="reportNotFound" size="sm" class="ml-auto text-xs text-black dark:text-white border">
                {{ t('notFound.report') }}
              </UButton>
            </div>

            <div class="mt-6 text-xs text-slate-500 dark:text-slate-400">
              {{ t('notFound.tip') }}
            </div>
          </div>
        </div>
      </template>

      <!-- Generic error layout -->
      <template v-else>
        <div class="flex gap-6 items-start">
          <div class="flex-none">
            <div class="w-30 h-30 rounded-full bg-black flex items-center justify-center shadow-lg animate-float">
              <UButton><NuxtLink to="/" class="text-[#4ade80] text-xl font-bold">SwagMusic</NuxtLink></UButton>
            </div>
          </div>

          <div class="flex-1">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ t('error.title') }}</h1>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ t('error.description') }}</p>

            <div class="mt-4 flex flex-wrap gap-3">
              <UButton @click="reload" size="md" color="primary">{{ t('error.tryAgain') }}</UButton>
              <UButton @click="goHome" size="md" variant="outline">{{ t('error.goHome') }}</UButton>
              <UButton :disabled="reporting || reported" @click="report" size="md" color="danger" class="border">
                <span v-if="!reporting && !reported">{{ t('error.sendReport') }}</span>
                <span v-else-if="reporting">{{ t('error.sending') }}</span>
                <span v-else>{{ t('error.sent') }}</span>
              </UButton>
            </div>

            <div class="mt-5 text-sm text-slate-700 dark:text-slate-300">
              <div v-if="errorMessage" class="mb-2">
                <strong>{{ t('error.message') }}:</strong>
                <div class="mt-1 break-words bg-slate-100 dark:bg-slate-900 p-3 rounded text-xs">{{ errorMessage }}</div>
              </div>

              <details v-if="isDev && errorStack" class="mt-3">
                <summary class="cursor-pointer text-sm text-slate-600 dark:text-slate-300">
                  {{ t('error.showDetails') }}
                </summary>
                <pre class="mt-2 max-h-64 overflow-auto text-xs bg-black/5 dark:bg-white/5 p-3 rounded text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{{ errorStack }}</pre>
              </details>

              <div class="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {{ t('error.note') }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
// TODO fix bugs
/**
 * Nuxt passes the `error` prop to the error page.
 * Use defineProps to reliably receive it.
 */
const props = defineProps<{
  error?: any
}>()

const { t, isDev } = useI18n()

const reporting = ref(false)
const reported = ref(false)

const q = ref('')

const errorObj = computed(() => props.error ?? null)
const statusCode = computed(() => {
  return errorObj.value?.statusCode ?? errorObj.value?.status ?? null
})

const is404 = computed(() => statusCode.value === 404)

const errorMessage = computed(() => errorObj.value?.message ?? '')
const errorStack = computed(() => errorObj.value?.stack ?? '')

function reload() {
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
        message: errorMessage.value || (statusCode.value ? `HTTP ${statusCode.value}` : 'Unknown error'),
        stack: errorStack.value,
        path: useRoute().fullPath
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

function onSearch() {
  const query = (q.value || '').trim()
  if (!query) {
    navigateTo('/search')
    return
  }
  navigateTo({ path: '/search', query: { q: query } })
}

async function reportNotFound() {
  if (reporting.value || reported.value) return
  reporting.value = true
  try {
    await $fetch('/api/v1/error', {
      method: 'POST',
      body: {
        message: `404 Not Found: ${route.fullPath}`,
        path: route.fullPath,
        note: 'User reported missing page (404)',
      }
    })
    reported.value = true
    // небольшой фидбек: можно показать toast — но это зависит от твоего UIsystem
    // например useToast?.show('Reported')
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to report 404', e)
  } finally {
    reporting.value = false
  }
}
</script>

<style scoped>
@import "@/assets/css/main.css";
@keyframes floatY {
  0% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-6px) rotate(2deg); }
  100% { transform: translateY(0) rotate(-2deg); }
}
.animate-float {
  animation: floatY 4s ease-in-out infinite;
}
</style>
