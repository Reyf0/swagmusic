<template>
  <div class="min-h-screen bg-gray-100">
    <UApp>
      <!-- Admin Header -->
      <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex">
              <div class="flex-shrink-0 flex items-center">
                <h1 class="text-xl font-bold text-gray-900">SwagMusic Admin</h1>
              </div>
            </div>
            <div class="flex items-center">
              <UButton
                  icon="i-heroicons-arrow-left-circle"
                  color="gray"
                  variant="ghost"
                  to="/"
                  class="mr-2"
              >
                Back to Site
              </UButton>
              <UButton
                  icon="i-heroicons-arrow-right-on-rectangle"
                  color="red"
                  variant="ghost"
                  @click="logout"
              >
                Logout
              </UButton>
            </div>
          </div>
        </div>
      </header>

      <div class="flex">
        <!-- Sidebar -->
        <aside class="w-64 bg-white shadow h-[calc(100vh-4rem)] sticky top-16">
          <nav class="p-4 space-y-1">
            <UButton
                block
                variant="ghost"
                color="gray"
                icon="i-heroicons-home"
                class="justify-start"
            >
              <NuxtLink to="/admin">Dashboard</NuxtLink>
            </UButton>
            <UButton
                block
                variant="ghost"
                color="gray"
                icon="i-heroicons-users"
                class="justify-start"
            >
              <NuxtLink to="/admin/users">Users</NuxtLink>
            </UButton>
            <UButton
                block
                variant="ghost"
                color="gray"
                icon="i-heroicons-musical-note"
                class="justify-start"
            >
              <NuxtLink to="/admin/tracks">Tracks</NuxtLink>
            </UButton>
            <UButton
                block
                variant="ghost"
                color="gray"
                icon="i-heroicons-rectangle-stack"
                class="justify-start"
            >
              <NuxtLink to="/admin/albums">Albums</NuxtLink>
            </UButton>
            <UButton
                block
                variant="ghost"
                color="gray"
                icon="i-heroicons-queue-list"
                class="justify-start"
            >
              <NuxtLink to="/admin/playlists">Playlists</NuxtLink>
            </UButton>
          </nav>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 p-6">
          <slot />
        </main>
      </div>
    </UApp>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient();
const router = useRouter();
const toast = useToast();

const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    toast.add({
      title: 'Logged out',
      description: 'You have been successfully logged out',
      color: 'green',
    });

    await router.push('/login');
  } catch (err) {
    console.error('Error logging out:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to log out',
      color: 'error',
    });
  }
};
</script>

<style scoped>
nav a.router-link-active {
  font-weight: bold;
  color: #4ade80;
}
</style>