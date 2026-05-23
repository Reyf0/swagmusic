<template>
  <div class="dark min-h-screen flex items-center justify-center bg-old-neutral-50 dark:bg-old-neutral-900 px-4 py-12">
    <div class="w-full max-w-2xl">
      <div class="bg-white dark:bg-old-neutral-800 rounded-2xl shadow-lg overflow-hidden">
        <div class="p-6 sm:p-10">
          <NuxtLink to="/" class="inline-flex items-center gap-2 mb-6">
            <!-- <img src="/swagmusic-logo.png" alt="SwagMusic" class="h-8 w-auto" /> -->
            <span class="text-xl font-bold text-[#4ade80]">SwagMusic</span>
          </NuxtLink>

          <!-- page content -->
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

</script>

<style scoped>

</style>
