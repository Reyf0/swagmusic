<script setup lang="ts">
const supabase = useSupabaseClient();
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const username = ref('');
const errorMsg = ref('');
const isLoading = ref(false);
const router = useRouter();

const signUpNewUser = async () => {
  // Validate inputs
  if (!email.value || !password.value || !confirmPassword.value || !username.value) {
    errorMsg.value = 'Please fill in all fields';
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match';
    return;
  }

  if (password.value.length < 6) {
    errorMsg.value = 'Password must be at least 6 characters long';
    return;
  }

  errorMsg.value = '';
  isLoading.value = true;

  try {
    console.log('Attempting to sign up with:', {
      email: email.value,
      username: username.value
    });
    // Create the user with metadata including username
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      user_metadata: { username: username.value },
      options: {
        
      }
    });

    if (authError) throw authError;

    // If user was created successfully, redirect to home page
    if (authData.user) {
      // Redirect to home page
      await router.push('/');
    }
  } catch (error: any) {
    errorMsg.value = error.message || 'An error occurred during registration';
    console.error(error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
    <h1 class="text-2xl font-bold mb-6 text-center">Create an Account</h1>

    <form @submit.prevent="signUpNewUser" class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <input 
          id="email"
          v-model="email" 
          placeholder="Enter your email" 
          type="email" 
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
      </div>

      <div>
        <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
        <input 
          id="username"
          v-model="username" 
          placeholder="Choose a username" 
          type="text" 
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input 
          id="password"
          v-model="password" 
          placeholder="Create a password" 
          type="password" 
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
      </div>

      <div>
        <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirm Password</label>
        <input 
          id="confirmPassword"
          v-model="confirmPassword" 
          placeholder="Confirm your password" 
          type="password" 
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
      </div>

      <div v-if="errorMsg" class="text-red-500 text-sm">
        {{ errorMsg }}
      </div>

      <button 
        type="submit"
        :disabled="isLoading"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        <span v-if="isLoading">Creating account...</span>
        <span v-else>Sign Up</span>
      </button>

      <div class="text-center mt-4">
        <p class="text-sm text-gray-600">
          Already have an account? 
          <NuxtLink to="/login" class="text-indigo-600 hover:text-indigo-500">
            Sign In
          </NuxtLink>
        </p>
      </div>
    </form>
  </div>
</template>

<style scoped>
/* Additional styles can be added here if needed */
</style>
