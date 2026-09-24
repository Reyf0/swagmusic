<script setup lang="ts">
import type { Album } from '#shared/types'

// Create (album = 'new') or edit / delete an album of the current user.
const props = defineProps<{ album: Album | 'new' | null }>()
const emit = defineEmits<{ close: [] }>()

const toast = useToast()
const storage = useStorageUpload()
const studioStore = useStudioStore()

const title = ref('')
const description = ref('')
const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)
const saving = ref(false)
const confirmDelete = ref(false)
const deleting = ref(false)

const isNew = computed(() => props.album === 'new')
const existing = computed(() => (props.album && props.album !== 'new' ? props.album : null))

const open = computed({
  get: () => !!props.album,
  set: (v) => { if (!v) emit('close') },
})

watch(() => props.album, () => {
  title.value = existing.value?.title ?? ''
  description.value = existing.value?.description ?? ''
  coverFile.value = null
  coverPreview.value = existing.value?.cover_url ?? null
  confirmDelete.value = false
}, { immediate: true })

function onCover(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) {
    toast.add({ title: 'Choose an image up to 5 MB', color: 'warning' })
    return
  }
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
}

async function save() {
  if (!title.value.trim()) return
  saving.value = true
  let uploadedPath: string | null = null
  try {
    let coverUrl = existing.value?.cover_url ?? null
    if (coverFile.value) {
      const up = await storage.uploadPublic('covers', coverFile.value)
      uploadedPath = up.path
      coverUrl = up.publicUrl
    }
    const input = { title: title.value.trim(), description: description.value.trim() || null, cover_url: coverUrl }
    if (existing.value) {
      await studioStore.updateAlbum(existing.value.id, input)
      if (coverFile.value && existing.value.cover_url) await storage.remove('covers', storagePathFromPublicUrl('covers', existing.value.cover_url))
    } else {
      await studioStore.createAlbum(input)
    }
    toast.add({ title: isNew.value ? 'Album created' : 'Album saved', color: 'success' })
    emit('close')
  } catch (e: any) {
    await storage.remove('covers', uploadedPath)
    toast.add({ title: 'Could not save album', description: e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!existing.value) return
  deleting.value = true
  try {
    await studioStore.deleteAlbum(existing.value)
    toast.add({ title: 'Album deleted', description: 'Its tracks were kept.', color: 'success' })
    emit('close')
  } catch (e: any) {
    toast.add({ title: 'Could not delete album', description: e?.message, color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="isNew ? 'New album' : 'Edit album'">
    <template #body>
      <form id="album-edit-form" class="flex gap-4 items-start" @submit.prevent="save">
        <label class="relative size-28 shrink-0 rounded-md overflow-hidden bg-old-neutral-200 dark:bg-old-neutral-800 flex items-center justify-center cursor-pointer group">
          <img v-if="coverPreview" :src="coverPreview" alt="" class="size-full object-cover">
          <UIcon v-else name="i-lucide-disc-3" class="size-8 text-old-neutral-400" />
          <span class="absolute inset-0 bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">Choose cover</span>
          <input type="file" accept="image/*" class="sr-only" @change="onCover">
        </label>
        <div class="flex-1 space-y-4">
          <UFormField label="Title" required>
            <UInput v-model="title" class="w-full" maxlength="200" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="description" class="w-full" maxlength="1000" />
          </UFormField>
        </div>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <div>
          <template v-if="existing">
            <UButton v-if="!confirmDelete" color="error" variant="ghost" icon="i-lucide-trash-2" @click="confirmDelete = true">Delete</UButton>
            <div v-else class="flex items-center gap-2">
              <span class="text-sm">Delete album?</span>
              <UButton color="error" size="sm" :loading="deleting" @click="remove">Yes</UButton>
              <UButton color="neutral" variant="ghost" size="sm" @click="confirmDelete = false">No</UButton>
            </div>
          </template>
        </div>
        <div class="flex gap-2">
          <UButton variant="ghost" color="neutral" @click="open = false">Cancel</UButton>
          <UButton type="submit" form="album-edit-form" :loading="saving" :disabled="!title.trim()">{{ isNew ? 'Create' : 'Save' }}</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
