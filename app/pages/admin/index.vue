<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

type Stats = {
  users: number
  tracks: number
  albums: number
  playlists: number
  plays: number
  playsByDay: { day: string; total_listens: number }[]
}

const { data: stats, pending, error, refresh } = await useFetch<Stats>('/api/v1/admin/stats', { server: false })

const cards = computed(() => [
  { label: 'Users', value: stats.value?.users, icon: 'i-heroicons-users', to: '/admin/users' },
  { label: 'Tracks', value: stats.value?.tracks, icon: 'i-heroicons-musical-note', to: '/admin/tracks' },
  { label: 'Albums', value: stats.value?.albums, icon: 'i-lucide-disc-3', to: '/admin/albums' },
  { label: 'Playlists', value: stats.value?.playlists, icon: 'i-heroicons-queue-list', to: '/admin/playlists' },
  { label: 'Plays', value: stats.value?.plays, icon: 'i-heroicons-play' },
])

const days = computed(() => stats.value?.playsByDay ?? [])
const maxPlays = computed(() => Math.max(1, ...days.value.map(d => d.total_listens)))
const periodTotal = computed(() => days.value.reduce((sum, d) => sum + d.total_listens, 0))

// Days are UTC calendar dates (YYYY-MM-DD); format them in UTC so they don't shift by a day.
const fmtDay = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC', ...opts })
// Date labels under the axis: first, middle and last day.
const labelIdx = computed(() => new Set([0, Math.floor((days.value.length - 1) / 2), days.value.length - 1]))
const hovered = ref<number | null>(null)

useSeoMeta({ title: 'Admin' })
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

    <UAlert v-if="error" color="error" variant="soft" title="Could not load stats" :description="error.message" :actions="[{ label: 'Retry', onClick: () => refresh() }]" class="mb-6" />

    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
      <NuxtLink
        v-for="card in cards"
        :key="card.label"
        :to="card.to ?? '/admin'"
        class="rounded-xl bg-white dark:bg-old-neutral-900 p-4 shadow-sm hover:shadow transition"
      >
        <div class="flex items-center gap-2 text-sm text-old-neutral-500 mb-1">
          <UIcon :name="card.icon" class="size-4" />{{ card.label }}
        </div>
        <div class="text-3xl font-bold tabular-nums">
          <USkeleton v-if="pending" class="h-8 w-16" />
          <template v-else>{{ card.value ?? '—' }}</template>
        </div>
      </NuxtLink>
    </div>

    <section class="rounded-xl bg-white dark:bg-old-neutral-900 p-4 shadow-sm">
      <div class="flex items-baseline justify-between gap-4 mb-4">
        <h2 class="font-semibold">Plays per day, last 30 days</h2>
        <span v-if="days.length" class="text-sm text-old-neutral-500 tabular-nums">{{ periodTotal }} in total</span>
      </div>

      <USkeleton v-if="pending" class="h-48 w-full" />
      <template v-else-if="days.length">
        <div class="flex gap-2">
          <!-- y axis: max and 0 -->
          <div class="flex flex-col justify-between h-40 text-xs text-old-neutral-500 tabular-nums text-right w-8 -my-1.5">
            <span>{{ maxPlays }}</span>
            <span>0</span>
          </div>

          <div class="relative flex-1 min-w-0">
            <div class="relative flex h-40" @mouseleave="hovered = null">
              <!-- gridlines at max and 0 -->
              <div class="absolute inset-x-0 top-0 border-t border-dashed border-old-neutral-200 dark:border-old-neutral-800" />
              <div class="absolute inset-x-0 bottom-0 border-t border-old-neutral-300 dark:border-old-neutral-700" />
              <!-- each column is the hover target; the bar inside it is the mark -->
              <div
                v-for="(d, i) in days"
                :key="d.day"
                class="relative flex-1 h-full flex items-end px-px cursor-default"
                tabindex="0"
                :aria-label="`${fmtDay(d.day, { day: 'numeric', month: 'long' })}: ${d.total_listens} plays`"
                @mouseenter="hovered = i"
                @focus="hovered = i"
                @blur="hovered = null"
              >
                <div
                  class="w-full rounded-t-[4px] transition-colors"
                  :class="hovered === i ? 'bg-green-500' : 'bg-green-500/75'"
                  :style="{ height: d.total_listens ? `max(2px, ${(d.total_listens / maxPlays) * 100}%)` : '0' }"
                />
                <div
                  v-if="hovered === i"
                  class="absolute bottom-full mb-2 z-10 pointer-events-none whitespace-nowrap rounded-md bg-old-neutral-900 dark:bg-old-neutral-800 text-white text-xs px-2 py-1 shadow-lg"
                  :class="i < days.length / 2 ? 'left-0' : 'right-0'"
                >
                  <div class="font-semibold tabular-nums">{{ plural(d.total_listens, 'play') }}</div>
                  <div class="text-old-neutral-300">{{ fmtDay(d.day, { weekday: 'short', day: 'numeric', month: 'short' }) }}</div>
                </div>
              </div>
            </div>

            <!-- x axis: first / middle / last date -->
            <div class="relative h-5 mt-1 text-xs text-old-neutral-500">
              <span
                v-for="i in labelIdx"
                :key="i"
                class="absolute whitespace-nowrap"
                :class="i === 0 ? 'left-0' : i === days.length - 1 ? 'right-0' : '-translate-x-1/2'"
                :style="i !== 0 && i !== days.length - 1 ? { left: `${((i + 0.5) / days.length) * 100}%` } : {}"
              >{{ fmtDay(days[i]!.day, { day: 'numeric', month: 'short' }) }}</span>
            </div>
          </div>
        </div>

        <!-- same data as a table for screen readers -->
        <table class="sr-only">
          <caption>Plays per day, last 30 days</caption>
          <thead><tr><th>Date</th><th>Plays</th></tr></thead>
          <tbody>
            <tr v-for="d in days" :key="d.day"><td>{{ d.day }}</td><td>{{ d.total_listens }}</td></tr>
          </tbody>
        </table>
      </template>
      <p v-else class="text-sm text-old-neutral-500">No plays yet.</p>
    </section>
  </div>
</template>
