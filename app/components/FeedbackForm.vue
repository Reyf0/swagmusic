<script setup lang="ts">
// Feedback form: what kind of message, the message itself and, for guests, an address for a reply.
type FormKind = typeof FEEDBACK_KINDS[number]

const props = withDefaults(defineProps<{
  kind?: FormKind
  /** Page the visitor came from, attached to help reproduce bugs. */
  pageUrl?: string
}>(), {
  kind: 'bug',
  pageUrl: undefined,
})
const emit = defineEmits<{ sent: [] }>()

const user = useSupabaseUser()
const { send, sending } = useFeedback()

const kindItems = FEEDBACK_KINDS.map(value => ({ value, label: FEEDBACK_KIND_LABELS[value] }))
const kind = ref<FormKind>(props.kind)
const message = ref('')
const email = ref('')
const website = ref('') // honeypot
const errorMessage = ref<string | null>(null)

const placeholder = computed(() => ({
  bug: 'What happened, and what did you expect? Steps to reproduce help a lot.',
  idea: 'What would make SwagMusic better for you?',
  question: 'What would you like to know?',
  other: 'Your message',
})[kind.value])

async function submit() {
  errorMessage.value = null
  if (!message.value.trim()) {
    errorMessage.value = 'Please write a message.'
    return
  }
  try {
    await send({
      kind: kind.value,
      message: message.value,
      email: user.value ? undefined : email.value,
      page_url: props.pageUrl,
      website: website.value,
    })
    message.value = ''
    emit('sent')
  } catch (e: any) {
    errorMessage.value = e.message
  }
}
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="submit">
    <UFormField label="What is it about?">
      <URadioGroup v-model="kind" :items="kindItems" />
    </UFormField>

    <UFormField label="Message" required :hint="`${message.length} / ${FEEDBACK_MESSAGE_MAX}`">
      <UTextarea v-model="message" :placeholder="placeholder" :rows="6" autoresize :maxlength="FEEDBACK_MESSAGE_MAX" class="w-full" />
    </UFormField>

    <UFormField v-if="!user" label="Email" hint="Optional" description="Only if you would like a reply.">
      <UInput v-model="email" type="email" autocomplete="email" placeholder="you@example.com" class="w-full" />
    </UFormField>

    <!-- Honeypot: hidden from people and screen readers; bots tend to fill it in. -->
    <div class="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
      <label>Website <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off"></label>
    </div>

    <p class="text-xs text-old-neutral-500">
      Along with your message we save the page address and your browser version, to help us fix problems.
    </p>

    <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" />

    <UButton type="submit" :loading="sending" icon="i-lucide-send">Send</UButton>
  </form>
</template>
