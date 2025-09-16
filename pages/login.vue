<script setup lang="ts">
import type { SupabaseClient } from "@supabase/supabase-js";
import { Database } from '@/types'
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
  <div class="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
    <h1 class="text-2xl font-bold mb-6 text-center">Sign In</h1>

    <div class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <input 
          id="email"
          v-model="email" 
          placeholder="Enter your email" 
          type="email" 
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
        >
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input 
          id="password"
          v-model="password" 
          placeholder="Enter your password" 
          type="password" 
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
        >
      </div>

      <div v-if="errorMessage" class="text-red-500 text-sm">
        {{ errorMessage }}
      </div>

      <button 
        type="submit" 
        :disabled="isLoading"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        @click="signInWithEmail"
      >
        <span v-if="isLoading">Signing in...</span>
        <span v-else>Sign In</span>
      </button>

      <button
          @click="signInWithGoogle"
          class="flex items-center justify-center gap-2 w-full py-2 px-4 border rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
      >
        <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            class="w-5 h-5"
        />
        <span>Sign in with Google</span>
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
