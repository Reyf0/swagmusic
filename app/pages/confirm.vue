<script setup lang="ts">
// Landing page for OAuth sign-in and email confirmation links (PKCE flow).
// The browser client exchanges `?code=` for a session automatically on startup;
// if that has not happened yet we do it explicitly.
definePageMeta({
  layout: 'auth'
})

const supabase = useSupabase()
const user = useSupabaseUser()
const route = useRoute()

const errorMessage = ref<string | null>(null)

const redirectTo = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/'
})

onMounted(async () => {
  const urlError = route.query.error_description || route.query.error
  if (urlError) {
    errorMessage.value = String(urlError)
    return
  }

  if (user.value) return navigateTo(redirectTo.value, { replace: true })

  const code = route.query.code
  if (typeof code === 'string') {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    // The code may already have been consumed by the automatic exchange.
    if (error && !user.value) {
      errorMessage.value = 'We could not finish signing you in. If you just confirmed your email, please sign in.'
      return
    }
  }

  if (user.value) return navigateTo(redirectTo.value, { replace: true })
  errorMessage.value = 'Your sign-in link is invalid or has expired.'
})

watch(user, (u) => {
  if (u) navigateTo(redirectTo.value, { replace: true })
})
</script>

<template>
  <div class="text-center dark:text-white space-y-4">
    <template v-if="errorMessage">
      <h1 class="text-xl font-semibold">Sign-in failed</h1>
      <p class="text-sm text-old-neutral-400">{{ errorMessage }}</p>
      <UButton to="/login" color="primary">Go to sign in</UButton>
    </template>
    <template v-else>
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
      <p>Signing you in…</p>
    </template>
  </div>
</template>
