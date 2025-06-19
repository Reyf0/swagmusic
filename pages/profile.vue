<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Профиль</h1>
    <div v-if="!user">
      <p>Пожалуйста, <NuxtLink to="/login" class="text-blue-500 hover:underline">войдите</NuxtLink> чтобы просмотреть свой профиль.</p>
    </div>
    <div v-else-if="loading">
      <p>Загрузка профиля...</p>
    </div>
    <div v-else-if="error">
      <p class="text-red-500">Ошибка: {{ error }}</p>
    </div>
    <div v-else-if="profile">
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <div class="flex items-center space-x-6">
          <div class="shrink-0">
            <img 
              :src="profile.avatar_url || 'https://via.placeholder.com/150?text=No+Avatar'" 
              alt="Avatar" 
              class="w-24 h-24 rounded-full object-cover border-2 border-gray-200" 
            />
          </div>
          <div>
            <h2 class="text-xl font-bold">{{ profile.username || user.email }}</h2>
            <p class="text-gray-500">{{ user.email }}</p>
            <p v-if="profile.bio" class="mt-2">{{ profile.bio }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white shadow rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">Информация профиля</h3>
        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-500">ID пользователя</p>
            <p>{{ user.id }}</p>
          </div>
          <div v-if="profile.full_name">
            <p class="text-sm text-gray-500">Полное имя</p>
            <p>{{ profile.full_name }}</p>
          </div>
          <div v-if="profile.website">
            <p class="text-sm text-gray-500">Веб-сайт</p>
            <p><a :href="profile.website" target="_blank" class="text-blue-500 hover:underline">{{ profile.website }}</a></p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Дата регистрации</p>
            <p>{{ new Date(user.created_at).toLocaleDateString() }}</p>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <p>Профиль не найден.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const profile = ref(null)
const loading = ref(true)
const error = ref(null)

definePageMeta({
  middleware: ['auth']
})

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
}, { immediate: true })

// Also fetch on component mount to handle page refresh
onMounted(() => {
  if (user.value) {
    fetchProfile()
  }
})
</script>
