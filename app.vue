<template>
  <ErrorBoundary>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </ErrorBoundary>
</template>

<script setup>
const colorMode = useColorMode()
colorMode.preference = 'light'
console.log('DBG runtime public', useRuntimeConfig().public)
</script>
