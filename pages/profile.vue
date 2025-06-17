<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Profile</h1>
    <div v-if="!user">
      <p>Please <NuxtLink to="/login" class="text-blue-500 hover:underline">login</NuxtLink> to view your profile.</p>
    </div>
    <div v-else-if="profile">
      <p><strong>Username:</strong> {{ profile.username }}</p>
      <img v-if="profile.avatar_url" :src="profile.avatar_url" alt="Avatar" class="w-24 h-24 rounded mt-4" />
    </div>
    <div v-else>
      <p>Profile not found.</p>
    </div>
  </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const profile = ref(null)

definePageMeta({
  middleware: ['auth']
})

// Only fetch profile if user is logged in
if (user.value) {
  const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

  // If profile exists, use it; otherwise create a basic profile object
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
  }
}
</script>
