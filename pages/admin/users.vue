<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">User Management</h1>
      <button 
        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        @click="showAddUserModal = true"
      >
        <UIcon name="i-heroicons-plus" class="mr-2"/>
        Add User
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
            v-model="userSearchStore.query"
            type="text"
            placeholder="Search users..."
            class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @input="debouncedSearch"
          >
        </div>
        <div class="md:w-1/4">
          <select
            v-model="filters.role"
            class="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @change="fetchUsers"
          >
            <option v-for="option in roleOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="flex-grow"/>
        <button
          class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          @click="fetchUsers"
        >
          <UIcon name="i-heroicons-arrow-path" class="mr-2" :class="{ 'animate-spin': loading }"/>
          Refresh
        </button>
      </div>
    </div>

    <!-- Users table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="loading" class="py-8 text-center">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 mx-auto text-gray-400"/>
        <p class="mt-2 text-gray-500">Loading users...</p>
      </div>
      <div v-else-if="users.length === 0" class="py-8 text-center">
        <UIcon name="i-heroicons-user-slash" class="h-12 w-12 mx-auto text-gray-400"/>
        <p class="mt-2 text-gray-500">No users found</p>
        <button 
          class="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          @click="fetchUsers"
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
          <tr v-for="row in users" :key="row.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.id }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ row.username }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.email }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.full_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span 
                :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  row.is_admin 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
                ]"
              >
                {{ row.is_admin ? 'Admin' : 'User' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.created_at }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div class="flex space-x-2 justify-end">
                <button
                  class="p-1 rounded-md text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  @click="editUser(row)"
                >
                  <UIcon name="i-heroicons-pencil-square" class="h-4 w-4"/>
                </button>
                <button
                  :class="[
                    'p-1 rounded-md hover:bg-opacity-10 focus:outline-none focus:ring-2',
                    row.is_admin 
                      ? 'text-amber-600 hover:bg-amber-100 focus:ring-amber-500' 
                      : 'text-green-600 hover:bg-green-100 focus:ring-green-500'
                  ]"
                  @click="toggleAdminStatus(row)"
                >
                  <UIcon
                    :name="row.is_admin ? 'i-heroicons-user-minus' : 'i-heroicons-user-plus'"
                    class="h-4 w-4"/>
                </button>
                <UButton
                  class="p-1 rounded-md text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  @click="confirmDeleteUser(row)"
                >
                  <UIcon name="i-heroicons-trash" class="h-4 w-4"/>
                </UButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div class="flex justify-between items-center">
          <p class="text-sm text-gray-500">
            Showing {{ users.length }} of {{ totalUsers }} users
          </p>
          <div class="flex items-center gap-1">
            <button
              v-for="page in totalPages"
              :key="page"
              :class="[
                'px-3 py-1 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              ]"
              @click="currentPage = page; fetchUsers()"
            >
              {{ page }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <!-- <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="showEditModal = false"></div> -->

        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex justify-between items-center pb-3 border-b">
              <h3 id="modal-title" class="text-lg font-medium text-gray-900">Edit User</h3>
              <button class="text-gray-400 hover:text-gray-500" @click="showEditModal = false">
                <UIcon name="i-heroicons-x-mark" class="h-6 w-6"/>
              </button>
            </div>
            <div class="space-y-4 mt-4">
              <div>
                <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                <input 
                  id="username" 
                  v-model="editingUser.username" 
                  type="text" 
                  placeholder="Username" 
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                <input 
                  id="email" 
                  v-model="editingUser.email" 
                  type="email" 
                  placeholder="Email" 
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
              <div>
                <label for="full_name" class="block text-sm font-medium text-gray-700">Full Name</label>
                <input 
                  id="full_name" 
                  v-model="editingUser.full_name" 
                  type="text" 
                  placeholder="Full Name" 
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
              <div>
                <div class="flex items-center">
                  <label for="is_admin" class="block text-sm font-medium text-gray-700 mr-2">Admin Status</label>
                  <label class="inline-flex items-center cursor-pointer">
                    <input 
                      id="is_admin" 
                      v-model="editingUser.is_admin" 
                      type="checkbox" 
                      class="sr-only"
                    >
                    <div class="relative">
                      <div class="block bg-gray-300 w-10 h-6 rounded-full"/>
                      <div 
                        :class="[
                          'absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform',
                          editingUser.is_admin ? 'transform translate-x-4 bg-blue-600' : ''
                        ]"
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button 
              type="button" 
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              @click="updateUser"
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

    <!-- Add User Modal -->
    <div v-if="showAddUserModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <!-- <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="showAddUserModal = false"></div> -->

        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex justify-between items-center pb-3 border-b">
              <h3 id="modal-title" class="text-lg font-medium text-gray-900">Add New User</h3>
              <button class="text-gray-400 hover:text-gray-500" @click="showAddUserModal = false">
                <UIcon name="i-heroicons-x-mark" class="h-6 w-6"/>
              </button>
            </div>
            <div class="space-y-4 mt-4">
              <div>
                <label for="new-email" class="block text-sm font-medium text-gray-700">Email <span class="text-red-500">*</span></label>
                <input 
                  id="new-email" 
                  v-model="newUser.email" 
                  type="email" 
                  placeholder="Email" 
                  required
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
              <div>
                <label for="new-password" class="block text-sm font-medium text-gray-700">Password <span class="text-red-500">*</span></label>
                <input 
                  id="new-password" 
                  v-model="newUser.password" 
                  type="password" 
                  placeholder="Password" 
                  required
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
              <div>
                <label for="new-username" class="block text-sm font-medium text-gray-700">Username</label>
                <input 
                  id="new-username" 
                  v-model="newUser.username" 
                  type="text" 
                  placeholder="Username" 
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
              <div>
                <label for="new-full-name" class="block text-sm font-medium text-gray-700">Full Name</label>
                <input 
                  id="new-full-name" 
                  v-model="newUser.full_name" 
                  type="text" 
                  placeholder="Full Name" 
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
              <div>
                <div class="flex items-center">
                  <label for="new-is-admin" class="block text-sm font-medium text-gray-700 mr-2">Admin Status</label>
                  <label class="inline-flex items-center cursor-pointer">
                    <input 
                      id="new-is-admin" 
                      v-model="newUser.is_admin" 
                      type="checkbox" 
                      class="sr-only"
                    >
                    <div class="relative">
                      <div class="block bg-gray-300 w-10 h-6 rounded-full"/>
                      <div 
                        :class="[
                          'absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform',
                          newUser.is_admin ? 'transform translate-x-4 bg-blue-600' : ''
                        ]"
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button 
              type="button" 
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              @click="addUser"
            >
              <UIcon v-if="adding" name="i-heroicons-arrow-path" class="animate-spin mr-2"/>
              Add User
            </button>
            <button 
              type="button" 
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              @click="showAddUserModal = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <!-- <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="showDeleteModal = false"></div> -->

        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex justify-between items-center pb-3 border-b">
              <h3 id="modal-title" class="text-lg font-medium text-gray-900">Confirm Delete</h3>
              <button class="text-gray-400 hover:text-gray-500" @click="showDeleteModal = false">
                <UIcon name="i-heroicons-x-mark" class="h-6 w-6"/>
              </button>
            </div>
            <div class="mt-4">
              <p>Are you sure you want to delete the user <strong>{{ deletingUser?.username || deletingUser?.email }}</strong>?</p>
              <p class="text-red-500 mt-2">This action cannot be undone.</p>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button 
              type="button" 
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              @click="deleteUser"
            >
              <UIcon v-if="deleting" name="i-heroicons-arrow-path" class="animate-spin mr-2"/>
              Delete User
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
import { useUserSearchStore } from '~/stores/userSearchStore';
import type {Profile} from "@/types/global";

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
});

