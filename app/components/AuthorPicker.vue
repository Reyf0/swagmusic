<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

export type PickedAuthor = { id: string; username: string | null }

// Multi-select for co-authors: search profiles by username.
const props = defineProps<{
  /** Profile ids that cannot be picked (e.g. the uploader). */
  exclude?: string[]
}>()

const model = defineModel<PickedAuthor[]>({ default: () => [] })

const supabase = useSupabase()
const searchTerm = ref('')
const options = ref<PickedAuthor[]>([])
const loading = ref(false)

const search = useDebounceFn(async (term: string) => {
  const q = term.trim()
  if (!q) {
    options.value = []
    return
  }
  loading.value = true
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', `%${escapeLike(q)}%`)
    .not('username', 'is', null)
    .limit(10)
  loading.value = false
  if (error) {
    console.error('Error fetching authors:', error)
    return
  }
  const excluded = new Set(props.exclude ?? [])
  options.value = (data ?? []).filter(p => !excluded.has(p.id))
}, 300)

watch(searchTerm, term => search(term))

// Keep already-picked authors in the item list so their chips render.
const items = computed(() => {
  const byId = new Map<string, PickedAuthor>()
  for (const a of [...model.value, ...options.value]) byId.set(a.id, a)
  return [...byId.values()]
})
</script>

<template>
  <UInputMenu
    v-model="model"
    v-model:search-term="searchTerm"
    :items="items"
    multiple
    ignore-filter
    by="id"
    label-key="username"
    :loading="loading"
    placeholder="Search artists by username…"
    icon="i-heroicons-user-plus"
    class="w-full"
  >
    <template #empty>
      {{ searchTerm.trim() ? 'No artists found' : 'Start typing a username' }}
    </template>
  </UInputMenu>
</template>
