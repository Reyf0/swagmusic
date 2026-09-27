<script setup lang="ts">
import type { Credit } from '~/stores/studio'
import type { PickedAuthor } from '~/components/AuthorPicker.vue'

// Co-authors of a track the current user owns: see invite status, cancel / remove, invite more.
// Changes apply immediately (they don't wait for the edit dialog's Save).
const props = defineProps<{ trackId: string }>()

const toast = useToast()
const user = useSupabaseUser()
const studioStore = useStudioStore()

const credits = ref<Credit[]>([])
const loading = ref(false)
const picked = ref<PickedAuthor[]>([])
const inviting = ref(false)
const removingId = ref<number | null>(null)

const STATUS_LABEL: Record<string, { label: string; color: 'success' | 'warning' | 'neutral' }> = {
  accepted: { label: 'Credited', color: 'success' },
  approved: { label: 'Credited', color: 'success' },
  pending: { label: 'Invite pending', color: 'warning' },
  rejected: { label: 'Declined', color: 'neutral' },
}

async function load() {
  loading.value = true
  try {
    credits.value = await studioStore.loadCredits(props.trackId)
  } catch (e: any) {
    toast.add({ title: 'Could not load co-authors', description: e?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
watch(() => props.trackId, () => {
  picked.value = []
  load()
}, { immediate: true })

const isMe = (c: Credit) => c.profile_id === user.value?.id
// Already on the track (in any status) or me: can't be invited again.
const excluded = computed(() => [...credits.value.map(c => c.profile_id), ...(user.value ? [user.value.id] : [])])

async function invite() {
  if (!picked.value.length) return
  inviting.value = true
  try {
    const next = Math.max(-1, ...credits.value.map(c => c.order_index ?? 0)) + 1
    await studioStore.inviteCoAuthors(props.trackId, picked.value.map(a => a.id), next)
    toast.add({ title: picked.value.length === 1 ? 'Invite sent' : 'Invites sent', description: picked.value.map(a => a.username).join(', '), color: 'success' })
    picked.value = []
    await load()
  } catch (e: any) {
    toast.add({ title: 'Could not send invite', description: e?.message, color: 'error' })
  } finally {
    inviting.value = false
  }
}

async function remove(c: Credit) {
  removingId.value = c.id
  try {
    await studioStore.removeCredit(c.id)
    credits.value = credits.value.filter(x => x.id !== c.id)
    toast.add({ title: c.status === 'pending' ? 'Invite cancelled' : 'Co-author removed', description: c.profile?.username ?? undefined, color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Could not update co-authors', description: e?.message, color: 'error' })
  } finally {
    removingId.value = null
  }
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="loading && !credits.length" class="text-sm text-old-neutral-500">Loading co-authors…</div>

    <ul v-else class="space-y-2">
      <li v-for="c in credits" :key="c.id" class="flex items-center gap-3">
        <UAvatar :src="c.profile?.avatar_url ?? undefined" :alt="c.profile?.username ?? undefined" size="sm" />
        <span class="flex-1 min-w-0 truncate text-sm">
          {{ c.profile?.username || 'Unknown user' }}<span v-if="isMe(c)" class="text-old-neutral-500"> (you)</span>
        </span>
        <UBadge :color="STATUS_LABEL[c.status]?.color ?? 'neutral'" variant="subtle" size="sm">
          {{ STATUS_LABEL[c.status]?.label ?? c.status }}
        </UBadge>
        <UButton
          v-if="!isMe(c)"
          size="xs"
          color="neutral"
          variant="ghost"
          :loading="removingId === c.id"
          :aria-label="c.status === 'pending' ? `Cancel invite for ${c.profile?.username}` : `Remove ${c.profile?.username}`"
          @click="remove(c)"
        >
          {{ c.status === 'pending' ? 'Cancel invite' : 'Remove' }}
        </UButton>
      </li>
    </ul>

    <div class="flex gap-2 items-start">
      <div class="flex-1 min-w-0">
        <AuthorPicker v-model="picked" :exclude="excluded" />
      </div>
      <UButton :loading="inviting" :disabled="!picked.length" @click="invite">Invite</UButton>
    </div>
  </div>
</template>
