<script setup lang="ts">
const profileStore = useProfileStore()

const supabase = useSupabase()
const feedbackCount = useAdminFeedbackCount()

const nav = computed(() => [
  { label: 'Dashboard', icon: 'i-heroicons-home', to: '/admin' },
  { label: 'Users', icon: 'i-heroicons-users', to: '/admin/users' },
  { label: 'Tracks', icon: 'i-heroicons-musical-note', to: '/admin/tracks' },
  { label: 'Albums', icon: 'i-lucide-disc-3', to: '/admin/albums' },
  { label: 'Playlists', icon: 'i-heroicons-queue-list', to: '/admin/playlists' },
  { label: 'Feedback', icon: 'i-lucide-inbox', to: '/admin/feedback', badge: feedbackCount.value || undefined },
])

onMounted(async () => {
  const { count } = await supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'new')
  feedbackCount.value = count ?? 0
})

async function logout() {
  await profileStore.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-dvh bg-old-neutral-100 dark:bg-old-neutral-950 text-old-neutral-900 dark:text-white">
    <header class="bg-white dark:bg-old-neutral-900 shadow-sm">
      <div class="px-4 h-14 flex items-center justify-between gap-4">
        <NuxtLink to="/admin" class="text-lg font-bold">SwagMusic <span class="text-green-500">Admin</span></NuxtLink>
        <div class="flex items-center gap-1">
          <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" to="/">Back to site</UButton>
          <UButton icon="i-lucide-log-out" color="error" variant="ghost" @click="logout">Log out</UButton>
        </div>
      </div>
      <nav class="md:hidden flex gap-1 overflow-x-auto px-2 pb-2">
        <UButton v-for="item in nav" :key="item.to" :to="item.to" :icon="item.icon" size="sm" color="neutral" variant="ghost" active-variant="soft" :exact="item.to === '/admin'">
          {{ item.label }}<UBadge v-if="item.badge" color="error" size="sm" class="ml-auto">{{ item.badge }}</UBadge>
        </UButton>
      </nav>
    </header>

    <div class="flex">
      <aside class="hidden md:block w-56 shrink-0 p-3">
        <nav class="flex flex-col gap-1 sticky top-3">
          <UButton
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            color="neutral"
            variant="ghost"
            active-variant="soft"
            class="justify-start"
            :exact="item.to === '/admin'"
          >
            {{ item.label }}<UBadge v-if="item.badge" color="error" size="sm" class="ml-auto">{{ item.badge }}</UBadge>
          </UButton>
        </nav>
      </aside>

      <main class="flex-1 min-w-0 p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
