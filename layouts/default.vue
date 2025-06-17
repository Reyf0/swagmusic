<script setup lang="ts">
const user = useSupabaseUser();
const supabase = useSupabaseClient()
const router = useRouter()
const toast = useToast()

const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    toast.add({
      title: 'Ошибка при выходе',
      description: error.message,
      color: 'error',
    })
  } else {
    toast.add({
      title: 'Вы вышли из аккаунта',
      color: 'success',
    })
    await router.push('/login')
  }
}

</script>

<template>
  <div>
    <UApp>
      <nav class="bg-gray-800 p-4">
        <div class="container mx-auto flex justify-between items-center">
          <UButton><NuxtLink to="/" class="text-white text-xl font-bold">SwagMusic</NuxtLink></UButton>
          <div class="flex space-x-4">
            <UButton><NuxtLink to="/" class="text-white hover:text-gray-300">Home</NuxtLink></UButton>
            <UButton><NuxtLink to="/tracks" class="text-white hover:text-gray-300">Tracks</NuxtLink></UButton>
            <template v-if="user">
              <UButton><NuxtLink to="/upload" class="text-white hover:text-gray-300">Upload</NuxtLink></UButton>
              <UButton><NuxtLink to="/profile" class="text-white hover:text-gray-300">Profile</NuxtLink></UButton>
              <UButton class="text-white hover:text-gray-300" @click="signOut">Sign out</UButton>
            </template>
            <template v-else>
              <UButton><NuxtLink to="/login" class="text-white hover:text-gray-300">Login</NuxtLink></UButton>
              <UButton><NuxtLink to="/register" class="text-white hover:text-gray-300">Register</NuxtLink></UButton>
            </template>
          </div>
        </div>
      </nav>
      <div class="container mx-auto mt-4">
        <NuxtPage/>
      </div>
    </UApp>
  </div>
</template>

<style scoped>
nav a.router-link-active {
  font-weight: bold;
  color: #4ade80;
}
</style>
