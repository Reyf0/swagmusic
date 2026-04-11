<script lang="ts" setup>
import { HeroProvider } from 'hero-motion'
</script>

<template>
  <NuxtErrorBoundary>
    <ErrorBoundary>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </ErrorBoundary>
  </NuxtErrorBoundary>
</template>