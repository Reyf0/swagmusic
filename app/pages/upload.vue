<script setup lang="ts">
import type { PickedAuthor } from '@/components/AuthorPicker.vue'

const supabase = useSupabase()
const user = useSupabaseUser()
const toast = useToast()
const storage = useStorageUpload()
const studioStore = useStudioStore()
const { albums } = storeToRefs(studioStore)

// Form data
const title = ref('')
const coAuthors = ref<PickedAuthor[]>([])
const NO_ALBUM = 'none'
const albumId = ref<string>(NO_ALBUM)
const lyrics = ref('')
const audioFile = ref<File | null>(null)
const coverFile = ref<File | null>(null)
const audioPreview = ref('')
const coverPreview = ref('')

// Inline album creation
const newAlbumOpen = ref(false)
const newAlbumTitle = ref('')
const creatingAlbum = ref(false)

// UI state
const isUploading = ref(false)
const step = ref('')
const uploadProgress = ref(0)
const errorMsg = ref('')

onMounted(() => {
  if (user.value) studioStore.loadAlbums().catch(e => console.error('Failed to load albums', e))
})

const albumItems = computed(() => [
  { label: 'No album', value: NO_ALBUM },
  ...albums.value.map(a => ({ label: a.title, value: a.id })),
])

function pickFile(e: Event, kind: 'audio' | 'cover') {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null
  errorMsg.value = ''
  if (!file) return

  if (kind === 'audio') {
    if (!file.type.startsWith('audio/')) return void (errorMsg.value = 'Please choose an audio file (MP3, WAV, OGG, …)')
    if (file.size > MAX_AUDIO_BYTES) return void (errorMsg.value = 'Audio files can be at most 50 MB')
    if (audioPreview.value) URL.revokeObjectURL(audioPreview.value)
    audioFile.value = file
    audioPreview.value = URL.createObjectURL(file)
    if (!title.value) title.value = file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim()
  } else {
    if (!file.type.startsWith('image/')) return void (errorMsg.value = 'Please choose an image for the cover')
    if (file.size > MAX_IMAGE_BYTES) return void (errorMsg.value = 'Cover images can be at most 5 MB')
    if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
    coverFile.value = file
    coverPreview.value = URL.createObjectURL(file)
  }
}

onBeforeUnmount(() => {
  if (audioPreview.value) URL.revokeObjectURL(audioPreview.value)
  if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
})

