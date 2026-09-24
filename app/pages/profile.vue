<script setup lang="ts">
const supabase = useSupabase()
const user = useSupabaseUser()
const toast = useToast()
const storage = useStorageUpload()
const profileStore = useProfileStore()
const { profile, loading } = storeToRefs(profileStore)

const form = reactive({ username: '', full_name: '', website: '' })
const saving = ref(false)
const formError = ref('')

function resetForm() {
  form.username = profile.value?.username ?? ''
  form.full_name = profile.value?.full_name ?? ''
  form.website = profile.value?.website ?? ''
}
watch(profile, resetForm, { immediate: true })

const dirty = computed(() =>
  form.username !== (profile.value?.username ?? '')
  || form.full_name !== (profile.value?.full_name ?? '')
  || form.website !== (profile.value?.website ?? ''))

async function save() {
  if (!profile.value) return
  formError.value = ''
  saving.value = true
  try {
    const patch: Record<string, string | null> = {}
    if (form.username !== (profile.value.username ?? '')) {
      const username = form.username.trim()
      const { data: taken } = await supabase.from('profiles').select('id').ilike('username', escapeLike(username)).neq('id', profile.value.id).limit(1)
      if (taken?.length) throw new Error('This username is already taken')
      patch.username = username
    }
    if (form.full_name !== (profile.value.full_name ?? '')) patch.full_name = form.full_name.trim() || null
    if (form.website !== (profile.value.website ?? '')) patch.website = form.website.trim() || null

    await profileStore.updateProfile(patch)
    toast.add({ title: 'Profile saved', color: 'success' })
  } catch (e: any) {
    formError.value = e?.issues?.[0]?.message ?? e?.message ?? 'Could not save profile'
  } finally {
    saving.value = false
  }
}

/* avatar */
const avatarInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)

async function onAvatarPicked(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file || !profile.value) return
  if (!file.type.startsWith('image/')) return void toast.add({ title: 'Please choose an image', color: 'warning' })
  if (file.size > MAX_IMAGE_BYTES) return void toast.add({ title: 'Images can be at most 5 MB', color: 'warning' })

  uploadingAvatar.value = true
  const previousPath = storagePathFromPublicUrl('avatars', profile.value.avatar_url)
  let newPath: string | null = null
  try {
    const { path, publicUrl } = await storage.uploadPublic('avatars', file)
    newPath = path
    await profileStore.updateProfile({ avatar_url: publicUrl })
    // Only delete the previous avatar if it was one of ours (user-folder layout).
    if (previousPath?.startsWith(`${profile.value.id}/`)) await storage.remove('avatars', previousPath)
    toast.add({ title: 'Avatar updated', color: 'success' })
  } catch (err: any) {
    await storage.remove('avatars', newPath)
    toast.add({ title: 'Could not update avatar', description: err?.message, color: 'error' })
  } finally {
    uploadingAvatar.value = false
  }
}

const joined = computed(() => user.value?.created_at ? new Date(user.value.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '')

useSeoMeta({ title: 'Profile · SwagMusic' })
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Profile</h1>

    <div v-if="loading && !profile" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
    </div>

    <UAlert
      v-else-if="!profile"
      color="error"
      variant="soft"
      title="Profile not found"
      description="Your account has no profile yet. Try signing out and in again."
    />

    <template v-else>
      <div class="flex items-center gap-6 mb-8">
        <button
          type="button"
          class="relative group size-24 shrink-0 rounded-full"
          aria-label="Change avatar"
          :disabled="uploadingAvatar"
          @click="avatarInput?.click()"
        >
          <UAvatar :src="profile.avatar_url ?? undefined" :alt="profile.username ?? undefined" class="size-24 text-3xl" />
          <span class="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition">
            <UIcon :name="uploadingAvatar ? 'i-lucide-loader-circle' : 'i-heroicons-camera'" class="size-6" :class="{ 'animate-spin': uploadingAvatar }" />
            <span class="text-xs">Change</span>
          </span>
        </button>
        <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarPicked">

        <div class="min-w-0">
          <h2 class="text-xl font-bold truncate">{{ profile.username || user?.email }}</h2>
          <p class="text-old-neutral-500 truncate">{{ user?.email }}</p>
          <p class="text-sm text-old-neutral-500">Joined {{ joined }}</p>
          <NuxtLink :to="`/authors/${profile.id}`" class="text-sm text-green-500 hover:underline">View your artist page</NuxtLink>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="save">
        <UFormField label="Username" help="Shown as your artist name.">
          <UInput v-model="form.username" class="w-full" maxlength="30" />
        </UFormField>
        <UFormField label="Full name">
          <UInput v-model="form.full_name" class="w-full" maxlength="120" />
        </UFormField>
        <UFormField label="Website">
          <UInput v-model="form.website" type="url" placeholder="https://" class="w-full" maxlength="200" />
        </UFormField>

        <p v-if="formError" class="text-sm text-red-500" role="alert">{{ formError }}</p>

        <div class="flex gap-2">
          <UButton type="submit" :loading="saving" :disabled="!dirty">Save changes</UButton>
          <UButton variant="ghost" color="neutral" :disabled="!dirty || saving" @click="resetForm">Cancel</UButton>
        </div>
      </form>
    </template>
  </div>
</template>
