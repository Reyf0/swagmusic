<script setup lang="ts">
import type { Tables } from '#shared/types'

// Admin inbox: feedback messages and content reports, triaged by status.
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

type FeedbackRow = Omit<Tables<'feedback'>, 'ip_hash'> & { user: { id: string; username: string | null } | null }

const PAGE_SIZE = 30
const supabase = useSupabase()
const toast = useToast()
const newCount = useAdminFeedbackCount()

const statusFilter = ref<FeedbackStatus | 'all'>('new')
const kindFilter = ref<'all' | 'messages' | 'reports'>('all')
const statusItems = [
  ...FEEDBACK_STATUSES.map(value => ({ value, label: FEEDBACK_STATUS_LABELS[value] })),
  { value: 'all' as const, label: 'All' },
]
const kindItems = [
  { value: 'all' as const, label: 'Everything' },
  { value: 'messages' as const, label: 'Messages' },
  { value: 'reports' as const, label: 'Reports' },
]

const items = ref<FeedbackRow[]>([])
const total = ref(0)
const loading = ref(false)
const loadError = ref<string | null>(null)
const notes = reactive<Record<string, string>>({})

async function load(reset = true) {
  loading.value = true
  loadError.value = null
  let query = supabase
    .from('feedback')
    .select('id, created_at, kind, message, email, user_id, target_type, target_id, report_reason, page_url, user_agent, status, admin_note, resolved_at, user:profiles!feedback_user_id_fkey(id, username)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(reset ? 0 : items.value.length, (reset ? 0 : items.value.length) + PAGE_SIZE - 1)
  if (statusFilter.value !== 'all') query = query.eq('status', statusFilter.value)
  if (kindFilter.value === 'reports') query = query.eq('kind', 'report')
  if (kindFilter.value === 'messages') query = query.neq('kind', 'report')
  const { data, count, error } = await query
  loading.value = false
  if (error) {
    loadError.value = error.message
    return
  }
  const rows = (data ?? []) as unknown as FeedbackRow[]
  for (const r of rows) notes[r.id] = r.admin_note ?? ''
  items.value = reset ? rows : items.value.concat(rows)
  total.value = count ?? 0
}

watch([statusFilter, kindFilter], () => load(), { immediate: true })

async function update(row: FeedbackRow, patch: { status?: FeedbackStatus; admin_note?: string | null }) {
  const status = patch.status ?? row.status
  const done = status === 'resolved' || status === 'dismissed'
  const { error } = await supabase
    .from('feedback')
    .update({ ...patch, resolved_at: done ? (row.resolved_at ?? new Date().toISOString()) : null })
    .eq('id', row.id)
  if (error) {
    toast.add({ title: 'Could not save', description: error.message, color: 'error' })
    return false
  }
  if (patch.status && patch.status !== row.status) {
    if (row.status === 'new') newCount.value = Math.max(0, newCount.value - 1)
    if (patch.status === 'new') newCount.value++
  }
  Object.assign(row, patch)
  // Leaves the current filter: drop it from the list.
  if (patch.status && statusFilter.value !== 'all' && patch.status !== statusFilter.value) {
    items.value = items.value.filter(r => r.id !== row.id)
    total.value--
  }
  return true
}

async function saveNote(row: FeedbackRow) {
  if (await update(row, { admin_note: notes[row.id]?.trim() || null })) toast.add({ title: 'Note saved', color: 'success' })
}

const deleting = ref<FeedbackRow | null>(null)
async function confirmDelete() {
  const row = deleting.value
  if (!row) return
  const { error } = await supabase.from('feedback').delete().eq('id', row.id)
  deleting.value = null
  if (error) {
    toast.add({ title: 'Could not delete', description: error.message, color: 'error' })
    return
  }
  if (row.status === 'new') newCount.value = Math.max(0, newCount.value - 1)
  items.value = items.value.filter(r => r.id !== row.id)
  total.value--
}

const kindColor = (row: FeedbackRow) => row.kind === 'report' ? 'error' : row.kind === 'bug' ? 'warning' : row.kind === 'idea' ? 'success' : 'neutral'
const kindLabel = (row: FeedbackRow) => row.kind === 'report'
  ? `Report · ${row.target_type} · ${REPORT_REASON_LABELS[row.report_reason as ReportReason] ?? row.report_reason}`
  : FEEDBACK_KIND_LABELS[row.kind as FeedbackKind] ?? row.kind
const formatDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

useSeoMeta({ title: 'Feedback · Admin' })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold">Feedback <span class="text-old-neutral-500 text-base font-normal">({{ total }})</span></h1>
      <div class="flex gap-2">
        <USelect v-model="kindFilter" :items="kindItems" class="w-36" aria-label="Show" />
        <USelect v-model="statusFilter" :items="statusItems" class="w-36" aria-label="Status" />
      </div>
    </div>

    <UAlert v-if="loadError" color="error" variant="soft" title="Could not load feedback" :description="loadError" class="mb-4" />

    <p v-if="!loading && !items.length && !loadError" class="text-old-neutral-500 py-10 text-center">Nothing here.</p>

    <div class="space-y-3">
      <article v-for="row in items" :key="row.id" class="rounded-xl bg-white dark:bg-old-neutral-900 shadow-sm p-4">
        <header class="flex flex-wrap items-center gap-2 mb-2 text-sm">
          <UBadge :color="kindColor(row)" variant="soft">{{ kindLabel(row) }}</UBadge>
          <span class="text-old-neutral-500">{{ formatDate(row.created_at) }}</span>
          <span class="text-old-neutral-500">·</span>
          <NuxtLink v-if="row.user" :to="`/authors/${row.user.id}`" class="font-medium hover:underline">{{ row.user.username || 'Unnamed user' }}</NuxtLink>
          <span v-else class="text-old-neutral-500">Guest</span>
          <a v-if="row.email" :href="`mailto:${row.email}`" class="text-green-600 dark:text-green-400 hover:underline">{{ row.email }}</a>
          <div class="ml-auto flex items-center gap-1">
            <USelect
              :model-value="row.status as FeedbackStatus"
              :items="statusItems.filter(i => i.value !== 'all')"
              size="sm"
              class="w-32"
              aria-label="Change status"
              @update:model-value="(v: any) => update(row, { status: v })"
            />
            <UButton icon="i-lucide-trash-2" size="sm" variant="ghost" color="error" aria-label="Delete" @click="deleting = row" />
          </div>
        </header>

        <p v-if="row.target_type && row.target_id" class="text-sm mb-2">
          About:
          <NuxtLink :to="reportTargetPath(row.target_type as ReportTarget, row.target_id)" class="text-green-600 dark:text-green-400 hover:underline" target="_blank">
            {{ row.target_type }} {{ row.target_id.slice(0, 8) }}
          </NuxtLink>
        </p>

        <p class="whitespace-pre-wrap break-words">{{ row.message }}</p>

        <div class="mt-2 text-xs text-old-neutral-500 space-y-0.5">
          <div v-if="row.page_url">Page: <NuxtLink :to="row.page_url" class="hover:underline" target="_blank">{{ row.page_url }}</NuxtLink></div>
          <div v-if="row.user_agent" class="truncate" :title="row.user_agent">Browser: {{ row.user_agent }}</div>
        </div>

        <form class="mt-3 flex gap-2 items-start" @submit.prevent="saveNote(row)">
          <UTextarea v-model="notes[row.id]" :rows="1" autoresize placeholder="Internal note" class="flex-1" maxlength="2000" />
          <UButton type="submit" size="sm" variant="soft" color="neutral" :disabled="(notes[row.id] ?? '') === (row.admin_note ?? '')">Save note</UButton>
        </form>
      </article>
    </div>

    <div v-if="items.length < total" class="flex justify-center mt-4">
      <UButton variant="soft" color="neutral" :loading="loading" @click="load(false)">Load more</UButton>
    </div>
    <div v-else-if="loading && !items.length" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-old-neutral-400" />
    </div>

    <UModal :open="!!deleting" title="Delete this message?" description="It will be removed permanently." @update:open="(v: boolean) => { if (!v) deleting = null }">
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="deleting = null">Cancel</UButton>
          <UButton color="error" @click="confirmDelete">Delete</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
