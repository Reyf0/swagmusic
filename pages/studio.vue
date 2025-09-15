<script setup lang="ts">
definePageMeta({
  layout: '',
});
</script>

<template>
  <UApp>
    <div class="bg-old-neutral-900 h-screen flex flex-row">
      <nav class="flex flex-col items-center h-screen min-w-40 border-r border-old-neutral-500 *:w-full *:text-old-neutral-400 *:h-20">
        <UButton class="flex justify-center items-center"><NuxtLink to="/">Home</NuxtLink></UButton>
        <UButton class="flex justify-center items-center"><NuxtLink>Feed</NuxtLink></UButton>
        <UButton class="flex justify-center items-center"><NuxtLink to="/library">Library</NuxtLink></UButton>
        <UButton class="flex justify-center items-center"><NuxtLink>For Artists</NuxtLink></UButton>
      </nav>
      <main>

      </main>
    </div>
  </UApp>
</template>
