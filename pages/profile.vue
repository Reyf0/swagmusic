<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Profile</h1>
    <div v-if="!user">
      <p>Please <NuxtLink to="/login" class="text-blue-500 hover:underline">log in</NuxtLink> to view your profile.</p>
    </div>
    <div v-else-if="loading">
      <p>Loading profile...</p>
    </div>
    <div v-else-if="error">
      <p class="text-red-500">Error: {{ error }}</p>
    </div>
    <div v-else-if="profile">
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <div class="flex items-center space-x-6">
          <div class="shrink-0 relative group w-24 h-24">
            <UAvatar
                :alt="profile.username"
                :src="profile.avatar_url"
                class="w-24 h-24 rounded-full object-cover border-2 border-gray-200 transition-transform duration-300 group-hover:scale-105"
            />
            <div
                class="absolute inset-0 flex flex-col justify-center items-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                @click="showAvatarEditor = true"
            >
              <UIcon name="i-heroicons-pencil" class="w-6 h-6 text-white mb-1" />
              <span class="text-xs text-white">Edit</span>
            </div>
          </div>
          <div>
            <h2 class="text-xl font-bold">{{ profile.username || user.email }}</h2>
            <p class="text-gray-500">{{ user.email }}</p>
            <p v-if="profile.bio" class="mt-2">{{ profile.bio }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white shadow rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">Profile information</h3>
        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-500">User ID</p>
            <p>{{ user.id }}</p>
          </div>
          <div v-if="profile.full_name">
            <p class="text-sm text-gray-500">Full name</p>
            <p>{{ profile.full_name }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Registration date</p>
            <p>{{ new Date(user.created_at).toLocaleDateString() }}</p>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <p>Profile not found.</p>
    </div>
    <div
        v-if="showAvatarEditor"
        class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm relative">
        <button
            class="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            @click="showAvatarEditor = false"
        >
          <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
        </button>
        <h2 class="text-lg font-semibold mb-4">Change Avatar</h2>
        <UInput type="file" accept="image/*" @change="handleFileChange" />
        <div class="flex justify-end mt-4 space-x-2">
          <UButton @click="uploadAvatar">Save</UButton>
          <UButton color="neutral" @click="showAvatarEditor = false">Cancel</UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

definePageMeta({
  middleware: ['auth']
})

const profile = ref(null)
const loading = ref(true)
const error = ref(null)

const showAvatarEditor = ref(false)
const selectedFile = ref<File | null>(null)
const uploading = ref(false)

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files?.length) {
    selectedFile.value = target.files[0]
  }
}

const getAvatarPath = (avatarUrl: string): string | null => {
  if (!avatarUrl) return null

  try {
    // Извлекаем путь после /public/
    const url = new URL(avatarUrl)
    const pathParts = url.pathname.split('/public/avatars/')
    if (pathParts.length < 2) return null

    return pathParts[1]
  } catch (e) {
    console.error('Ошибка при парсинге URL аватара:', e)
    return null
  }
}


const uploadAvatar = async () => {
  if (!selectedFile.value || !user.value) return
  uploading.value = true

  try {
    const fileExt = selectedFile.value.name.split('.').pop()
    const fileName = `${user.value.id}.${fileExt}`
    const filePath = `${user.value.id}/${fileName}`

    // Удаление предыдущего аватара
    if (profile.value?.avatar_url) {
      const relativePath = getAvatarPath(profile.value.avatar_url)
      if (relativePath) {
        await supabase.storage.from('avatars').remove([relativePath])
      }
    }

    // Загрузка нового аватара
    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile.value, {
          cacheControl: '3600',
          upsert: true,
        })

    if (uploadError) throw uploadError

    // Получение публичного URL с параметром для предотвращения кэширования
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    if (!data?.publicUrl) throw new Error('Не удалось получить публичный URL')

    // Обновление профиля с новым URL
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: `${data.publicUrl}?t=${Date.now()}` })
        .eq('id', user.value.id)

    if (updateError) throw updateError

    // Обновляем профиль в интерфейсе
    await fetchProfile()

    toast.add({ title: 'Аватар обновлён', color: 'success' })
    showAvatarEditor.value = false
  } catch (err) {
    console.error('Ошибка при загрузке аватара:', err)
    toast.add({ title: 'Ошибка', description: err.message, color: 'error' })
  } finally {
    uploading.value = false
  }
}






// Function to fetch user profile
const fetchProfile = async () => {
  if (!user.value) return

  loading.value = true
  error.value = null

  try {
    const { data, error: supabaseError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (supabaseError) {
      throw supabaseError
    }

    // If profile exists, use it
    if (data) {
      profile.value = data

      // If username is not in profile but exists in user metadata, use that
      if (!profile.value.username && user.value.user_metadata && user.value.user_metadata.username) {
        profile.value.username = user.value.user_metadata.username
      }
    } else if (user.value.user_metadata && user.value.user_metadata.username) {
      // Create a basic profile with username from metadata
      profile.value = {
        id: user.value.id,
        username: user.value.user_metadata.username
      }
    } else {
      // Create a minimal profile
      profile.value = {
        id: user.value.id,
        username: user.value.email?.split('@')[0] || 'User'
      }
    }
  } catch (err) {
    console.error('Error fetching profile:', err)
    error.value = err.message || 'Failed to load profile'
    toast.add({
      title: 'Ошибка загрузки профиля',
      description: error.value,
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

// Watch for user changes and fetch profile when user is available
watch(user, (newUser) => {
  if (newUser) {
    fetchProfile()
  } else {
    profile.value = null
    loading.value = false
  }
},
    { onError: (err) => {
        console.error('Ошибка отслеживания пользователя:', err)
        error.value = 'Ошибка отслеживания пользователя'
      },
      immediate: true
    })

// Also fetch on component mount to handle page refresh
onMounted(() => {
  if (user.value) {
    fetchProfile()
  }
})
</script>
