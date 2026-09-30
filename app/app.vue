<script setup lang="ts">
// Global dialogs are downloaded the first time they are opened, not with every page.
const { createModalOpen, addModalTrack } = storeToRefs(usePlaylistsStore())
const shortcutsOpen = useShortcutsOpen()
const reportSubject = useReportSubject()
const opened = reactive({ create: false, add: false, shortcuts: false, report: false })
watchEffect(() => {
  if (createModalOpen.value) opened.create = true
  if (addModalTrack.value) opened.add = true
  if (shortcutsOpen.value) opened.shortcuts = true
  if (reportSubject.value) opened.report = true
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
      <LazyReportModal v-if="opened.report" />
    </ClientOnly>
  </UApp>
</template>