const supabase = useSupabaseClient();
const session = await supabase.auth.getSession()
const access_token = session.data.session?.access_token
const toast = useToast();
const userSearchStore = useUserSearchStore();

// Table columns
const columns = [
  { id: 'id', key: 'id', title: 'ID' },
  { id: 'username', key: 'username', title: 'Username' },
  { id: 'email', key: 'email', title: 'Email' },
  { id: 'full_name', key: 'full_name', title: 'Full Name' },
  { id: 'role', key: 'role', title: 'Role' },
  { id: 'created_at', key: 'created_at', title: 'Joined' },
  { id: 'actions', key: 'actions', title: 'Actions' }
];

// Pagination
const currentPage = ref(1);
const pageSize = 10;
const totalUsers = ref(0);
const totalPages = computed(() => Math.ceil(totalUsers.value / pageSize));

// Users data
const users = ref<Profile[]>([]);
const loading = ref(true);

// Filters
const filters = ref({
  role: null
});

const roleOptions = [
  { label: 'All Users', value: null },
  { label: 'Admins', value: 'admin' },
  { label: 'Regular Users', value: 'user' }
];

// Modals
const showEditModal = ref(false);
const showAddUserModal = ref(false);
const showDeleteModal = ref(false);

// User editing
const editingUser = ref({});
const updating = ref(false);

// User adding
const newUser = ref({
  email: '',
  password: '',
  username: '',
  full_name: '',
  is_admin: false
});
const adding = ref(false);

// User deleting
const deletingUser = ref(null);
const deleting = ref(false);

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
  await userSearchStore.searchUsers(supabase);
  await fetchUsers();
}, 300);

