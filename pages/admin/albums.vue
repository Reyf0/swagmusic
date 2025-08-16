<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Album Management</h1>
      <button
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          @click="showAddAlbumModal = true"
      >
        <UIcon name="i-heroicons-plus" class="mr-2"/>
        Add Album
      </button>
    </div>

    <!-- Search and filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="relative md:w-1/3">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3">
            <UIcon name="i-heroicons-magnifying-glass" class="text-gray-400"/>
          </span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search albums..."
            class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @input="debouncedSearch"
          >
        </div>
        <div class="flex-grow"/>
        <button
          class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          @click="fetchAlbums"
        >
          <UIcon name="i-heroicons-arrow-path" class="mr-2" :class="{ 'animate-spin': loading }"/>
          Refresh
        </button>
      </div>
    </div>

    <!-- Albums table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="loading" class="py-8 text-center">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 mx-auto text-gray-400"/>
        <p class="mt-2 text-gray-500">Loading albums...</p>
      </div>
      <div v-else-if="albums.length === 0" class="py-8 text-center">
        <UIcon name="i-heroicons-musical-note" class="h-12 w-12 mx-auto text-gray-400"/>
        <p class="mt-2 text-gray-500">No albums found</p>
        <button
          class="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          @click="fetchAlbums"
        >
          Refresh
        </button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Album
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Author
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tracks
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="album in albums" :key="album.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-12 w-12">
                    <img
                      class="h-12 w-12 rounded-lg object-cover"
                      :src="album.cover_url || 'https://via.placeholder.com/48x48?text=No+Cover'"
                      :alt="album.title"
                    >
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ album.title }}</div>
                    <div class="text-sm text-gray-500">{{ album.description || 'No description' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ album.user?.username || 'Unknown' }}</div>
                <div class="text-sm text-gray-500">{{ album.user?.email || '' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(album.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ album.track_count || 0 }} tracks
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                  <button
                    class="text-indigo-600 hover:text-indigo-900"
                    @click="editAlbum(album)"
                  >
                    <UIcon name="i-heroicons-pencil"/>
                  </button>
                  <button
                    class="text-red-600 hover:text-red-900"
                    @click="confirmDeleteAlbum(album)"
                  >
                    <UIcon name="i-heroicons-trash"/>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-6 flex justify-center">
      <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
        <button
          :disabled="currentPage === 1"
          class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="changePage(currentPage - 1)"
        >
          <UIcon name="i-heroicons-chevron-left"/>
        </button>
        <button
          v-for="page in visiblePages"
          :key="page"
          :class="[
            'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
            page === currentPage
              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
          ]"
          @click="changePage(page)"
        >
          {{ page }}
        </button>
        <button
          :disabled="currentPage === totalPages"
          class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="changePage(currentPage + 1)"
        >
          <UIcon name="i-heroicons-chevron-right"/>
        </button>
      </nav>
    </div>

    <!-- Add Album Modal -->
    <div v-if="showAddAlbumModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-6 animate-fade-in">
        <!-- Заголовок -->
        <header>
          <h3 class="text-xl font-semibold text-gray-900">Add New Album</h3>
        </header>

        <!-- Форма -->
        <main>
          <form class="space-y-4" @submit.prevent="addAlbum">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                  v-model="newAlbum.title"
                  type="text"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Album title"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                  v-model="newAlbum.description"
                  rows="3"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Album description (optional)"
              />
            </div>

            <!-- Cover image upload -->
            <div>
              <label for="cover" class="block text-sm font-medium text-gray-700">Cover Image (Optional)</label>
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

            <div>
              <input
                  v-model="userSearch"
                  type="text"
                  placeholder="Search user..."
                  class="w-full border border-gray-300 rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >

              <select
                  v-model="newAlbum.user_id"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select user</option>
                <option
                    v-for="user in filteredUsers"
                    :key="user.id"
                    :value="user.id"
                >
                  {{ user.username }} ({{ user.email }})
                </option>
              </select>

            </div>
          </form>
        </main>

        <!-- Кнопки -->
        <footer class="flex justify-end space-x-3 pt-2">
          <UButton color="gray" variant="ghost" @click="showAddAlbumModal = false">
            Cancel
          </UButton>
          <UButton color="gray" :loading="adding" @click="addAlbum">
            Add Album
          </UButton>
        </footer>
      </div>
    </div>

    <!-- Edit Album Modal -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-6 animate-fade-in">
        <header>
          <h3 class="text-xl font-semibold text-gray-900">Edit Album</h3>
        </header>
        <main>
          <form class="space-y-4" @submit.prevent="updateAlbum">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                  v-model="editingAlbum.title"
                  type="text"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Album title"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                  v-model="editingAlbum.description"
                  rows="3"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Album description (optional)"
              />
            </div>
            <div>
              <input
                  v-model="userSearch"
                  type="text"
                  placeholder="Search user..."
                  class="w-full border border-gray-300 rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >

              <select
                  v-model="editingAlbum.user_id"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select user</option>
                <option
                    v-for="user in filteredUsers"
                    :key="user.id"
                    :value="user.id"
                >
                  {{ user.username }} ({{ user.email }})
                </option>
              </select>

            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cover URL</label>
              <input
                  v-model="editingAlbum.cover_url"
                  type="url"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/cover.jpg"
              >
            </div>
          </form>
        </main>

        <!-- Кнопки -->
        <footer class="flex justify-end space-x-3 pt-2">
          <UButton color="gray" variant="ghost" @click="showEditModal = false">
            Cancel
          </UButton>
          <UButton
              color="gray"
              variant="solid"
              :loading="updating"
              @click="updateAlbum"
          >
            Update Album
          </UButton>
        </footer>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-6 animate-fade-in">
        <!-- Заголовок -->
        <header>
          <h3 class="text-xl font-semibold text-gray-900">Delete Album</h3>
        </header>

        <!-- Текст -->
        <main>
          <p class="text-gray-700">
            Are you sure you want to delete the album
            <strong>"{{ deletingAlbum?.title }}"</strong>?<br >
            This action cannot be undone and will also remove all tracks associated with this album.
          </p>
        </main>

        <!-- Кнопки -->
        <footer class="flex justify-end space-x-3 pt-2">
          <UButton color="gray" variant="ghost" @click="showDeleteModal = false">
            Cancel
          </UButton>
          <UButton
              color="red"
              :loading="deleting"
              @click="deleteAlbum"
          >
            Delete Album
          </UButton>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type {Album} from "@/types/global";

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
});

