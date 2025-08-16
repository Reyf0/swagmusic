<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, watchEffect } from 'vue'

const props = defineProps<{
  width: number
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  position?: 'left' | 'right'
  resizable?: boolean
}>()

const emit = defineEmits<{
  (e: 'resize', width: number): void
}>()

const panelRef = ref<HTMLElement>()
const isResizing = ref(false)
const width = ref(props.width || 240)

let startX = 0
let startWidth = 0
let resizeFrame: number | null = null

// Обновляем текущую ширину, если проп defaultWidth изменился
watch(() => props.defaultWidth, (newWidth) => {
  if (newWidth !== undefined) {
    width.value = newWidth
  }
})

// emit с requestAnimationFrame
const emitResize = (width: number) => {
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
  if (typeof window === 'undefined') return // SSR-safe
  resizeFrame = requestAnimationFrame(() => emit('resize', width))
}

const startResize = (e: MouseEvent) => {
  if (!props.resizable) return

  isResizing.value = true
  startX = e.clientX
  startWidth = width.value

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return

  const deltaX = e.clientX - startX
  let newWidth = startWidth

  if (props.position === 'right') {
    newWidth = startWidth - deltaX
  } else {
    newWidth = startWidth + deltaX
  }

  const minWidth = props.minWidth || 200
  const maxWidth = props.maxWidth || 600

  newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
  width.value = newWidth
  emitResize(newWidth)
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// Восстанавливаем ширину если не ресайзим
watchEffect(() => {
  if (!isResizing.value && props.defaultWidth !== undefined) {
    width.value = props.defaultWidth
  }
})

onMounted(() => {
  emit('resize', width.value)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<template>
  <div
      ref="panelRef"
      class="resizable-panel relative"
      :style="{ width: `${width}px` }"
  >
    <slot />

    <!-- Resizer Handle -->
    <div
        :class="{
        'right-[-1px]': position === 'left',
        'left-[-1px]': position === 'right',
        }"
        class="resizer absolute top-0 h-full w-2 z-50 cursor-col-resize"
        @mousedown="startResize"
    >
      <div
          class="w-[2px] h-full transition-all"
          :class="{
          'bg-blue-500 opacity-100': isResizing,
          'bg-gray-400 opacity-0 hover:opacity-50': !isResizing
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.resizable-panel {
  flex-shrink: 0;
  position: relative;
  transition: width 0.2s ease;
}
</style>

