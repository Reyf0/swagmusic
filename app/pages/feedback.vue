<script setup lang="ts">
// Contact / feedback page. Links can preselect the kind (?kind=bug) and pass the page they came from (?from=/path).
const route = useRoute()

const initialKind = computed(() => {
  const k = route.query.kind
  return typeof k === 'string' && (FEEDBACK_KINDS as readonly string[]).includes(k) ? k as typeof FEEDBACK_KINDS[number] : 'bug'
})
const fromPage = computed(() => {
  const f = route.query.from
  return typeof f === 'string' && f.startsWith('/') && !f.startsWith('//') ? f.slice(0, 500) : undefined
})

const sent = ref(false)

useSeoMeta({
  title: 'Feedback',
  description: 'Report a problem, suggest an idea or ask a question about SwagMusic.',
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl">
    <h1 class="text-3xl font-bold mb-2">Feedback</h1>

    <div v-if="sent" class="space-y-4">
      <p class="text-old-neutral-500">Thank you! Your message has been sent. We read everything that comes in.</p>
      <div class="flex gap-2">
        <UButton @click="sent = false">Send another message</UButton>
        <UButton variant="ghost" color="neutral" :to="fromPage ?? '/'">{{ fromPage ? 'Back to where you were' : 'Go home' }}</UButton>
      </div>
    </div>

    <template v-else>
      <p class="text-old-neutral-500 mb-6">
        Found a bug, have an idea or a question? Tell us. To report a track, playlist or artist, use “Report” in its “…” menu.
      </p>
      <FeedbackForm :kind="initialKind" :page-url="fromPage" @sent="sent = true" />
    </template>
  </div>
</template>
