<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Track Management</h1>
      <button 
        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        @click="showAddTrackModal = true"
      >
        <span class="i-heroicons-plus mr-2"></span>
        Add Track
      </button>

    </div>

    <!-- Search and filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="relative md:w-1/3">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3">
            <span class="i-heroicons-magnifying-glass text-gray-400"></span>
          </span>
          <input
            v-model="searchStore.query"
            type="text"
            placeholder="Search tracks..."
            class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @input="debouncedSearch"
          />
        </div>
        <div class="flex-grow"></div>
        <button
          class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          @click="fetchTracks"
        >
          <span class="i-heroicons-arrow-path mr-2" :class="{ 'animate-spin': loading }"></span>
          Refresh
        </button>
      </div>
    </div>

    <!-- Tracks table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="loading" class="py-8 text-center">
        <span class="i-heroicons-arrow-path animate-spin h-8 w-8 mx-auto text-gray-400"></span>
        <p class="mt-2 text-gray-500">Loading tracks...</p>
      </div>
      <div v-else-if="tracks.length === 0" class="py-8 text-center">
        <span class="i-heroicons-musical-note h-12 w-12 mx-auto text-gray-400"></span>
        <p class="mt-2 text-gray-500">No tracks found</p>
        <button
          class="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          @click="fetchTracks"
        >
          Reset Filters
        </button>
      </div>
      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th v-for="column in columns" :key="column.id" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {{ column.title }}
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="row in tracks" :key="row.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.id }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                  <img
                    :src="row.cover_url || 'https://via.placeholder.com/40x40?text=No+Cover'"
                    class="h-10 w-10 rounded-md object-cover"
                    alt="Track cover"
                  />
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900">{{ row.title }}</div>
                  <div class="text-sm text-gray-500">
                    <span v-if="row.track_authors && row.track_authors.length">
                      <span v-for="(rel, index) in row.track_authors" :key="rel.author.id">
                        {{ rel.author.name }}<span v-if="index < row.track_authors.length - 1">, </span>
                      </span>
                    </span>
                    <span v-else>Unknown Artist</span>
                  </div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(row.created_at) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.play_count || 0 }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div class="flex space-x-2 justify-end">
                <button
                  class="p-1 rounded-md text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  @click="editTrack(row)"
                >
                  <UIcon name="i-heroicons-pencil-square" class="text-black h-4 w-4"/>
                </button>
                <button
                  class="p-1 rounded-md text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  @click="confirmDeleteTrack(row)"
                >
                  <UIcon name="i-heroicons-trash" class="text-black h-4 w-4"/>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div class="flex justify-between items-center">
          <p class="text-sm text-gray-500">
            Showing {{ tracks.length }} of {{ totalTracks }} tracks
          </p>
          <div class="flex items-center gap-1">
            <button
              v-for="page in totalPages"
              :key="page"
              @click="currentPage = page; fetchTracks()"
              :class="[
                'px-3 py-1 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              ]"
            >
              {{ page }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Track Modal -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 overflow-y-auto text-black" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen z-75 pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <!-- <div class="fixed inset-0 bg-opacity-75 transition-opacity z-50" aria-hidden="true" @click="showEditModal = false"></div> -->


        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex justify-between items-center pb-3 border-b">
              <h3 class="text-lg font-medium text-gray-900" id="modal-title">Edit Track</h3>
              <button class="text-gray-400 hover:text-gray-500" @click="showEditModal = false">
                <UIcon name="i-heroicons-x-mark" class="h-6 w-6"/>
              </button>
            </div>
            <div class="space-y-4 mt-4">
              <div>
                <label for="title" class="block text-sm font-medium text-gray-700">Title</label>
                <input
                  id="title"
                  v-model="editingTrack.title"
                  type="text"
                  placeholder="Track title"
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label for="cover_url" class="block text-sm font-medium text-gray-700">Cover URL</label>
                <input
                  id="cover_url"
                  v-model="editingTrack.cover_url"
                  type="text"
                  placeholder="Cover image URL"
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div v-if="editingTrack.cover_url" class="mt-2">
                <img
                  :src="editingTrack.cover_url"
                  alt="Cover preview"
                  class="h-24 w-24 object-cover rounded-md"
                />
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              @click="updateTrack"
            >
              <UIcon v-if="updating" name="i-heroicons-arrow-path" class="animate-spin mr-2"/>
              Save Changes
            </button>
            <button
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              @click="showEditModal = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Track Modal -->
    <div v-if="showAddTrackModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen z-75 pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <!-- <div class="fixed inset-0 bg-opacity-75 z-50 transition-opacity" aria-hidden="true" @click="showAddTrackModal = false"></div> -->

        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex justify-between items-center pb-3 border-b">
              <h3 class="text-lg font-medium text-gray-900" id="modal-title">Add New Track</h3>
              <button class="text-gray-400 hover:text-gray-500" @click="showAddTrackModal = false">
                <UIcon name="i-heroicons-x-mark" class="h-6 w-6"/>
              </button>
            </div>
            <div class="space-y-4 mt-4">
              <div>
                <label for="new-title" class="block text-sm font-medium text-gray-700">Title <span class="text-red-500">*</span></label>
                <input
                  id="new-title"
                  v-model="newTrack.title"
                  type="text"
                  placeholder="Track title"
                  required
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <AuthorPicker
                  v-model="newTrack.track_authors"
                />
              </div>
              <div>
                <label for="new-cover-url" class="block text-sm font-medium text-gray-700">Cover URL</label>
                <input
                  id="new-cover-url"
                  v-model="newTrack.cover_url"
                  type="text"
                  placeholder="Cover image URL"
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div v-if="newTrack.cover_url" class="mt-2">
                <img
                  :src="newTrack.cover_url"
                  alt="Cover preview"
                  class="h-24 w-24 object-cover rounded-md"
                />
              </div>
              <div>
                <label for="new-audio-url" class="block text-sm font-medium text-gray-700">Audio URL <span class="text-red-500">*</span></label>
                <input
                  id="new-audio-url"
                  v-model="newTrack.audio_url"
                  type="text"
                  placeholder="Audio file URL"
                  required
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              @click="saveTrack"
            >
              <span v-if="adding" class="i-heroicons-arrow-path animate-spin mr-2"></span>
              Add Track
            </button>
            <button
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              @click="showAddTrackModal = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen z-75 pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <!-- <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="showDeleteModal = false"></div> -->

        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex justify-between items-center pb-3 border-b">
              <h3 class="text-lg font-medium text-gray-900" id="modal-title">Confirm Delete</h3>
              <button class="text-gray-400 hover:text-gray-500" @click="showDeleteModal = false">
                <span class="i-heroicons-x-mark h-6 w-6"></span>
              </button>
            </div>
            <div class="mt-4">
              <p>Are you sure you want to delete the track <strong>{{ deletingTrack?.title }}</strong>?</p>
              <p class="text-red-500 mt-2">This action cannot be undone.</p>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              @click="deleteTrack"
            >
              <span v-if="deleting" class="i-heroicons-arrow-path animate-spin mr-2"></span>
              Delete Track
            </button>
            <button
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              @click="showDeleteModal = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSearchStore } from '~/stores/searchStore';
import type {Track} from "@/types/global";
import AuthorPicker from "@/components/AuthorPicker.vue";
import type { SupabaseClient } from '@supabase/supabase-js';

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
});

