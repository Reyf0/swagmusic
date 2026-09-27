<script setup lang="ts">
// Global "create playlist" dialog; open it with usePlaylistsStore().openCreate().
const playlistsStore = usePlaylistsStore()
const { createModalOpen } = storeToRefs(playlistsStore)
const toast = useToast()

const name = ref('')
const description = ref('')
const loading = ref(false)

watch(createModalOpen, (open) => {
  if (open) {
    name.value = ''
    description.value = ''
  }
})

async function onCreate() {
  const trimmed = name.value.trim()
  if (!trimmed) return

  loading.value = true
  try {
    const playlist = await playlistsStore.create(trimmed, description.value.trim())
    if (!playlist) return
    createModalOpen.value = false
    await navigateTo(`/playlist/${playlist.id}`)
  } catch (err: any) {
    toast.add({ title: 'Could not create playlist', description: err?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="createModalOpen" title="Create playlist">
    <template #body>
      <form id="create-playlist-form" class="space-y-4" @submit.prevent="onCreate">
        <UFormField label="Name" required>
          <UInput v-model="name" placeholder="My playlist" class="w-full" autofocus maxlength="100" />
        </UFormField>
        <UFormField label="Description">
          <UTextarea v-model="description" placeholder="Optional description" class="w-full" maxlength="500" />
        </UFormField>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="createModalOpen = false">Cancel</UButton>
        <UButton type="submit" form="create-playlist-form" :loading="loading" :disabled="!name.trim()">Create</UButton>
      </div>
    </template>
  </UModal>
</template>
