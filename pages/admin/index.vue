<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Admin Dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Stats Cards -->
      <UCard>
        <template #header>
          <div class="flex items-center">
            <div class="p-2 rounded-full bg-blue-100 mr-3">
              <UIcon name="i-heroicons-users" class="text-blue-500 w-6 h-6" />
            </div>
            <h3 class="text-lg font-medium">Users</h3>
          </div>
        </template>
        <div class="text-3xl font-bold">{{ stats.users }}</div>
        <template #footer>
          <UButton to="/admin/users" size="sm" color="blue" variant="ghost" class="w-full">
            Manage Users
          </UButton>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center">
            <div class="p-2 rounded-full bg-purple-100 mr-3">
              <UIcon name="i-heroicons-musical-note" class="text-purple-500 w-6 h-6" />
            </div>
            <h3 class="text-lg font-medium">Tracks</h3>
          </div>
        </template>
        <div class="text-3xl font-bold">{{ stats.tracks }}</div>
        <template #footer>
          <UButton to="/admin/tracks" size="sm" color="purple" variant="ghost" class="w-full">
            Manage Tracks
          </UButton>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center">
            <div class="p-2 rounded-full bg-green-100 mr-3">
              <UIcon name="i-heroicons-queue-list" class="text-green-500 w-6 h-6" />
            </div>
            <h3 class="text-lg font-medium">Playlists</h3>
          </div>
        </template>
        <div class="text-3xl font-bold">{{ stats.playlists }}</div>
        <template #footer>
          <UButton to="/admin/playlists" size="sm" color="green" variant="ghost" class="w-full">
            Manage Playlists
          </UButton>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center">
            <div class="p-2 rounded-full bg-amber-100 mr-3">
              <UIcon name="i-heroicons-arrow-path" class="text-amber-500 w-6 h-6" />
            </div>
            <h3 class="text-lg font-medium">Activity</h3>
          </div>
        </template>
        <div class="text-3xl font-bold">{{ stats.activity }}</div>
        <template #footer>
          <UButton size="sm" color="amber" variant="ghost" class="w-full">
            View Activity
          </UButton>
        </template>
      </UCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Users -->
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium">Recent Users</h3>
            <UButton to="/admin/users" size="xs" color="gray" variant="ghost">
              View All
            </UButton>
          </div>
        </template>
        <div v-if="loading.users" class="py-4 text-center">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin h-6 w-6 mx-auto text-gray-400" />
        </div>
        <div v-else-if="recentUsers.length === 0" class="py-4 text-center text-gray-500">
          No users found
        </div>
        <UTable v-else :columns="userColumns" :rows="recentUsers" />
      </UCard>

      <!-- Recent Tracks -->
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium">Recent Tracks</h3>
            <UButton to="/admin/tracks" size="xs" color="gray" variant="ghost">
              View All
            </UButton>
          </div>
        </template>
        <div v-if="loading.tracks" class="py-4 text-center">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin h-6 w-6 mx-auto text-gray-400" />
        </div>
        <div v-else-if="recentTracks.length === 0" class="py-4 text-center text-gray-500">
          No tracks found
        </div>
        <UTable v-else :columns="trackColumns" :rows="recentTracks" />
      </UCard>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'admin',
  middleware: ['admin']
});

const supabase = useSupabaseClient();
const toast = useToast();

// Stats data
const stats = ref({
  users: 0,
  tracks: 0,
  playlists: 0,
  activity: 0
});

// Loading states
const loading = ref({
  stats: true,
  users: true,
  tracks: true
});

// Recent users and tracks
const recentUsers = ref([]);
const recentTracks = ref([]);

// Table columns
const userColumns = [
  { key: 'username', label: 'Username', id: 'username' },
  { key: 'email', label: 'Email', id: 'email' },
  { key: 'created_at', label: 'Joined', id: 'created_at' }
];

const trackColumns = [
  { key: 'title', label: 'Title', id: 'title' },
  { key: 'artist', label: 'Artist', id: 'artist' },
  { key: 'created_at', label: 'Uploaded', id: 'created_at' }
];


// Fetch dashboard data
onMounted(async () => {
  await Promise.all([
    fetchStats(),
    fetchRecentUsers(),
    fetchRecentTracks()
  ]);
});

// Fetch stats
const fetchStats = async () => {
  loading.value.stats = true;

  try {
    // Get users count
    const { count: usersCount, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // Get tracks count
    const { count: tracksCount, error: tracksError } = await supabase
      .from('tracks')
      .select('*', { count: 'exact', head: true });

    if (tracksError) throw tracksError;

    // Get playlists count
    const { count: playlistsCount, error: playlistsError } = await supabase
      .from('playlists')
      .select('*', { count: 'exact', head: true });

    if (playlistsError) throw playlistsError;

    // Update stats
    stats.value = {
      users: usersCount || 0,
      tracks: tracksCount || 0,
      playlists: playlistsCount || 0,
      activity: Math.floor(Math.random() * 100) // Placeholder for activity
    };
  } catch (err) {
    console.error('Error fetching stats:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to load dashboard statistics',
      color: 'error'
    });
  } finally {
    loading.value.stats = false;
  }
};

// Fetch recent users
const fetchRecentUsers = async () => {
  loading.value.users = true;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    recentUsers.value = data.map(user => ({
      id: user.id,
      username: user.username || 'No username',
      email: user.auth_users?.[0]?.email || 'No email',
      created_at: new Date(user.created_at).toLocaleDateString()
    }));
  } catch (err) {
    console.error('Error fetching recent users:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to load recent users',
      color: 'error'
    });
  } finally {
    loading.value.users = false;
  }
};

// Fetch recent tracks
const fetchRecentTracks = async () => {
  loading.value.tracks = true;

  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    recentTracks.value = data.map(track => ({
      id: track.id,
      title: track.title || 'Untitled',
      artist: track.artist || 'Unknown Artist',
      created_at: new Date(track.created_at).toLocaleDateString()
    }));
  } catch (err) {
    console.error('Error fetching recent tracks:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to load recent tracks',
      color: 'error'
    });
  } finally {
    loading.value.tracks = false;
  }
};
</script>

<style scoped>



</style>