<script setup lang="ts">
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from '@/types'

definePageMeta({
  layout: 'auth'
})

const supabase:SupabaseClient<Database> = useSupabaseClient();
const email = ref('');
const password = ref('');
const router = useRouter();
const errorMessage = ref('');
const isLoading = ref(false);

const signInWithEmail = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter both email and password';
    return;
  }

  errorMessage.value = '';
  isLoading.value = true;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) {
      errorMessage.value = error.message || 'Failed to sign in';
    } else {
      await router.push('/');
    }

    const accessToken = data.session?.access_token;
    await $fetch('/api/v1/auth/process', { method: 'POST', body: { access_token: accessToken}})

  } catch (e) {
    errorMessage.value = 'An unexpected error occurred';
    console.error(e);
  } finally {
    isLoading.value = false;
  }
}

async function signInWithGoogle(response) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    }
  })
}

</script>

<template>
  <div class="bg-old-neutral-50 dark:bg-old-neutral-900 max-w-md mx-auto p-6 rounded-lg shadow-md mt-10">
    <h1 class="dark:text-white text-2xl font-bold mb-6 text-center">Sign In</h1>

    <div class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium dark:text-white">Email</label>
        <input 
          id="email"
          v-model="email" 
          placeholder="Enter your email" 
          type="email" 
          required
          class="mt-1 block w-full px-3 py-2 dark:text-old-neutral-400 border border-old-neutral-200 dark:border-old-neutral-700 bg-white dark:bg-old-neutral-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
      </div>

      <div>
        <label for="password" class="block text-sm font-medium dark:text-white">Password</label>
        <input 
          id="password"
          v-model="password" 
          placeholder="Enter your password" 
          type="password" 
          required
          class="mt-1 block w-full px-3 py-2 dark:text-old-neutral-400 border border-old-neutral-200 dark:border-old-neutral-700 bg-white dark:bg-old-neutral-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
      </div>

      <div v-if="errorMessage" class="text-red-500 text-sm">
        {{ errorMessage }}
      </div>

      <button 
        type="submit" 
        :disabled="isLoading"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        @click="signInWithEmail"
      >
        <span v-if="isLoading">Signing in...</span>
        <span v-else>Sign In</span>
      </button>

      <button
          @click="signInWithGoogle"
          class="w-full flex items-center justify-center cursor-pointer gap-3 py-2 px-4 border rounded-full shadow-sm mb-4 text-white border-old-neutral-500 hover:border-white transition"
      >
        <svg class="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.4h147.6c-6.4 34.5-25.9 63.8-55.4 83.4v69.3h89.4c52.4-48.3 82.9-119.4 82.9-197.7z"/>
          <path fill="#34A853" d="M272 544.3c74.2 0 136.4-24.4 181.9-66.2l-89.4-69.3c-25 16.8-57.4 26.9-92.5 26.9-71 0-131.2-47.9-152.6-112.3H29.5v70.6C75 489.8 167.5 544.3 272 544.3z"/>
          <path fill="#FBBC05" d="M119.4 322.4c-11.3-33.6-11.3-69.7 0-103.3V148.5H29.5c-39.4 77.6-39.4 169.4 0 247l89.9-72.9z"/>
          <path fill="#EA4335" d="M272 107.7c39.8 0 75.6 13.7 103.8 40.6l77.7-77.7C408 24.8 347.8 0 272 0 167.5 0 75 54.5 29.5 148.5l89.9 70.6C140.8 155.6 201 107.7 272 107.7z"/>
        </svg>
        <span class="text-sm font-medium">Sign in with Google</span>
      </button>

      <div class="text-center mt-4">
        <p class="text-sm text-gray-600">
          Don't have an account? 
          <NuxtLink to="/register" class="font-medium text-green-600 hover:text-green-500">
            Register
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
