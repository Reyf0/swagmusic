<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Playlist Management</h1>
      <UButton color="primary" icon="i-heroicons-plus">
        Add Playlist
      </UButton>
    </div>
    
    <UCard>
      <div class="py-8 text-center">
        <UIcon name="i-heroicons-queue-list" class="h-12 w-12 mx-auto text-gray-400" />
        <p class="mt-2 text-gray-500">Playlist management functionality coming soon</p>
      </div>
    </UCard>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'admin',
  middleware: ['admin']
});
</script>