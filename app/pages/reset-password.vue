<script setup lang="ts">
// Opened from the password reset email. The browser client turns the link's code
// into a temporary session, after which the user can set a new password.
definePageMeta({
  layout: 'auth'
})

useSeoMeta({ title: 'Reset password' })

const supabase = useSupabase()
const user = useSupabaseUser()
const toast = useToast()

const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const isSaving = ref(false)
const ready = ref(false)

onMounted(() => {
  // give the automatic code exchange a moment to finish
  setTimeout(() => { ready.value = true }, 1500)
})

async function updatePassword() {
  errorMessage.value = ''
  if (password.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters long'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match'
    return
  }

  isSaving.value = true
  const { error } = await supabase.auth.updateUser({ password: password.value })
  isSaving.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }
  toast.add({ title: 'Password updated', color: 'success' })
  await navigateTo('/')
}
</script>

<template>
  <div class="max-w-md mx-auto dark:text-white">
    <h1 class="text-2xl font-bold mb-6 text-center">Set a new password</h1>

    <form v-if="user" class="space-y-4" @submit.prevent="updatePassword">
      <UFormField label="New password">
        <UInput v-model="password" type="password" autocomplete="new-password" class="w-full" required />
      </UFormField>
      <UFormField label="Repeat new password">
        <UInput v-model="confirmPassword" type="password" autocomplete="new-password" class="w-full" required />
      </UFormField>

      <p v-if="errorMessage" class="text-red-500 text-sm" role="alert">{{ errorMessage }}</p>

      <UButton type="submit" block :loading="isSaving">Update password</UButton>
    </form>

    <div v-else-if="ready" class="text-center space-y-4">
      <p class="text-sm text-old-neutral-400">This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
      <UButton to="/login">Back to sign in</UButton>
    </div>

    <div v-else class="flex justify-center">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
    </div>
  </div>
</template>
