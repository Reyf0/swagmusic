<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

// Form data
const title = ref('')
const artist = ref('')
const audioFile = ref<File | null>(null)
const coverFile = ref<File | null>(null)
const audioPreview = ref('')
const coverPreview = ref('')

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

// Upload track to Supabase
const uploadTrack = async () => {
  // Validate form
  if (!title.value || !artist.value || !audioFile.value) {
    errorMsg.value = 'Please fill in all required fields and upload an audio file'
    return
  }

  errorMsg.value = ''
  successMsg.value = ''
  isUploading.value = true
  uploadProgress.value = 0

  try {
    // 1. Upload audio file
    const audioFileName = `${Date.now()}_${audioFile.value.name}`
    const { error: audioError } = await supabase.storage
      .from('tracks')
      .upload(audioFileName, audioFile.value)

    if (audioError) throw new Error(`Error uploading audio: ${audioError.message}`)
    uploadProgress.value = 50

    // Get public URL for audio
    const { data: audioData } = supabase.storage
      .from('tracks')
      .getPublicUrl(audioFileName)

    // 2. Upload cover image if provided
    let coverUrl = null
    if (coverFile.value) {
      const coverFileName = `${Date.now()}_${coverFile.value.name}`
      const { error: coverError } = await supabase.storage
        .from('covers')
        .upload(coverFileName, coverFile.value)

      if (coverError) throw new Error(`Error uploading cover: ${coverError.message}`)

      // Get public URL for cover
      const { data: coverData } = supabase.storage
        .from('covers')
        .getPublicUrl(coverFileName)

      coverUrl = coverData.publicUrl
    }
    uploadProgress.value = 75

    // 3. Create author if it doesn't exist
    let authorId
    const { data: existingAuthor, error: authorQueryError } = await supabase
      .from('authors')
      .select('id')
      .eq('name', artist.value)
      .single()

    if (authorQueryError && authorQueryError.code !== 'PGRST116') {
      throw new Error(`Error checking author: ${authorQueryError.message}`)
    }

    if (existingAuthor) {
      authorId = existingAuthor.id
    } else {
      const { data: newAuthor, error: authorInsertError } = await supabase
        .from('authors')
        .insert({ name: artist.value })
        .select('id')
        .single()

      if (authorInsertError) throw new Error(`Error creating author: ${authorInsertError.message}`)
      authorId = newAuthor.id
    }

    // 4. Create track record
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .insert({
        title: title.value,
        audio_url: audioData.publicUrl,
        cover_url: coverUrl,
        user_id: user.value?.id
      })
      .select('id')
      .single()

    if (trackError) throw new Error(`Error creating track: ${trackError.message}`)

    // 5. Create track-author relationship
    const { error: relationError } = await supabase
      .from('track_authors')
      .insert({
        track_id: track.id,
        author_id: authorId
      })

    if (relationError) throw new Error(`Error linking author: ${relationError.message}`)

    uploadProgress.value = 100
    successMsg.value = 'Track uploaded successfully!'

    // Reset form
    title.value = ''
    artist.value = ''
    audioFile.value = null
    coverFile.value = null
    if (audioPreview.value) {
      URL.revokeObjectURL(audioPreview.value)
      audioPreview.value = ''
    }
    if (coverPreview.value) {
      URL.revokeObjectURL(coverPreview.value)
      coverPreview.value = ''
    }

    // Redirect to tracks page after short delay
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
      <p>Please <NuxtLink to="/login" class="font-bold underline">login</NuxtLink> to upload tracks.</p>
    </div>

    <form v-else @submit.prevent="uploadTrack" class="space-y-6">
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
        <label for="title" class="block text-sm font-medium text-gray-700">Track Title *</label>
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
        <label for="artist" class="block text-sm font-medium text-gray-700">Artist *</label>
        <input 
          id="artist"
          v-model="artist" 
          type="text" 
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter artist name"
        >
      </div>

      <!-- Audio file upload -->
      <div>
        <label for="audio" class="block text-sm font-medium text-gray-700">Audio File (MP3, WAV) *</label>
        <input 
          id="audio"
          type="file" 
          @change="onAudioChange"
          accept="audio/mp3,audio/wav,audio/mpeg"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >

        <!-- Audio preview -->
        <div v-if="audioPreview" class="mt-2">
          <p class="text-sm text-gray-500 mb-1">Preview:</p>
          <audio controls class="w-full" :src="audioPreview"></audio>
        </div>
      </div>

      <!-- Cover image upload -->
      <div>
        <label for="cover" class="block text-sm font-medium text-gray-700">Cover Image (Optional)</label>
        <input 
          id="cover"
          type="file" 
          @change="onCoverChange"
          accept="image/jpeg,image/png,image/gif"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
          <div class="bg-indigo-600 h-2.5 rounded-full" :style="{ width: `${uploadProgress}%` }"></div>
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

<style scoped>
/* Additional styles can be added here if needed */
</style>
