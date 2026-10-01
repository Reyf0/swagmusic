<script setup lang="ts">
import { USERNAME_PATTERN as USERNAME_RE } from '#shared/schemas/profile'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({ title: 'Create account' })

// One switch shows / hides both password fields.
const showPassword = ref(false)
const supabase = useSupabase()

const email = ref<string>('')
const username = ref<string>('')
const password = ref<string>('')
const confirmPassword = ref<string>('')

const usernameStatus = ref<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
let usernameCheckTimer: ReturnType<typeof setTimeout> | null = null

// Set when the project requires email confirmation: signUp returns no session.
const awaitingConfirmation = ref(false)

const emailValid = computed(() => /\S+@\S+\.\S+/.test(email.value.trim()))
const passwordLengthOk = computed(() => password.value.length >= 6)
const passwordsMatch = computed(() => !!password.value && password.value === confirmPassword.value)

const step = ref<number>(1) // 1..3
const isLoading = ref<boolean>(false)
const errorMsg = ref<string>('')

const direction = ref<'left' | 'right'>('left') // for the step animation

const canNextStep = computed(() => {
  if (step.value === 1) return emailValid.value
  if (step.value === 2) return usernameStatus.value === 'available'
  if (step.value === 3) return passwordLengthOk.value && passwordsMatch.value
  return false
})

function nextStep() {
  errorMsg.value = ''
  if (!canNextStep.value) {
    if (step.value === 1) errorMsg.value = 'Enter a valid email address'
    if (step.value === 2) {
      errorMsg.value = usernameStatus.value === 'taken'
        ? 'This username is already taken'
        : 'Username must be 3–30 characters: letters, digits, spaces, dots, dashes or underscores'
    }
    if (step.value === 3) {
      errorMsg.value = passwordLengthOk.value ? 'Passwords do not match' : 'Password must be at least 6 characters long'
    }
    return
  }

  direction.value = 'left'
  if (step.value < 3) step.value += 1
}

function prevStep() {
  errorMsg.value = ''
  direction.value = 'right'
  if (step.value > 1) step.value -= 1
}

