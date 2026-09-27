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

const maxPlays = computed(() => Math.max(1, ...(stats.value?.playsByDay ?? []).map(d => d.total_listens)))

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
      <h2 class="font-semibold mb-4">Plays per day (last 30 days with activity)</h2>
      <p v-if="!pending && !stats?.playsByDay.length" class="text-sm text-old-neutral-500">No plays yet.</p>
      <div v-else class="flex items-end gap-1 h-40" role="img" aria-label="Plays per day">
        <div
          v-for="d in stats?.playsByDay ?? []"
          :key="d.day"
          class="flex-1 bg-green-500/80 hover:bg-green-500 rounded-t min-h-0.5"
          :style="{ height: `${(d.total_listens / maxPlays) * 100}%` }"
          :title="`${new Date(d.day).toLocaleDateString()}: ${d.total_listens}`"
        />
      </div>
    </section>
  </div>
</template>
