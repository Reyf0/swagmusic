<template>
  <!-- Same box as <TrackCard variant="carousel">, so nothing moves when the real cards arrive. -->
  <div class="w-44 shrink-0 flex flex-col rounded-lg p-3 bg-old-neutral-100 dark:bg-old-neutral-900 animate-pulse" aria-hidden="true">
    <div class="aspect-square rounded-md mb-3 bg-old-neutral-200 dark:bg-old-neutral-800" />
    <!-- title (24px line) and artist (20px line) -->
    <div class="h-6 flex items-center"><div class="h-4 w-3/4 rounded bg-old-neutral-200 dark:bg-old-neutral-800" /></div>
    <div class="h-5 flex items-center"><div class="h-3 w-1/2 rounded bg-old-neutral-200 dark:bg-old-neutral-800" /></div>
  </div>
</template>