async function createAlbum() {
  const t = newAlbumTitle.value.trim()
  if (!t) return
  creatingAlbum.value = true
  try {
    const album = await studioStore.createAlbum({ title: t })
    albumId.value = album.id
    newAlbumTitle.value = ''
    newAlbumOpen.value = false
    toast.add({ title: 'Album created', description: t, color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Could not create album', description: e?.message, color: 'error' })
  } finally {
    creatingAlbum.value = false
  }
}

async function uploadTrack() {
  const uploaderId = user.value?.id
  if (!uploaderId) return navigateTo('/login')
  if (!title.value.trim()) return void (errorMsg.value = 'Enter a track title')
  if (!audioFile.value) return void (errorMsg.value = 'Choose an audio file')

  errorMsg.value = ''
  isUploading.value = true
  uploadProgress.value = 0

  // Everything created so far, so a failure can be rolled back.
  let audioPath: string | null = null
  let coverPath: string | null = null
  let trackId: string | null = null

  try {
    step.value = 'Reading audio…'
    const durationSeconds = await getAudioDurationFromFile(audioFile.value)
    uploadProgress.value = 10

    step.value = 'Uploading audio…'
    const audio = await storage.uploadPublic('tracks', audioFile.value)
    audioPath = audio.path
    uploadProgress.value = 60

    let coverUrl: string | null = null
    if (coverFile.value) {
      step.value = 'Uploading cover…'
      const cover = await storage.uploadPublic('covers', coverFile.value)
      coverPath = cover.path
      coverUrl = cover.publicUrl
    }
    uploadProgress.value = 75

    step.value = 'Saving track…'
    const track = await createTrackWithUniqueSlug(supabase, {
      title: title.value.trim(),
      audio_url: audio.publicUrl,
      cover_url: coverUrl,
      user_id: uploaderId,
      album_id: albumId.value === NO_ALBUM ? null : albumId.value,
      duration_seconds: durationSeconds,
      ...(lyrics.value.trim() && { lyrics: lyrics.value.trim() }),
    } as any)
    trackId = track.id
    uploadProgress.value = 90

    // The uploader is credited right away; co-authors get an invite to accept in their Studio.
    const credits = [
      { track_id: track.id, profile_id: uploaderId, order_index: 0, status: 'approved' },
      ...coAuthors.value.map((a, i) => ({
        track_id: track.id,
        profile_id: a.id,
        order_index: i + 1,
        status: 'pending',
        invited_by: uploaderId,
        invited_at: new Date().toISOString(),
      })),
    ]
    const { error: creditsError } = await supabase.from('track_authors').insert(credits)
    if (creditsError) throw creditsError
    uploadProgress.value = 100

    toast.add({
      title: 'Track uploaded',
      description: coAuthors.value.length ? 'Co-authors will be credited once they accept the invite.' : title.value,
      color: 'success',
    })
    await navigateTo('/studio')
  } catch (e: any) {
    console.error('Upload error:', e)
    errorMsg.value = e?.message || 'Upload failed'
    // roll back
    if (trackId) await supabase.from('tracks').delete().eq('id', trackId)
    await Promise.all([storage.remove('tracks', audioPath), storage.remove('covers', coverPath)])
  } finally {
    isUploading.value = false
    step.value = ''
  }
}

useSeoMeta({ title: 'Upload' })
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Upload a track</h1>

    <form class="space-y-6" @submit.prevent="uploadTrack">
      <UAlert v-if="errorMsg" color="error" variant="soft" :title="errorMsg" icon="i-heroicons-exclamation-triangle" />

      <UFormField label="Audio file" required help="MP3, WAV, OGG or FLAC, up to 50 MB">
        <input
          type="file"
          accept="audio/*"
          class="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-green-500 file:px-4 file:py-2 file:text-white hover:file:bg-green-600"
          :disabled="isUploading"
          @change="pickFile($event, 'audio')"
        >
        <audio v-if="audioPreview" controls class="w-full mt-2" :src="audioPreview" />
      </UFormField>

      <UFormField label="Title" required>
        <UInput v-model="title" placeholder="Track title" class="w-full" maxlength="200" :disabled="isUploading" />
      </UFormField>

      <UFormField label="Co-authors" help="You are credited automatically. Co-authors are credited after they accept the invite in their Studio.">
        <AuthorPicker v-model="coAuthors" :exclude="user ? [user.id] : []" />
      </UFormField>

      <UFormField label="Album">
        <div class="flex gap-2">
          <USelect v-model="albumId" :items="albumItems" class="flex-1" :disabled="isUploading" />
          <UButton icon="i-heroicons-plus" variant="soft" color="neutral" :disabled="isUploading" @click="newAlbumOpen = !newAlbumOpen">New album</UButton>
        </div>
        <div v-if="newAlbumOpen" class="flex gap-2 mt-2">
          <UInput v-model="newAlbumTitle" placeholder="Album title" class="flex-1" maxlength="200" @keydown.enter.prevent="createAlbum" />
          <UButton :loading="creatingAlbum" :disabled="!newAlbumTitle.trim()" @click="createAlbum">Create</UButton>
        </div>
      </UFormField>

      <UFormField label="Cover image" help="JPG, PNG or WebP, up to 5 MB">
        <input
          type="file"
          accept="image/*"
          class="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-old-neutral-200 dark:file:bg-old-neutral-700 file:px-4 file:py-2"
          :disabled="isUploading"
          @change="pickFile($event, 'cover')"
        >
        <img v-if="coverPreview" :src="coverPreview" alt="Cover preview" class="mt-2 size-40 object-cover rounded-md">
      </UFormField>

      <UFormField label="Lyrics">
        <UTextarea v-model="lyrics" :rows="6" autoresize placeholder="Optional" class="w-full" :disabled="isUploading" />
      </UFormField>

      <div v-if="isUploading" class="space-y-1">
        <UProgress v-model="uploadProgress" />
        <p class="text-sm text-old-neutral-500">{{ step }}</p>
      </div>

      <UButton type="submit" block size="lg" :loading="isUploading" :disabled="!audioFile || !title.trim()">
        Upload track
      </UButton>
    </form>
  </div>
</template>
