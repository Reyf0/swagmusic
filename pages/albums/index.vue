<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Альбомы</h1>
      <UButton to="/albums/create">Создать альбом</UButton>
    </div>

    <div v-if="loading" class="text-gray-500">Загрузка альбомов...</div>
    <div v-else-if="error" class="text-red-500">Ошибка: {{ error }}</div>
    <div v-else-if="albums.length === 0" class="text-gray-500">Нет альбомов</div>
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
      <div
          v-for="album in albums"
          :key="album.id"
          class="bg-white shadow rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          @click="goToAlbum(album.id)"
      >
        <img
            :src="album.cover_url || 'https://via.placeholder.com/300x300?text=No+Cover'"
            class="w-full h-48 object-cover"
            alt="Album Cover"
        >
        <div class="p-4">
          <h2 class="font-semibold truncate">{{ album.title }}</h2>
          <p class="text-sm text-gray-500 truncate">{{ album.author?.username || 'Неизвестный автор' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type {Album} from "@/types/global";

const supabase = useSupabaseClient()
const router = useRouter()

const albums = ref<Album[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const fetchAlbums = async () => {
  loading.value = true
  error.value = null

  const { data, error: err } = await supabase
      .from('albums')
      .select('*, user:profiles(username)')
      .order('created_at', { ascending: false })

  if (err) {
    error.value = err.message
  } else {
    albums.value = data || []
  }

  loading.value = false
}

const goToAlbum = (id: string) => {
  router.push(`/albums/${id}`)
}

onMounted(fetchAlbums)
</script>
