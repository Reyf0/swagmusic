<script setup lang="ts">
// Global dialogs are downloaded the first time they are opened, not with every page.
const { createModalOpen, addModalTrack } = storeToRefs(usePlaylistsStore())
const shortcutsOpen = useShortcutsOpen()
const opened = reactive({ create: false, add: false, shortcuts: false })
watchEffect(() => {
  if (createModalOpen.value) opened.create = true
  if (addModalTrack.value) opened.add = true
  if (shortcutsOpen.value) opened.shortcuts = true
})
</script>

<template>
  <UApp>
    <NuxtErrorBoundary>
      <ErrorBoundary>
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </ErrorBoundary>
    </NuxtErrorBoundary>

    <ClientOnly>
      <LazyCreatePlaylistModal v-if="opened.create" />
      <LazyAddToPlaylistModal v-if="opened.add" />
      <LazyKeyboardShortcuts v-if="opened.shortcuts" />
    </ClientOnly>
  </UApp>
</template>
