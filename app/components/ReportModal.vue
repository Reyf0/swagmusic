<script setup lang="ts">
// Global "Report" dialog for a track, album, playlist or artist; opened by setting useReportSubject().
const subject = useReportSubject()
const user = useSupabaseUser()
const toast = useToast()
const { send, sending } = useFeedback()

const reasonItems = REPORT_REASONS.map(value => ({ value, label: REPORT_REASON_LABELS[value] }))
const reason = ref<ReportReason>('offensive')
const details = ref('')
const email = ref('')
const website = ref('') // honeypot
const errorMessage = ref<string | null>(null)

const open = computed({
  get: () => !!subject.value,
  set: (v) => { if (!v) subject.value = null },
})

watch(open, (v) => {
  if (!v) return
  reason.value = 'offensive'
  details.value = ''
  errorMessage.value = null
})

const noun = computed(() => subject.value?.type === 'artist' ? 'artist' : subject.value?.type ?? 'item')

async function submit() {
  if (!subject.value) return
  errorMessage.value = null
  if (reason.value === 'copyright' && !details.value.trim()) {
    errorMessage.value = 'Please describe which work is yours and how we can reach you.'
    return
  }
  try {
    await send({
      kind: 'report',
      target_type: subject.value.type,
      target_id: subject.value.id,
      report_reason: reason.value,
      message: details.value.trim() || REPORT_REASON_LABELS[reason.value],
      email: user.value ? undefined : email.value,
      page_url: window.location.pathname,
      website: website.value,
    })
    subject.value = null
    toast.add({ title: 'Report sent', description: 'Thank you. We will review it.', color: 'success' })
  } catch (e: any) {
    errorMessage.value = e.message
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="`Report ${noun}`" :description="subject?.title">
    <template #body>
      <form id="report-form" class="space-y-4" novalidate @submit.prevent="submit">
        <UFormField label="What is wrong?">
          <URadioGroup v-model="reason" :items="reasonItems" />
        </UFormField>
        <UFormField
          label="Details"
          :required="reason === 'copyright'"
          :hint="reason === 'copyright' ? undefined : 'Optional'"
          :description="reason === 'copyright' ? 'Which work is yours, and how can we confirm it?' : undefined"
        >
          <UTextarea v-model="details" :rows="4" autoresize :maxlength="FEEDBACK_MESSAGE_MAX" class="w-full" />
        </UFormField>
        <UFormField v-if="!user" label="Email" hint="Optional" description="Only if you would like a reply.">
          <UInput v-model="email" type="email" autocomplete="email" class="w-full" />
        </UFormField>
        <div class="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
          <label>Website <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off"></label>
        </div>
        <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" />
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="open = false">Cancel</UButton>
        <UButton type="submit" form="report-form" color="error" :loading="sending">Send report</UButton>
      </div>
    </template>
  </UModal>
</template>
