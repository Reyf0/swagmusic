<script setup lang="ts">
// Password field with a show / hide button. Other attributes (autocomplete, required, class…) go to the input.
defineOptions({ inheritAttrs: false })
const model = defineModel<string>({ default: '' })
const visible = ref(false)
</script>

<template>
  <UInput v-model="model" v-bind="$attrs" :type="visible ? 'text' : 'password'" :ui="{ trailing: 'pe-1' }">
    <template #trailing>
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        :icon="visible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        :aria-pressed="visible"
        @click="visible = !visible"
      />
    </template>
  </UInput>
</template>
