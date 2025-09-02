<template>
  <div v-if="hasError" class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 text-center">
      <div class="w-16 h-16 mx-auto mb-4">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-16 h-16 text-red-500" />
      </div>
      
      <h1 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Something went wrong
      </h1>
      
      <p class="text-gray-600 dark:text-gray-300 mb-6">
        We're sorry, but an unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
      </p>
      
      <div class="space-y-3">
        <UButton 
          @click="retry" 
          color="primary" 
          size="lg"
          class="w-full text-black"
        >
          Try Again
        </UButton>
        
        <UButton 
          @click="goHome" 
          variant="outline" 
          size="lg"
          class="w-full text-black"
        >
          Go to Home
        </UButton>
        
        <details v-if="errorInfo && isDevelopment" class="mt-4">
          <summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Show error details
          </summary>
          <div class="mt-2 p-3 bg-gray-100 dark:bg-gray-700 text-black dark:text-white rounded text-xs text-left">
            <pre class="whitespace-pre-wrap">{{ errorInfo }}</pre>
          </div>
        </details>
      </div>
    </div>
  </div>
  
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

interface ErrorInfo {
  message: string
  stack?: string
  component?: string
}

const hasError = ref(false)
const errorInfo = ref<ErrorInfo | null>(null)
const isDevelopment = process.env.NODE_ENV === 'development'

// Catch errors from child components
onErrorCaptured((error: Error, instance, info: string) => {
  console.error('Error captured by ErrorBoundary:', error)
  
  hasError.value = true
  errorInfo.value = {
    message: error.message,
    stack: error.stack,
    component: info
  }

  // Log error for monitoring (in production, this could send to external service)
  if (process.client && window.console) {
    console.group('🚨 Application Error')
    console.error('Error:', error)
    console.error('Component info:', info)
    console.error('Instance:', instance)
    console.groupEnd()
  }

  // Prevent the error from propagating further
  return false
})

const retry = () => {
  hasError.value = false
  errorInfo.value = null
  // Force re-render of child components
  window.location.reload()
}

const goHome = () => {
  hasError.value = false
  errorInfo.value = null

  navigateTo('/')
}
</script>