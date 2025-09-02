<script setup lang="ts">
import { ref } from 'vue'
import { getAudioDurationFromFile } from '@/utils/getAudioDurationFromFile'
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorUI, Database } from '@/types/global'

const supabase:SupabaseClient<Database> = useSupabaseClient()
const user = useSupabaseUser()

const router = useRouter()
const toast = useToast()
const { handleError } = useErrorHandler()

// Form data
const title = ref('')
const audioFile = ref<File | null>(null)
const coverFile = ref<File | null>(null)
const audioPreview = ref('')
const coverPreview = ref('')
const albumId = ref<string | null>(null)
const albums = ref<any[]>([])
const newAlbumTitle = ref('')
const authorId = ref<string | null>(null)
const trackAuthors = ref<AuthorUI[]>([])

// UI states
const isUploading = ref(false)
const uploadProgress = ref(0)
const errorMsg = ref('')
const successMsg = ref('')

// Redirect if not logged in
onMounted(() => {
  if (!user.value) {
    router.push('/login')
  }
})

const fetchAlbumsForAuthor = async (authorId: string) => {
  const {data, error} = await supabase
      .from('albums')
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', {ascending: false})

  if (!error) {
    albums.value = data
  } else {
    console.error('Error fetching albums:', error)
  }
}


// Handle audio file selection
const onAudioChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    audioFile.value = target.files[0]

    // Create audio preview URL
    if (audioPreview.value) {
      URL.revokeObjectURL(audioPreview.value)
    }
    audioPreview.value = URL.createObjectURL(audioFile.value)
  }
}

// Handle cover image selection
const onCoverChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    coverFile.value = target.files[0]

    // Create image preview URL
    if (coverPreview.value) {
      URL.revokeObjectURL(coverPreview.value)
    }
    coverPreview.value = URL.createObjectURL(coverFile.value)
  }
}

const createAlbum = async (albumTitle: string) => {
  if (!authorId.value) {
    toast.add({title: 'Сначала укажите артиста', color: 'warning'})
    return
  }

  let coverUrl = null
  if (coverFile.value) {
    const coverFileName = `${Date.now()}_${coverFile.value.name}`
    const {error: coverError} = await supabase.storage
        .from('covers')
        .upload(coverFileName, coverFile.value)

    if (coverError) {
      toast.add({title: 'Ошибка при загрузке обложки', description: coverError.message, color: 'error'})
      return
    }

    const {data: coverData} = supabase.storage
        .from('covers')
        .getPublicUrl(coverFileName)

    coverUrl = coverData.publicUrl
  }

  const {data, error} = await supabase
      .from('albums')
      .insert({
        title: albumTitle,
        author_id: authorId.value,
        cover_url: coverUrl
      })
      .select('*')
      .single()

  if (error) {
    toast.add({title: 'Ошибка при создании альбома', description: error.message, color: 'error'})
    return
  }

  albums.value.unshift(data)
  albumId.value = data.id
  toast.add({title: 'Альбом создан', color: 'success'})
}


