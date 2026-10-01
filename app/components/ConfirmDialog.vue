<script setup lang="ts">
// "Are you sure?" dialog for destructive actions. The parent closes it (v-model:open) after `confirm`.
withDefaults(defineProps<{
  title: string
  description?: string
  confirmLabel?: string
  /** Shows a spinner on the confirm button while the action runs. */
  loading?: boolean
}>(), {
  description: undefined,
  confirmLabel: 'Delete',
  loading: false,
})
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="open = false">Cancel</UButton>
        <UButton color="error" :loading="loading" @click="emit('confirm')">{{ confirmLabel }}</UButton>
      </div>
    </template>
  </UModal>
</template>