const supabase:SupabaseClient<Database> = useSupabaseClient();
const toast = useToast();
const searchStore = useSearchStore();

// Table columns
const columns = [
  { id: 'id', key: 'id', title: 'ID' },
  { id: 'track', key: 'track', title: 'Track' },
  { id: 'created_at', key: 'created_at', title: 'Created' },
  { id: 'play_count', key: 'play_count', title: 'Plays' },
  { id: 'actions', key: 'actions', title: 'Actions' }
];

// Pagination
const currentPage = ref(1);
const pageSize = 10;
const totalTracks = ref(0);
const totalPages = computed(() => Math.ceil(totalTracks.value / pageSize));

// Tracks data
const tracks = ref<Track[]>([]);
const loading = ref(true);

// Modals
const showEditModal = ref(false);
const showAddTrackModal = ref(false);
const showDeleteModal = ref(false);

// Track editing
const editingTrack = ref<Track>({});
const updating = ref(false);

// Track adding
const newTrack = ref<Track>({
  title: '',
  audio_url: '',
  cover_url: '',
  user_id: '',
  track_authors: [] as { id: string; name: string }[]
});
const adding = ref(false);

// Track deleting
const deletingTrack = ref(null);
const deleting = ref(false);

// Format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

// Custom debounce function
const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