// Upload track to Supabase
const uploadTrack = async () => {
  // Validate form
  if (!title.value || !trackAuthors.value || !audioFile.value) {
    errorMsg.value = 'Please fill in all required fields and upload an audio file'
    return
  }

  errorMsg.value = ''
  successMsg.value = ''
  isUploading.value = true
  uploadProgress.value = 0

  try {
    // 1. Upload audio file
    const audioFileName = `${Date.now()}_${title.value}_${trackAuthors.value.map(author => author.name).join('_')}`.toLowerCase()
    const durationSeconds = await getAudioDurationFromFile(audioFile.value)
    const {error: audioError} = await supabase.storage
        .from('tracks')
        .upload(audioFileName, audioFile.value)

    if (audioError) console.error(`Error uploading audio: ${audioError.message}`)
    uploadProgress.value = 50

    // Get public URL for audio
    const {data: audioData} = supabase.storage
        .from('tracks')
        .getPublicUrl(audioFileName)

    // 2. Upload cover image if provided
    let coverUrl = null
    if (coverFile.value) {
      const coverFileName = `${Date.now()}_${title.value}_cover`
      const {error: coverError} = await supabase.storage
          .from('covers')
          .upload(coverFileName, coverFile.value)

      if (coverError) handleError(coverError, 'Error uploading cover')

      // Get public URL for cover
      const {data: coverData} = supabase.storage
          .from('covers')
          .getPublicUrl(coverFileName)

      coverUrl = coverData.publicUrl
    }
    uploadProgress.value = 75

    // TODO Add multiple authors support for albums fetch
    // Создание альбома, если указан новый
    if (newAlbumTitle.value && !albumId.value) {
      await createAlbum(newAlbumTitle.value)
    }

    // 3. Create a track record
    const {data: track, error: trackError} = await supabase
        .from('tracks')
        .insert({
          title: title.value,
          audio_url: audioData.publicUrl,
          cover_url: coverUrl,
          user_id: user.value?.id,
          album_id: albumId.value,
          duration_seconds: durationSeconds
        })
        .select('id')
        .single()

    if (trackError) console.error(`Error creating track: ${trackError.message}`)

    // 4. Create a track-author relationship
    // TODO Add restriction to prevent duplicates
    const relations = trackAuthors.value.map((author, idx) => ({
      track_id: track.id,
      profile_id: author.id,
      order_index: idx + 1,
      status: 'pending' // New authors need to be approved
    }))
    relations.unshift({
      track_id: track.id,
      profile_id: user.value?.id,
      order_index: 0,
      status: 'approved'
    }) // Add uploader as first author
    const { error: relationError } = await supabase
        .from('track_authors')
        .insert(relations)

    if (relationError) handleError(relationError, 'Error linking author')
    uploadProgress.value = 100
    successMsg.value = 'Track uploaded successfully!'

    // Reset form
    title.value = ''
    audioFile.value = null
    coverFile.value = null
    trackAuthors.value = []
    if (audioPreview.value) {
      URL.revokeObjectURL(audioPreview.value)
      audioPreview.value = ''
    }
    if (coverPreview.value) {
      URL.revokeObjectURL(coverPreview.value)
      coverPreview.value = ''
    }

    // Redirect to tracks' page after a short delay
    setTimeout(() => {
      router.push('/tracks')
    }, 2000)

  } catch (error: any) {
    console.error('Upload error:', error)
    errorMsg.value = error.message || 'An error occurred during upload'
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Upload Track</h1>

    <div v-if="!user" class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
      <p>Please
        <NuxtLink to="/login" class="font-bold underline">login</NuxtLink>
        to upload tracks.
      </p>
    </div>

    <form v-else class="space-y-6" @submit.prevent="uploadTrack">
      <!-- Success message -->
      <div v-if="successMsg" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        <p>{{ successMsg }}</p>
      </div>

      <!-- Error message -->
      <div v-if="errorMsg" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>{{ errorMsg }}</p>
      </div>

      <!-- Track title -->
      <div>
        <label for="title" class="block text-sm font-medium text-gray-700">Track Title <span
            class="text-red-500">*</span></label>
        <input
            id="title"
            v-model="title"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter track title"
        >
      </div>

      <!-- Artist name -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Other authors</label>
        <AuthorPicker
            v-model="trackAuthors"
        />
      </div>
      <!-- TODO Fix upload modal: albums -->
      <!-- Album selection -->
      <div v-if="albums.length > 0">
        <label for="album" class="block text-sm font-medium text-gray-700">Album</label>
        <select
            id="album"
            v-model="albumId"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">No album</option>
          <option v-for="album in albums" :key="album.id" :value="album.id">{{ album.title }}</option>
        </select>


      </div>
      <!-- Новый альбом -->
      <div v-else class="mt-2">
        <label for="artist" class="block text-sm font-medium text-gray-700">Album</label>
        <UInput v-model="newAlbumTitle" placeholder="Новый альбом"/>
        <UButton
            class="ml-2 mt-2"
            :disabled="!newAlbumTitle"
            @click="createAlbum(newAlbumTitle)"
        >
          Создать альбом
        </UButton>
      </div>


      <!-- Audio file upload -->
      <div>
        <label for="audio" class="block text-sm font-medium text-gray-700">Audio File (MP3, WAV)<span
            class="text-red-500">*</span></label>
        <input
            id="audio"
            type="file"
            accept="audio/mp3,audio/wav,audio/mpeg"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            @change="onAudioChange"
        >

        <!-- Audio preview -->
        <div v-if="audioPreview" class="mt-2">
          <p class="text-sm text-gray-500 mb-1">Preview:</p>
          <audio controls class="w-full" :src="audioPreview"/>
        </div>
      </div>

      <!-- Cover image upload -->
      <div>
        <label for="cover" class="block text-sm font-medium text-gray-700">Cover Image</label>
        <input
            id="cover"
            type="file"
            accept="image/jpeg,image/png,image/gif"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            @change="onCoverChange"
        >

        <!-- Image preview -->
        <div v-if="coverPreview" class="mt-2">
          <p class="text-sm text-gray-500 mb-1">Preview:</p>
          <img :src="coverPreview" alt="Cover preview" class="h-40 w-40 object-cover rounded">
        </div>
      </div>

      <!-- Upload progress -->
      <div v-if="isUploading" class="mt-4">
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div class="bg-indigo-600 h-2.5 rounded-full" :style="{ width: `${uploadProgress}%` }"/>
        </div>
        <p class="text-sm text-gray-600 mt-1">Uploading: {{ uploadProgress }}%</p>
      </div>

      <!-- Submit button -->
      <div>
        <button
            type="submit"
            :disabled="isUploading"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <span v-if="isUploading">Uploading...</span>
          <span v-else>Upload Track</span>
        </button>
      </div>
    </form>
  </div>
</template>