const supabase = useSupabaseClient();
const toast = useToast();

// Состояния
const albums = ref<Album>([]);
const users = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = 10;
const totalAlbums = ref(0);
const totalPages = computed(() => Math.ceil(totalAlbums.value / pageSize));

// Модалки
const showAddAlbumModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);

// Новая обложка
const coverPreview = ref<string | null>(null);
const coverFile = ref<File | null>(null);

const newAlbum = ref({
  title: '',
  description: '',
  cover_url: '',
  user_id: ''
});
const adding = ref(false);

// Редактирование
const editingAlbum = ref({});
const updating = ref(false);

// Удаление
const deletingAlbum = ref(null);
const deleting = ref(false);

// Форматирование
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
const visiblePages = computed(() => {
  const pages = [];
  const start = Math.max(1, currentPage.value - 2);
  const end = Math.min(totalPages.value, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});
const debounce = (fn: any, delay: number) => {
  let timeout;
  return (...args: []) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};
const debouncedSearch = debounce(() => {
  currentPage.value = 1;
  fetchAlbums();
}, 300);

// === Загрузка обложки ===
const onCoverChange = (event: Event) => {
  const file = (event.target as HTMLInputElement)?.files?.[0];
  if (!file) return;

  coverFile.value = file;
  const reader = new FileReader();
  reader.onload = () => {
    coverPreview.value = reader.result as string;
  };
  reader.readAsDataURL(file);
};

const userSearch = ref('')

const filteredUsers = computed(() =>
    users.value.filter((user) => {
      const query = userSearch.value.toLowerCase()
      return (
          user.username?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
      )
    })
)


const uploadCover = async (): Promise<string | null> => {
  if (!coverFile.value) return null;

  const fileExt = coverFile.value.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const { error: uploadError } = await supabase
      .storage
      .from('covers')
      .upload(fileName, coverFile.value);

  if (uploadError) {
    console.error('Upload error:', uploadError.message);
    toast.add({
      title: 'Error',
      description: 'Failed to upload cover image',
      color: 'error'
    });
    return null;
  }

  const { data } = supabase
      .storage
      .from('covers')
      .getPublicUrl(fileName);

  return data.publicUrl;
};

// === CRUD ===
const fetchAlbums = async () => {
  loading.value = true;
  try {
    let query = supabase
        .from('albums')
        .select(`*, profiles!inner(username, email, id)`)
        .order('created_at', { ascending: false });

    if (searchQuery.value) query = query.ilike('title', `%${searchQuery.value}%`);

    const from = (currentPage.value - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await query;
    if (error) throw error;

    const withCounts = await Promise.all((data || []).map(async (album) => {
      const { count } = await supabase
          .from('tracks')
          .select('*', { count: 'exact', head: true })
          .eq('album_id', album.id);
      return { ...album, track_count: count || 0 };
    }));

    albums.value = withCounts;
    totalAlbums.value = withCounts.length; // можно заменить count при необходимости
  } catch (err) {
    console.error(err);
    toast.add({ title: 'Error', description: 'Failed to load albums', color: 'error' });
  } finally {
    loading.value = false;
  }
};

const fetchUsers = async () => {
  const { data, error } = await supabase.from('profiles').select('id, username, email').order('email');
  if (error) return console.error(error);
  users.value = data || [];
};

const addAlbum = async () => {
  if (!newAlbum.value.title || !newAlbum.value.user_id) {
    return toast.add({ title: 'Error', description: 'Please fill in all required fields', color: 'error' });
  }

  adding.value = true;
  try {
    let coverUrl = '';
    if (coverFile.value) {
      const uploaded = await uploadCover();
      if (uploaded) coverUrl = uploaded;
    }

    const { error } = await supabase
        .from('albums')
        .insert([{
          title: newAlbum.value.title,
          description: newAlbum.value.description,
          cover_url: coverUrl,
          user_id: newAlbum.value.user_id
        }]);

    if (error) throw error;

    toast.add({ title: 'Success', description: 'Album added successfully', color: 'success' });

    showAddAlbumModal.value = false;
    newAlbum.value = { title: '', description: '', cover_url: '', user_id: '' };
    coverFile.value = null;
    coverPreview.value = null;

    await fetchAlbums();
  } catch (err) {
    console.error(err);
    toast.add({ title: 'Error', description: 'Failed to add album', color: 'error' });
  } finally {
    adding.value = false;
  }
};

const editAlbum = (album: Album) => {
  editingAlbum.value = { ...album };
  showEditModal.value = true;
};

const updateAlbum = async () => {
  if (!editingAlbum.value.title) {
    toast.add({ title: 'Error', description: 'Title is required', color: 'error' });
    return;
  }

  updating.value = true;
  try {
    const { error } = await supabase
        .from('albums')
        .update({
          title: editingAlbum.value.title,
          description: editingAlbum.value.description,
          cover_url: editingAlbum.value.cover_url
        })
        .eq('id', editingAlbum.value.id);

    if (error) throw error;

    toast.add({ title: 'Success', description: 'Album updated', color: 'success' });
    showEditModal.value = false;
    await fetchAlbums();
  } catch (err) {
    console.error(err);
    toast.add({ title: 'Error', description: 'Update failed', color: 'error' });
  } finally {
    updating.value = false;
  }
};

const confirmDeleteAlbum = (album: Album) => {
  deletingAlbum.value = album;
  showDeleteModal.value = true;
};

const deleteAlbum = async () => {
  deleting.value = true;
  try {
    const { error: trackError } = await supabase.from('tracks').update({ album_id: null }).eq('album_id', deletingAlbum.value.id);
    if (trackError) throw trackError;

    const { error } = await supabase.from('albums').delete().eq('id', deletingAlbum.value.id);
    if (error) throw error;

    toast.add({ title: 'Success', description: 'Album deleted', color: 'success' });
    showDeleteModal.value = false;
    deletingAlbum.value = null;
    await fetchAlbums();
  } catch (err) {
    console.error(err);
    toast.add({ title: 'Error', description: 'Deletion failed', color: 'error' });
  } finally {
    deleting.value = false;
  }
};

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchAlbums();
  }
};

onMounted(async () => {
  await Promise.all([fetchAlbums(), fetchUsers()]);
});
</script>

