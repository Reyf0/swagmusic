<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  position?: 'left' | 'right'
  resizable?: boolean
}>()

const emit = defineEmits<{
  'resize': [width: number]
}>()

const panelRef = ref<HTMLElement>()
const resizerRef = ref<HTMLElement>()
const isResizing = ref(false)
const currentWidth = ref(props.defaultWidth || 240)

let startX = 0
let startWidth = 0

// Watch for changes to defaultWidth prop and update currentWidth accordingly
watch(() => props.defaultWidth, (newWidth) => {
  if (newWidth !== undefined) {
    currentWidth.value = newWidth
  }
})

const startResize = (e: MouseEvent) => {
  if (!props.resizable) return

  isResizing.value = true
  startX = e.clientX
  startWidth = currentWidth.value

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

  // Apply constraints
  const minWidth = props.minWidth || 200
  const maxWidth = props.maxWidth || 600

  newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

  currentWidth.value = newWidth
  emit('resize', newWidth)
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  emit('resize', currentWidth.value)
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
    :style="{ width: `${currentWidth}px` }"
  >
    <slot />

    <!-- Resizer Handle -->
    <div
      v-if="resizable"
      ref="resizerRef"
      @mousedown="startResize"
      class="resizer absolute top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-10"
      :class="{
        'right-0': position === 'left',
        'left-0': position === 'right',
        'bg-blue-500': isResizing,
        'bg-transparent hover:bg-gray-400': !isResizing
      }"
    >
      <!-- Visual indicator -->
      <div 
        class="absolute inset-y-0 w-1 transition-all duration-200"
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
}

.resizer {
  background: transparent;
}

.resizer:hover {
  background: rgba(59, 130, 246, 0.3);
}

.resizer.active {
  background: rgba(59, 130, 246, 0.6);
}

/* Prevent text selection during resize */
.resizer:active {
  user-select: none;
}
</style>
