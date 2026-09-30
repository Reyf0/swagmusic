<script setup lang="ts">
import type { ThemePreference } from '@/stores/settings'

const supabase = useSupabase()
const user = useSupabaseUser()
const toast = useToast()
const settingsStore = useSettingsStore()
const profileStore = useProfileStore()

const themeItems = [
  { label: 'System', value: 'system', icon: 'i-lucide-monitor' },
  { label: 'Light', value: 'light', icon: 'i-lucide-sun' },
  { label: 'Dark', value: 'dark', icon: 'i-lucide-moon' },
]

const theme = computed({
  get: () => settingsStore.theme,
  set: (v: ThemePreference) => { settingsStore.setTheme(v) },
})

/* password change */
const newPassword = ref('')
const confirmPassword = ref('')
const savingPassword = ref(false)
const passwordError = ref('')

async function changePassword() {
  passwordError.value = ''
  if (newPassword.value.length < 6) return void (passwordError.value = 'Password must be at least 6 characters long')
  if (newPassword.value !== confirmPassword.value) return void (passwordError.value = 'Passwords do not match')

  savingPassword.value = true
  const { error } = await supabase.auth.updateUser({ password: newPassword.value })
  savingPassword.value = false
  if (error) return void (passwordError.value = error.message)

  newPassword.value = ''
  confirmPassword.value = ''
  toast.add({ title: 'Password updated', color: 'success' })
}

async function signOut() {
  await profileStore.signOut()
  await navigateTo('/')
}

// Optional anonymous visit statistics (see CookieBanner); stored per browser.
const cookieConsent = useCookieConsent()
const allowStatistics = computed({
  get: () => !!cookieConsent.value?.analytics,
  set: (v: boolean) => { cookieConsent.value = storeConsent(v) },
})

useSeoMeta({ title: 'Settings' })
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-8">
    <h1 class="text-2xl font-bold">Settings</h1>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Appearance</h2>
      <UFormField label="Theme" help="Saved to your account and applied on all your devices.">
        <URadioGroup v-model="theme" :items="themeItems" orientation="horizontal" variant="card" />
      </UFormField>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Privacy</h2>
      <USwitch
        v-model="allowStatistics"
        label="Anonymous visit statistics"
        description="Helps us see which pages are used. No cookies, no advertising. Saved in this browser."
      />
      <p class="text-sm">
        <NuxtLink to="/privacy" class="text-green-600 dark:text-green-400 hover:underline">Privacy policy</NuxtLink>
        · <NuxtLink to="/terms" class="text-green-600 dark:text-green-400 hover:underline">Terms of use</NuxtLink>
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Account</h2>
      <p class="text-sm text-old-neutral-500">Signed in as <b>{{ user?.email }}</b></p>

      <form class="space-y-3 max-w-sm" @submit.prevent="changePassword">
        <UFormField label="New password">
          <UInput v-model="newPassword" type="password" autocomplete="new-password" class="w-full" />
        </UFormField>
        <UFormField label="Repeat new password">
          <UInput v-model="confirmPassword" type="password" autocomplete="new-password" class="w-full" />
        </UFormField>
        <p v-if="passwordError" class="text-sm text-red-500" role="alert">{{ passwordError }}</p>
        <UButton type="submit" :loading="savingPassword" :disabled="!newPassword">Change password</UButton>
      </form>
    </section>

    <section>
      <UButton color="error" variant="soft" icon="i-lucide-log-out" @click="signOut">Sign out</UButton>
    </section>
  </div>
</template>