async function onGoogleSignIn() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/confirm`,
    }
  })
  if (error) errorMsg.value = error.message
}

async function signUpNewUser() {
  if (!canNextStep.value) return nextStep()

  errorMsg.value = ''
  isLoading.value = true

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      options: {
        data: { username: username.value.trim() },
        emailRedirectTo: `${window.location.origin}/confirm`,
      },
    })

    if (error) throw error

    if (data.session) {
      await navigateTo('/')
    } else {
      awaitingConfirmation.value = true
    }
  } catch (err: any) {
    console.error(err)
    errorMsg.value = err?.message || 'Registration failed'
  } finally {
    isLoading.value = false
  }
}

async function checkUsernameUnique() {
  const val = username.value.trim()
  if (!USERNAME_RE.test(val)) {
    usernameStatus.value = val.length ? 'invalid' : 'idle'
    return
  }

  usernameStatus.value = 'checking'
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', escapeLike(val))
    .limit(1)

  if (username.value.trim() !== val) return // user kept typing
  if (error) {
    console.warn('username check error', error)
    usernameStatus.value = 'idle'
    return
  }
  usernameStatus.value = data.length > 0 ? 'taken' : 'available'
}

watch(username, () => {
  usernameStatus.value = 'idle'
  if (usernameCheckTimer) clearTimeout(usernameCheckTimer)
  usernameCheckTimer = setTimeout(checkUsernameUnique, 400)
})

onUnmounted(() => {
  if (usernameCheckTimer) clearTimeout(usernameCheckTimer)
})
</script>


<template>
  <div class="max-w-md mx-auto">
    <h1 class="text-2xl font-semibold text-old-neutral-800 dark:text-white mb-4 text-center">Create an account</h1>

    <!-- steps indicator -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex-1 h-1 bg-old-neutral-200 dark:bg-old-neutral-700 rounded-full mr-3 overflow-hidden">
        <div
            class="h-full bg-green-600 transition-all"
            :style="{ width: `${(step - 1) / 2 * 100}%` }"
        />
      </div>
      <div class="flex gap-2 text-sm text-old-neutral-500 dark:text-old-neutral-300">
        <span :class="step >= 1 ? 'font-semibold text-green-600' : ''">1</span>
        <span class="text-xs">/</span>
        <span :class="step >= 2 ? 'font-semibold text-green-600' : ''">2</span>
        <span class="text-xs">/</span>
        <span :class="step >= 3 ? 'font-semibold text-green-600' : ''">3</span>
      </div>
    </div>

    <div v-if="awaitingConfirmation" class="bg-old-neutral-50 dark:bg-old-neutral-900 p-6 rounded-lg shadow-sm text-center space-y-3 dark:text-white">
      <UIcon name="i-lucide-mail-check" class="size-10 text-green-500" />
      <h2 class="text-lg font-semibold">Check your inbox</h2>
      <p class="text-sm text-old-neutral-400">We sent a confirmation link to <b>{{ email }}</b>. Open it to activate your account.</p>
      <NuxtLink to="/login" class="inline-block font-medium text-green-500 hover:text-green-400">Back to sign in</NuxtLink>
    </div>

    <div v-else class="bg-old-neutral-50 dark:bg-old-neutral-900 p-6 rounded-lg shadow-sm">
      <button
          type="button"
          class="w-full flex items-center justify-center cursor-pointer gap-3 py-2 px-4 border rounded-full shadow-sm mb-4 dark:text-white border-old-neutral-500 hover:border-old-neutral-900 dark:hover:border-white transition"
          aria-label="Sign up with Google"
          @click="onGoogleSignIn"
      >
        <!-- simple Google icon -->
        <svg class="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.4h147.6c-6.4 34.5-25.9 63.8-55.4 83.4v69.3h89.4c52.4-48.3 82.9-119.4 82.9-197.7z"/>
          <path fill="#34A853" d="M272 544.3c74.2 0 136.4-24.4 181.9-66.2l-89.4-69.3c-25 16.8-57.4 26.9-92.5 26.9-71 0-131.2-47.9-152.6-112.3H29.5v70.6C75 489.8 167.5 544.3 272 544.3z"/>
          <path fill="#FBBC05" d="M119.4 322.4c-11.3-33.6-11.3-69.7 0-103.3V148.5H29.5c-39.4 77.6-39.4 169.4 0 247l89.9-72.9z"/>
          <path fill="#EA4335" d="M272 107.7c39.8 0 75.6 13.7 103.8 40.6l77.7-77.7C408 24.8 347.8 0 272 0 167.5 0 75 54.5 29.5 148.5l89.9 70.6C140.8 155.6 201 107.7 272 107.7z"/>
        </svg>
        <span class="text-sm font-medium">Continue with Google</span>
      </button>

      <div class="my-4 text-center text-sm text-old-neutral-400 dark:text-old-neutral-300">or</div>

      <!-- animated steps -->
      <div class="relative min-h-[220px]">
        <transition :name="direction === 'left' ? 'slide-left' : 'slide-right'" mode="out-in">
          <!-- STEP 1: email -->
          <div v-if="step === 1" key="step-1" class="space-y-4">
            <label class="block text-sm font-medium text-old-neutral-700 dark:text-white">Email</label>
            <input
                v-model="email"
                type="email"
                placeholder="you@example.com"
                class="w-full pr-28 px-3 py-2 dark:text-old-neutral-400 rounded-md border border-old-neutral-200 dark:border-old-neutral-700 bg-white dark:bg-old-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand"
                @keyup.enter="nextStep"
            >
            <p class="text-xs text-old-neutral-500">You will use this email to sign in.</p>
          </div>

          <!-- STEP 2: username -->
          <div v-else-if="step === 2" key="step-2" class="space-y-4">
            <label class="block text-sm font-medium text-old-neutral-700 dark:text-white">Username</label>

            <div class="relative">
              <input
                  v-model="username"
                  type="text"
                  placeholder="e.g. SwagUser"
                  class="w-full px-3 py-2 rounded-md border border-old-neutral-200 dark:border-old-neutral-700 dark:text-old-neutral-400 bg-white dark:bg-old-neutral-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  @keyup.enter="nextStep"
              >
              <!-- status -->
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <template v-if="usernameStatus === 'checking'">
                  <!-- spinner -->
                  <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/></svg>
                </template>

                <template v-else-if="usernameStatus === 'available'">
                  <span class="text-sm text-green-600">Available</span>
                </template>

                <template v-else-if="usernameStatus === 'invalid'">
                  <span class="text-sm text-red-600">Invalid</span>
                </template>

                <template v-else-if="usernameStatus === 'taken'">
                  <span class="text-sm text-red-600">Taken</span>
                </template>
              </div>

            </div>

            <p class="text-xs text-old-neutral-500">Your username is unique and shown as your artist name.</p>
          </div>

          <!-- STEP 3: password -->
          <div v-else key="step-3" class="space-y-4">
            <label class="block text-sm font-medium text-old-neutral-700 dark:text-white">Password</label>
            <div class="relative">
            <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Enter a password"
                class="w-full pl-3 pr-11 py-2 rounded-md dark:text-old-neutral-400 border border-old-neutral-200 dark:border-old-neutral-700 bg-white dark:bg-old-neutral-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                @keyup.enter="canNextStep ? signUpNewUser() : nextStep()"
            >
            <button
            type="button"
            class="absolute inset-y-0 right-0 flex items-center px-3 text-old-neutral-400 hover:text-old-neutral-700 dark:hover:text-white"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="size-5" />
          </button>
            </div>
            <label class="block text-sm font-medium text-old-neutral-700 dark:text-white">Confirm password</label>
            <input
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Repeat the password"
                class="w-full px-3 py-2 rounded-md dark:text-old-neutral-400 border border-old-neutral-200 dark:border-old-neutral-700 bg-white dark:bg-old-neutral-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                @keyup.enter="canNextStep ? signUpNewUser() : nextStep()"
            >
            <!-- Password policy hint -->
            <div class="mt-2 text-sm">
              <div class="flex items-center gap-2">
                <svg v-if="passwordLengthOk" class="w-4 h-4 text-green-600" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                <svg v-else class="w-4 h-4 text-slate-400" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                <span :class="passwordLengthOk ? 'text-green-600' : 'text-slate-500'">At least 6 characters</span>
              </div>

              <div class="flex items-center gap-2 mt-1">
                <svg v-if="passwordsMatch" class="w-4 h-4 text-green-600" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                <svg v-else class="w-4 h-4 text-slate-400" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                <span :class="passwordsMatch ? 'text-green-600' : 'text-slate-500'">Passwords match</span>
              </div>
            </div>

          </div>
        </transition>
      </div>

      <div v-if="errorMsg" class="mt-4 text-sm text-red-500">
        {{ errorMsg }}
      </div>

      <!-- controls -->
      <div class="mt-6 flex items-center justify-between">
        <button
            type="button"
            :disabled="step === 1 || isLoading"
            class="text-old-neutral-300 font-medium disabled:text-old-neutral-500 not-disabled:cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm disabled:opacity-50"
            @click="prevStep"
        >
          Back
        </button>

        <div class="flex items-center gap-3">
          <button
              v-if="step < 3"
              type="button"
              :disabled="!canNextStep || isLoading"
              class="px-4 py-2 rounded-full font-medium text-sm cursor-pointer bg-green-500 text-white hover:bg-green-700 disabled:opacity-50"
              @click="nextStep"
          >
            Next
          </button>

          <button
              v-else
              type="button"
              :disabled="isLoading"
              class="px-4 py-2 rounded-full font-medium text-sm cursor-pointer bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              @click="signUpNewUser"
          >
            <span v-if="isLoading">Creating...</span>
            <span v-else>Sign up</span>
          </button>
        </div>
      </div>

      <p class="mt-4 text-center text-xs text-old-neutral-500 dark:text-old-neutral-400">
        By creating an account you accept the
        <NuxtLink to="/terms" class="underline hover:text-green-500">Terms of use</NuxtLink>
        and the <NuxtLink to="/privacy" class="underline hover:text-green-500">Privacy policy</NuxtLink>.
      </p>

      <p class="mt-4 text-center text-sm text-old-neutral-500 dark:text-old-neutral-400">
        Already have an account?
        <NuxtLink to="/login" class="ml-1 font-medium text-green-500 hover:text-green-400">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* slide left: new content comes from right to left */
.slide-left-enter-active,
.slide-right-enter-active {
  transition: transform 280ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease;
}

.slide-left-leave-active,
.slide-right-leave-active {
  transition: transform 220ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease;
}

/* forward (left) */
.slide-left-enter-from {
  transform: translateX(18%);
  opacity: 0;
}
.slide-left-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.slide-left-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.slide-left-leave-to {
  transform: translateX(-18%);
  opacity: 0;
}

/* backward (right) */
.slide-right-enter-from {
  transform: translateX(-18%);
  opacity: 0;
}
.slide-right-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.slide-right-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.slide-right-leave-to {
  transform: translateX(18%);
  opacity: 0;
}
</style>
