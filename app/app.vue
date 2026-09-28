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
      <CreatePlaylistModal />
      <AddToPlaylistModal />
      <KeyboardShortcuts />
    </ClientOnly>
  </UApp>
</template>
