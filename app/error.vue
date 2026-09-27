<script setup lang="ts">
import type { NuxtError } from '#app'

// Nuxt renders this page for fatal errors and unknown routes.
const props = defineProps<{ error: NuxtError }>()
const isDev = import.meta.dev

const is404 = computed(() => props.error?.statusCode === 404)
const errorMessage = computed(() => props.error?.statusMessage || props.error?.message || '')
const errorStack = computed(() => (props.error as any)?.stack ?? '')

const q = ref('')

function onSearch() {
  const query = q.value.trim()
  clearError({ redirect: query ? `/search?q=${encodeURIComponent(query)}` : '/search' })
}

useSeoMeta({ title: () => (is404.value ? 'Page not found' : 'Error') })
</script>

<template>
  <UApp>
    <div class="min-h-dvh flex items-center justify-center bg-old-neutral-50 dark:bg-old-neutral-950 p-6 text-old-neutral-900 dark:text-white">
      <div class="w-full max-w-2xl bg-white dark:bg-old-neutral-900 rounded-2xl shadow-2xl p-6 md:p-8">
        <NuxtLink to="/" class="text-[#4ade80] text-xl font-bold">SwagMusic</NuxtLink>

        <template v-if="is404">
          <div class="mt-6 text-6xl font-extrabold">404</div>
          <h1 class="text-2xl font-bold mt-2 mb-2">Page not found</h1>
          <p class="text-old-neutral-500 mb-6">The page you are looking for doesn't exist or was moved.</p>

          <div class="flex flex-wrap gap-3 items-center">
            <UButton @click="clearError({ redirect: '/' })">Go home</UButton>
            <form class="flex items-center gap-2" role="search" @submit.prevent="onSearch">
              <UInput v-model="q" type="search" icon="i-heroicons-magnifying-glass" placeholder="Search tracks and artists" aria-label="Search" />
              <UButton type="submit" variant="soft" color="neutral">Search</UButton>
            </form>
          </div>
        </template>

        <template v-else>
          <h1 class="text-2xl font-bold mt-6">Something went wrong</h1>
          <p class="mt-2 text-old-neutral-500">An unexpected error occurred. Try again or go back to the home page.</p>

          <div class="mt-4 flex flex-wrap gap-3">
            <UButton @click="clearError({ redirect: $route.fullPath })">Try again</UButton>
            <UButton variant="outline" color="neutral" @click="clearError({ redirect: '/' })">Go home</UButton>
          </div>

          <div v-if="errorMessage" class="mt-5 text-sm">
            <strong>Error:</strong>
            <div class="mt-1 break-words bg-old-neutral-100 dark:bg-old-neutral-800 p-3 rounded text-xs">{{ errorMessage }}</div>
          </div>

          <details v-if="isDev && errorStack" class="mt-3">
            <summary class="cursor-pointer text-sm text-old-neutral-500">Show details</summary>
            <pre class="mt-2 max-h-64 overflow-auto text-xs bg-black/5 dark:bg-white/5 p-3 rounded whitespace-pre-wrap">{{ errorStack }}</pre>
          </details>
        </template>
      </div>
    </div>
  </UApp>
</template>
