<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { refDebounced } from '@vueuse/core'

// Admin list for tracks / albums / playlists: search, rename, delete.
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
  validate: route => ['tracks', 'albums', 'playlists'].includes(String(route.params.resource)),
})

type Resource = 'tracks' | 'albums' | 'playlists'
type Row = {
  id: string
  title?: string
  name?: string
  description?: string | null
  cover_url?: string | null
  duration_seconds?: number | null
  likes_count?: number
  created_at: string | null
  playlist_tracks?: { count: number }[]
  owner: { id: string; username: string | null } | null
}

const route = useRoute()
const toast = useToast()
const resource = computed(() => String(route.params.resource) as Resource)
const labels: Record<Resource, { title: string; one: string; nameKey: 'title' | 'name'; href: (id: string) => string }> = {
  tracks: { title: 'Tracks', one: 'track', nameKey: 'title', href: () => '' },
  albums: { title: 'Albums', one: 'album', nameKey: 'title', href: id => `/albums/${id}` },
  playlists: { title: 'Playlists', one: 'playlist', nameKey: 'name', href: id => `/playlist/${id}` },
}
const meta = computed(() => labels[resource.value])

const q = ref('')
const debouncedQ = refDebounced(q, 300)
const page = ref(1)
const pageSize = 25
watch(debouncedQ, () => { page.value = 1 })
// The page component is reused for tracks / albums / playlists: start each section fresh.
watch(resource, () => {
  q.value = ''
  page.value = 1
})

// The key covers everything the request depends on, so any change refetches and an older
// response can't overwrite a newer one.
const { data, pending, error, refresh } = await useAsyncData(
  () => `admin-${resource.value}-${debouncedQ.value}-${page.value}`,
  () => $fetch<{ items: Row[]; total: number }>(`/api/v1/admin/${resource.value}`, {
    query: { q: debouncedQ.value || undefined, limit: pageSize, offset: (page.value - 1) * pageSize },
  }),
  { server: false },
)

const columns = computed<TableColumn<Row>[]>(() => [
  { id: 'name', header: 'Name' },
  { id: 'owner', header: 'Owner' },
  ...(resource.value === 'tracks' ? [{ id: 'stats', header: 'Length · likes' }] : []),
  ...(resource.value === 'playlists' ? [{ id: 'count', header: 'Tracks' }] : []),
  { accessorKey: 'created_at', header: 'Created' },
  { id: 'actions', header: '' },
])

function nameOf(row: Row) {
  return (meta.value.nameKey === 'name' ? row.name : row.title) ?? ''
}

function errorMessage(e: any) {
  return e?.data?.statusMessage || e?.statusMessage || e?.message || 'Request failed'
}

/* rename */
const editing = ref<Row | null>(null)
const editName = ref('')
const saving = ref(false)
function openEdit(row: Row) {
  editing.value = row
  editName.value = nameOf(row)
}
async function saveEdit() {
  if (!editing.value || !editName.value.trim()) return
  saving.value = true
  try {
    await $fetch(`/api/v1/admin/${resource.value}/${editing.value.id}`, { method: 'PATCH', body: { [meta.value.nameKey]: editName.value.trim() } })
    toast.add({ title: 'Saved', color: 'success' })
    editing.value = null
    await refresh()
  } catch (e) {
    toast.add({ title: 'Could not save', description: errorMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
}

/* delete */
const deleting = ref<Row | null>(null)
const deletingBusy = ref(false)
async function confirmDelete() {
  if (!deleting.value) return
  deletingBusy.value = true
  try {
    await $fetch(`/api/v1/admin/${resource.value}/${deleting.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Deleted', color: 'success' })
    deleting.value = null
    await refresh()
  } catch (e) {
    toast.add({ title: 'Could not delete', description: errorMessage(e), color: 'error' })
  } finally {
    deletingBusy.value = false
  }
}

useSeoMeta({ title: () => `${meta.value.title} · Admin` })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold">{{ meta.title }} <span v-if="data" class="text-old-neutral-500 text-base font-normal">({{ data.total }})</span></h1>
      <UInput v-model="q" icon="i-heroicons-magnifying-glass" :placeholder="`Search ${meta.title.toLowerCase()}`" />
    </div>

    <UAlert v-if="error" color="error" variant="soft" title="Could not load data" :description="errorMessage(error)" class="mb-4" />

    <div class="rounded-xl bg-white dark:bg-old-neutral-900 shadow-sm overflow-hidden">
      <UTable :data="data?.items ?? []" :columns="columns" :loading="pending">
        <template #name-cell="{ row }">
          <div class="flex items-center gap-2 min-w-0">
            <CoverImage v-if="row.original.cover_url" :src="row.original.cover_url" :size="48" class="size-9 rounded object-cover shrink-0" />
            <NuxtLink v-if="meta.href(row.original.id)" :to="meta.href(row.original.id)" class="font-medium hover:underline truncate">{{ nameOf(row.original) }}</NuxtLink>
            <span v-else class="font-medium truncate">{{ nameOf(row.original) }}</span>
          </div>
        </template>
        <template #owner-cell="{ row }">
          <NuxtLink v-if="row.original.owner" :to="`/authors/${row.original.owner.id}`" class="hover:underline">{{ row.original.owner.username || '—' }}</NuxtLink>
          <span v-else>—</span>
        </template>
        <template #stats-cell="{ row }">
          {{ formatDuration(row.original.duration_seconds) }} · {{ row.original.likes_count ?? 0 }}
        </template>
        <template #count-cell="{ row }">
          {{ row.original.playlist_tracks?.[0]?.count ?? 0 }}
        </template>
        <template #created_at-cell="{ row }">
          {{ row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : '—' }}
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton icon="i-lucide-pencil" size="sm" variant="ghost" color="neutral" :aria-label="`Rename ${meta.one}`" @click="openEdit(row.original)" />
            <UButton icon="i-lucide-trash-2" size="sm" variant="ghost" color="error" :aria-label="`Delete ${meta.one}`" @click="deleting = row.original" />
          </div>
        </template>
      </UTable>
    </div>

    <div v-if="(data?.total ?? 0) > pageSize" class="flex justify-center mt-4">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>

    <UModal :open="!!editing" :title="`Rename ${meta.one}`" @update:open="(v: boolean) => { if (!v) editing = null }">
      <template #body>
        <form id="rename-form" @submit.prevent="saveEdit">
          <UInput v-model="editName" class="w-full" maxlength="200" autofocus />
        </form>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="editing = null">Cancel</UButton>
          <UButton type="submit" form="rename-form" :loading="saving" :disabled="!editName.trim()">Save</UButton>
        </div>
      </template>
    </UModal>

    <UModal
      :open="!!deleting"
      :title="`Delete ${meta.one}?`"
      :description="`“${deleting ? nameOf(deleting) : ''}” will be deleted permanently${resource === 'tracks' ? ' together with its audio file' : ''}.`"
      @update:open="(v: boolean) => { if (!v) deleting = null }"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="deleting = null">Cancel</UButton>
          <UButton color="error" :loading="deletingBusy" @click="confirmDelete">Delete</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
