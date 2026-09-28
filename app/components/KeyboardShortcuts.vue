<script setup lang="ts">
// List of the global keyboard shortcuts (see useHotkeys). Opened with "?" or from the account menu.
const open = useShortcutsOpen()
</script>

<template>
  <UModal v-model:open="open" title="Keyboard shortcuts">
    <template #body>
      <ul class="divide-y divide-old-neutral-200 dark:divide-old-neutral-800">
        <li v-for="hotkey in HOTKEYS" :key="hotkey.label" class="flex items-center justify-between gap-4 py-2.5">
          <span>{{ hotkey.label }}</span>
          <span class="flex items-center gap-1 shrink-0">
            <UKbd v-for="key in hotkey.keys" :key="key" :value="key" />
          </span>
        </li>
      </ul>
      <p class="mt-4 text-sm text-old-neutral-500">Shortcuts don't work while you're typing in a field.</p>
    </template>
  </UModal>
</template>