// Fetch users
const fetchUsers = async () => {
  try {
    // If there's a search query, use the results from userSearchStore
    if (userSearchStore.query.trim()) {
      // Use the store's loading state
      loading.value = userSearchStore.isLoading;

      // Filter search results by role if needed
      let filteredResults = [...userSearchStore.results];

      if (filters.value.role === 'admin') {
        filteredResults = filteredResults.filter(user => user.is_admin);
      } else if (filters.value.role === 'user') {
        filteredResults = filteredResults.filter(user => !user.is_admin);
      }

      // Apply pagination to filtered results
      totalUsers.value = filteredResults.length;
      const from = (currentPage.value - 1) * pageSize;
      const to = Math.min(from + pageSize, filteredResults.length);

      // Map the results to match our expected format
      users.value = filteredResults.slice(from, to).map(user => ({
        id: user.id,
        username: user.username || 'No username',
        email: user.email || 'No email',
        full_name: user.full_name || '-',
        is_admin: user.is_admin || false,
        role: user.is_admin ? 'Admin' : 'User',
        created_at: new Date(user.created_at).toLocaleDateString()
      }));
    } else {
      // If no search query, fetch all users with filters as before
      loading.value = true;

      let query = supabase
          .from('profiles')
          .select('*', { count: 'exact' });

      // Apply role filter
      if (filters.value.role === 'admin') {
        query = query.eq('is_admin', true);
      } else if (filters.value.role === 'user') {
        query = query.eq('is_admin', false);
      }

      // Apply pagination
      const from = (currentPage.value - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      users.value = data.map(user => ({
        id: user.id,
        username: user.username || 'No username',
        email: user.email || 'No email',
        full_name: user.full_name || '-',
        is_admin: user.is_admin || false,
        role: user.is_admin ? 'Admin' : 'User',
        created_at: new Date(user.created_at).toLocaleDateString()
      }));

      totalUsers.value = count || 0;
    }
  } catch (err) {
    console.error('Error fetching users:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to load users',
      color: 'error'
    });
  } finally {
    // Only set loading to false if we're not using the store's loading state
    if (!userSearchStore.query.trim()) {
      loading.value = false;
    }
  }
};


// Edit user
const editUser = (user) => {
  editingUser.value = { ...user };
  showEditModal.value = true;
};

// Update user
const updateUser = async () => {
  updating.value = true;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        username: editingUser.value.username,
        full_name: editingUser.value.full_name,
        is_admin: editingUser.value.is_admin
      })
      .eq('id', editingUser.value.id);

    if (error) throw error;

    toast.add({
      title: 'Success',
      description: 'User updated successfully',
      color: 'green'
    });

    showEditModal.value = false;
    await fetchUsers();
  } catch (err) {
    console.error('Error updating user:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to update user',
      color: 'error'
    });
  } finally {
    updating.value = false;
  }
};

// Add user
const addUser = async () => {
  if (!newUser.value.email || !newUser.value.password) {
    toast.add({
      title: 'Error',
      description: 'Email and password are required',
      color: 'error'
    });
    return;
  }

  adding.value = true;

  try {
    const response = await $fetch('/api/v1/users/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`
      },
      body: {
        email: newUser.value.email,
        password: newUser.value.password,
        username: newUser.value.username
      }
    })

    if (response.error) {
      console.error('Registration error:', response.error)
    } else if (!response.user) {
      toast.add({
        title: 'Error',
        description: response.body?.error || 'User creation failed',
        color: 'error'
      });
      adding.value = false;
      return;
    } else {
      console.log('User created:', response.user)
    }

    // Create profile in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        username: newUser.value.username,
        full_name: newUser.value.full_name,
        is_admin: newUser.value.is_admin
      })
      .eq('id', response.user.id);

    if (profileError) throw profileError;

    toast.add({
      title: 'Success',
      description: 'User added successfully',
      color: 'green'
    });

    // Reset form and close modal
    newUser.value = {
      email: '',
      password: '',
      username: '',
      full_name: '',
      is_admin: false
    };

    showAddUserModal.value = false;
    await fetchUsers();
  } catch (err) {
    console.error('Error adding user:', err);
    toast.add({
      title: 'Error',
      description: err.message || 'Failed to add user',
      color: 'error'
    });
  } finally {
    adding.value = false;
  }
};

// Confirm delete user
const confirmDeleteUser = (user) => {
  deletingUser.value = user;
  showDeleteModal.value = true;
};

// Delete user
const deleteUser = async () => {
  if (!deletingUser.value) return;

  deleting.value = true;

  try {
    // Delete user from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(
      deletingUser.value.id
    );

    if (authError) throw authError;

    toast.add({
      title: 'Success',
      description: 'User deleted successfully',
      color: 'green'
    });

    showDeleteModal.value = false;
    await fetchUsers();
  } catch (err) {
    console.error('Error deleting user:', err);
    toast.add({
      title: 'Error',
      description: err.message || 'Failed to delete user',
      color: 'error'
    });
  } finally {
    deleting.value = false;
    deletingUser.value = null;
  }
};

// Toggle admin status
const toggleAdminStatus = async (user) => {
  try {
    const newStatus = !user.is_admin;

    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: newStatus })
      .eq('id', user.id);

    if (error) throw error;

    toast.add({
      title: 'Success',
      description: `User ${newStatus ? 'promoted to admin' : 'demoted to regular user'}`,
      color: 'green'
    });

    await fetchUsers();
  } catch (err) {
    console.error('Error updating admin status:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to update user status',
      color: 'error'
    });
  }
};

// Fetch users on a component mount
onMounted(() => {
  fetchUsers();
});
</script>
