<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { refDebounced } from '@vueuse/core'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

type AdminUser = {
  id: string
  username: string | null
  full_name: string | null
  email: string | null
  avatar_url: string | null
  is_admin: boolean | null
  created_at: string | null
}

const toast = useToast()
const me = useSupabaseUser()

const q = ref('')
const debouncedQ = refDebounced(q, 300)
const page = ref(1)
const pageSize = 25

const { data, pending, error, refresh } = await useFetch<{ users: AdminUser[]; total: number }>('/api/v1/users', {
  query: computed(() => ({ q: debouncedQ.value || undefined, limit: pageSize, offset: (page.value - 1) * pageSize })),
  server: false,
})
watch(debouncedQ, () => { page.value = 1 })

const columns: TableColumn<AdminUser>[] = [
  { accessorKey: 'username', header: 'User' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'is_admin', header: 'Role' },
  { accessorKey: 'created_at', header: 'Joined' },
  { id: 'actions', header: '' },
]

function errorMessage(e: any) {
  return e?.data?.statusMessage || e?.statusMessage || e?.message || 'Request failed'
}

/* create / edit */
const formOpen = ref(false)
const editing = ref<AdminUser | null>(null)
const form = reactive({ email: '', password: '', username: '', full_name: '', is_admin: false })
const saving = ref(false)

function openCreate() {
  editing.value = null
  Object.assign(form, { email: '', password: '', username: '', full_name: '', is_admin: false })
  formOpen.value = true
}

function openEdit(u: AdminUser) {
  editing.value = u
  Object.assign(form, { email: u.email ?? '', password: '', username: u.username ?? '', full_name: u.full_name ?? '', is_admin: !!u.is_admin })
  formOpen.value = true
}

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      const u = editing.value
      await $fetch('/api/v1/users/update', {
        method: 'POST',
        body: {
          user_id: u.id,
          ...(form.email && form.email !== u.email && { email: form.email }),
          ...(form.password && { password: form.password }),
          ...(form.username && form.username !== u.username && { username: form.username }),
          full_name: form.full_name || null,
          is_admin: form.is_admin,
        },
      })
      toast.add({ title: 'User updated', color: 'success' })
    } else {
      await $fetch('/api/v1/users/create', {
        method: 'POST',
        body: { email: form.email, password: form.password, username: form.username, full_name: form.full_name || undefined, is_admin: form.is_admin },
      })
      toast.add({ title: 'User created', color: 'success' })
    }
    formOpen.value = false
    await refresh()
  } catch (e) {
    toast.add({ title: 'Could not save user', description: errorMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
}

/* delete */
const deleting = ref<AdminUser | null>(null)
const deletingBusy = ref(false)
async function confirmDelete() {
  if (!deleting.value) return
  deletingBusy.value = true
  try {
    await $fetch('/api/v1/users/delete', { method: 'POST', body: { userId: deleting.value.id } })
    toast.add({ title: 'User deleted', color: 'success' })
    deleting.value = null
    await refresh()
  } catch (e) {
    toast.add({ title: 'Could not delete user', description: errorMessage(e), color: 'error' })
  } finally {
    deletingBusy.value = false
  }
}

useSeoMeta({ title: 'Users · Admin' })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold">Users <span v-if="data" class="text-old-neutral-500 text-base font-normal">({{ data.total }})</span></h1>
      <div class="flex gap-2">
        <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Search name or email" />
        <UButton icon="i-heroicons-plus" @click="openCreate">Add user</UButton>
      </div>
    </div>

    <UAlert v-if="error" color="error" variant="soft" title="Could not load users" :description="errorMessage(error)" class="mb-4" />

    <div class="rounded-xl bg-white dark:bg-old-neutral-900 shadow-sm overflow-hidden">
      <UTable :data="data?.users ?? []" :columns="columns" :loading="pending">
        <template #username-cell="{ row }">
          <div class="flex items-center gap-2">
            <UAvatar :src="row.original.avatar_url ?? undefined" :alt="row.original.username ?? undefined" size="sm" />
            <div>
              <NuxtLink :to="`/authors/${row.original.id}`" class="font-medium hover:underline">{{ row.original.username || '—' }}</NuxtLink>
              <div v-if="row.original.full_name" class="text-xs text-old-neutral-500">{{ row.original.full_name }}</div>
            </div>
          </div>
        </template>
        <template #is_admin-cell="{ row }">
          <UBadge v-if="row.original.is_admin" color="primary" variant="soft">Admin</UBadge>
          <span v-else class="text-old-neutral-500">User</span>
        </template>
        <template #created_at-cell="{ row }">
          {{ row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : '—' }}
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton icon="i-lucide-pencil" size="sm" variant="ghost" color="neutral" aria-label="Edit user" @click="openEdit(row.original)" />
            <UButton
              icon="i-lucide-trash-2"
              size="sm"
              variant="ghost"
              color="error"
              aria-label="Delete user"
              :disabled="row.original.id === me?.id"
              @click="deleting = row.original"
            />
          </div>
        </template>
      </UTable>
    </div>

    <div v-if="(data?.total ?? 0) > pageSize" class="flex justify-center mt-4">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>

    <UModal v-model:open="formOpen" :title="editing ? 'Edit user' : 'Add user'">
      <template #body>
        <form id="user-form" class="space-y-4" @submit.prevent="save">
          <UFormField label="Email" :required="!editing">
            <UInput v-model="form.email" type="email" class="w-full" :required="!editing" />
          </UFormField>
          <UFormField :label="editing ? 'New password (optional)' : 'Password'" :required="!editing">
            <PasswordInput v-model="form.password" class="w-full" autocomplete="new-password" :required="!editing" minlength="6" />
          </UFormField>
          <UFormField label="Username" :required="!editing">
            <UInput v-model="form.username" class="w-full" :required="!editing" minlength="3" maxlength="30" />
          </UFormField>
          <UFormField label="Full name">
            <UInput v-model="form.full_name" class="w-full" />
          </UFormField>
          <USwitch v-model="form.is_admin" label="Administrator" :disabled="editing?.id === me?.id" />
        </form>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="formOpen = false">Cancel</UButton>
          <UButton type="submit" form="user-form" :loading="saving">{{ editing ? 'Save' : 'Create' }}</UButton>
        </div>
      </template>
    </UModal>

    <ConfirmDialog
      :open="!!deleting"
      title="Delete user?"
      :description="`${deleting?.username || deleting?.email} will be removed permanently together with their tracks, albums, playlists, likes, listening history and uploaded files. Their tracks also disappear from other people's playlists.`"
      :loading="deletingBusy"
      @update:open="(v: boolean) => { if (!v) deleting = null }"
      @confirm="confirmDelete"
    />
  </div>
</template>