// Debounced search
const debouncedSearch = debounce(async () => {
  currentPage.value = 1;
  await searchStore.searchTracks(supabase);
  await fetchTracks();
}, 300);

// Fetch tracks
const fetchTracks = async () => {
  try {
    // If there's a search query, use the results from searchStore
    if (searchStore.query.trim()) {
      // Use the store's loading state
      loading.value = searchStore.isLoading;

      // Apply pagination to filtered results
      totalTracks.value = searchStore.results.length;
      const from = (currentPage.value - 1) * pageSize;
      const to = Math.min(from + pageSize, searchStore.results.length);

      // Map the results to match our expected format
      tracks.value = searchStore.results.slice(from, to);
    } else {
      // If no search query, fetch all tracks
      loading.value = true;

      let query = supabase
          .from('tracks')
          .select(`
            *,
            track_authors (
              *,
              author:authors(*)
            )
          `, { count: 'exact' });

      // Apply pagination
      const from = (currentPage.value - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      tracks.value = data;
      totalTracks.value = count || 0;
    }
  } catch (err) {
    console.error('Error fetching tracks:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to load tracks',
      color: 'error'
    });
  } finally {
    // Only set loading to false if we're not using the store's loading state
    if (!searchStore.query.trim()) {
      loading.value = false;
    }
  }
};

// Edit track
const editTrack = (track) => {
  editingTrack.value = { ...track };
  showEditModal.value = true;
};

// Update track
const updateTrack = async () => {
  updating.value = true;

  try {
    const { error } = await supabase
      .from('tracks')
      .update({
        title: editingTrack.value.title,
        cover_url: editingTrack.value.cover_url
      })
      .eq('id', editingTrack.value.id);

    if (error) throw error;

    toast.add({
      title: 'Success',
      description: 'Track updated successfully',
      color: 'green'
    });

    showEditModal.value = false;
    await fetchTracks();
  } catch (err) {
    console.error('Error updating track:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to update track',
      color: 'error'
    });
  } finally {
    updating.value = false;
  }
};

// Add track
const saveTrack = async () => {
  if (!newTrack.value.title || !newTrack.value.audio_url) {
    toast.add({
      title: 'Error',
      description: 'Title and audio URL are required',
      color: 'error'
    });
    return;
  }

  adding.value = true;

  try {
    const { data: trackData, error } = await supabase
        .from('tracks')
        .insert({
          title: newTrack.value.title,
          cover_url: newTrack.value.cover_url,
          audio_url: newTrack.value.audio_url,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

    if (error) throw error;

    const trackId = trackData.id;

    const relations = newTrack.value.track_authors.map((author, idx) => ({
      track_id: trackId,
      author_id: author.id,
      order_index: idx
    }))

    const { error: relError } = await supabase
        .from('track_authors')
        .insert(relations)

    if (relError) throw relError;

    toast.add({
      title: 'Success',
      description: 'Track added successfully',
      color: 'green'
    });

    // Reset form and close modal
    newTrack.value = {
      title: '',
      cover_url: '',
      audio_url: ''
    };

    showAddTrackModal.value = false;
    await fetchTracks();
  } catch (err) {
    console.error('Error adding track:', err);
    toast.add({
      title: 'Error',
      description: err.message || 'Failed to add track',
      color: 'error'
    });
  } finally {
    adding.value = false;
  }
};

// Confirm delete track
const confirmDeleteTrack = (track) => {
  deletingTrack.value = track;
  showDeleteModal.value = true;
};

// Delete track
const deleteTrack = async () => {
  if (!deletingTrack.value) return;

  deleting.value = true;

  try {
    // Delete track
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', deletingTrack.value.id);

    if (error) throw error;

    toast.add({
      title: 'Success',
      description: 'Track deleted successfully',
      color: 'green'
    });

    showDeleteModal.value = false;
    await fetchTracks();
  } catch (err) {
    console.error('Error deleting track:', err);
    toast.add({
      title: 'Error',
      description: err.message || 'Failed to delete track',
      color: 'error'
    });
  } finally {
    deleting.value = false;
    deletingTrack.value = null;
  }
};

// Fetch tracks on component mount
onMounted(() => {
  fetchTracks();
});
</script>
