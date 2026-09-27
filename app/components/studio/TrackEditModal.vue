<script setup lang="ts">
import type { Track } from '#shared/types'

// Edit / delete one of the current user's tracks (Studio).
const props = defineProps<{ track: Track | null }>()
const emit = defineEmits<{ close: [] }>()

const toast = useToast()
const user = useSupabaseUser()
const storage = useStorageUpload()
const studioStore = useStudioStore()
const { albums } = storeToRefs(studioStore)

const NO_ALBUM = 'none'
const title = ref('')
const albumId = ref(NO_ALBUM)
const lyrics = ref('')
const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)
const saving = ref(false)
const confirmDelete = ref(false)
const deleting = ref(false)

// Studio also lists tracks I'm only credited on; co-authors are managed by the uploader.
const isOwner = computed(() => !!props.track && props.track.user_id === user.value?.id)

const open = computed({
  get: () => !!props.track,
  set: (v) => { if (!v) emit('close') },
})

watch(() => props.track, (t) => {
  if (!t) return
  title.value = t.title
  albumId.value = t.album_id ?? NO_ALBUM
  lyrics.value = t.lyrics ?? ''
  coverFile.value = null
  coverPreview.value = t.cover_url
  confirmDelete.value = false
}, { immediate: true })

const albumItems = computed(() => [
  { label: 'No album', value: NO_ALBUM },
  ...albums.value.map(a => ({ label: a.title, value: a.id })),
])

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
  const t = props.track
  if (!t || !title.value.trim()) return
  saving.value = true
  let uploadedPath: string | null = null
  try {
    let coverUrl = t.cover_url
    if (coverFile.value) {
      const up = await storage.uploadPublic('covers', coverFile.value)
      uploadedPath = up.path
      coverUrl = up.publicUrl
    }
    await studioStore.updateTrack(t.id, {
      title: title.value.trim(),
      album_id: albumId.value === NO_ALBUM ? null : albumId.value,
      lyrics: lyrics.value.trim() || null,
      cover_url: coverUrl,
    })
    if (coverFile.value && t.cover_url) await storage.remove('covers', storagePathFromPublicUrl('covers', t.cover_url))
    toast.add({ title: 'Track saved', color: 'success' })
    emit('close')
  } catch (e: any) {
    await storage.remove('covers', uploadedPath)
    toast.add({ title: 'Could not save track', description: e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.track) return
  deleting.value = true
  try {
    await studioStore.deleteTrack(props.track)
    toast.add({ title: 'Track deleted', color: 'success' })
    emit('close')
  } catch (e: any) {
    toast.add({ title: 'Could not delete track', description: e?.message, color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Edit track" :ui="{ content: 'max-w-xl' }">
    <template #body>
      <form id="track-edit-form" class="space-y-4" @submit.prevent="save">
        <div class="flex gap-4 items-start">
          <label class="relative size-28 shrink-0 rounded-md overflow-hidden bg-old-neutral-200 dark:bg-old-neutral-800 flex items-center justify-center cursor-pointer group">
            <img v-if="coverPreview" :src="coverPreview" alt="" class="size-full object-cover">
            <UIcon v-else name="i-heroicons-musical-note" class="size-8 text-old-neutral-400" />
            <span class="absolute inset-0 bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">Change cover</span>
            <input type="file" accept="image/*" class="sr-only" @change="onCover">
          </label>
          <div class="flex-1 space-y-4">
            <UFormField label="Title" required>
              <UInput v-model="title" class="w-full" maxlength="200" />
            </UFormField>
            <UFormField label="Album">
              <USelect v-model="albumId" :items="albumItems" class="w-full" />
            </UFormField>
          </div>
        </div>
        <UFormField label="Lyrics">
          <UTextarea v-model="lyrics" :rows="8" autoresize class="w-full" />
        </UFormField>
      </form>
      <UFormField
        v-if="track && isOwner"
        label="Co-authors"
        help="Co-authors are credited after they accept the invite in their Studio. Changes here apply right away."
        class="mt-4"
      >
        <StudioTrackCredits :track-id="track.id" />
      </UFormField>
    </template>
    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <div>
          <UButton v-if="!confirmDelete" color="error" variant="ghost" icon="i-lucide-trash-2" @click="confirmDelete = true">Delete</UButton>
          <div v-else class="flex items-center gap-2">
            <span class="text-sm">Delete permanently?</span>
            <UButton color="error" size="sm" :loading="deleting" @click="remove">Yes, delete</UButton>
            <UButton color="neutral" variant="ghost" size="sm" @click="confirmDelete = false">No</UButton>
          </div>
        </div>
        <div class="flex gap-2">
          <UButton variant="ghost" color="neutral" @click="open = false">Cancel</UButton>
          <UButton type="submit" form="track-edit-form" :loading="saving" :disabled="!title.trim()">Save</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
