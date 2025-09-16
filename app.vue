<script lang="ts" setup>
const colorMode = useColorMode()
colorMode.preference = 'light'
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