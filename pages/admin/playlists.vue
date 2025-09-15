<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import type { TableColumn } from '@nuxt/ui'
import type { Playlist } from '@/types'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
});

const supabase = useSupabaseClient();
const toast = useToast();

// Playlists data
const playlists = ref<Playlist[]>([]);
const loading = ref(true);

// Pagination
const currentPage = ref(1);
const pageSize = 10;
const totalPlaylists = ref(0);
const totalPages = computed(() => Math.ceil(totalTracks.value / pageSize));

// Modals
const showEditModal = ref(false);
const showAddTrackModal = ref(false);
const showDeleteModal = ref(false);

// Track editing
const editingPlaylist = ref({});
const updating = ref(false);

// Playlist adding
const newPlaylist = ref({
  name: '',
  description: ''
});

// Playlist deletion
const deletingPlaylist = ref(null);
const deleting = ref(false);

// Formatting dates
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

// Custom debounce function
const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

// Fetch playlists
const fetchPlaylists = async () => {
  try {
    const { data, error } = await supabase
        .from('playlists')
        .select('*')
    playlists.value = data;
  }
  catch (err) {
    console.error('Error fetching playlists:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to load playlists',
      color: 'error'
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchPlaylists();
  console.log(playlists.value)
});
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Playlist Management</h1>
      <UButton color="primary" icon="i-heroicons-plus" class="text-black bg-white rounded-full border">
        Add Playlist
      </UButton>
    </div>
    <UTable :data="playlists" class="bg-white rounded-xl"/>
  </div>
</template>