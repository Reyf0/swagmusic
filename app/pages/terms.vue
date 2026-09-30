<script setup lang="ts">
useSeoMeta({
  title: 'Terms of use',
  description: 'The rules for using SwagMusic: accounts, uploading music, what is not allowed and how reports are handled.',
})
</script>

<template>
  <article class="legal p-4 md:p-6 max-w-3xl">
    <h1>Terms of use</h1>
    <p class="text-sm text-old-neutral-500">Last updated: 30 September 2026</p>

    <p>
      By using SwagMusic you agree to these terms. If you do not agree, please do not use the site.
      How we handle your data is described in the <NuxtLink to="/privacy">Privacy policy</NuxtLink>.
    </p>

    <h2>Your account</h2>
    <ul>
      <li>You must be at least 13 years old to create an account.</li>
      <li>Keep your password safe; you are responsible for what happens under your account.</li>
      <li>Pick a username that does not pretend to be someone else.</li>
    </ul>

    <h2>Music you upload</h2>
    <ul>
      <li>Upload only music you made or have the right to share. You keep all rights to your music.</li>
      <li>By uploading, you allow SwagMusic to store your tracks and covers and to let anyone stream them on the site, for as long as they are published. Deleting a track withdraws this permission.</li>
      <li>When you credit co-authors, make sure they really took part; they can accept or decline the credit.</li>
    </ul>

    <h2>What is not allowed</h2>
    <ul>
      <li>Uploading someone else's work without permission.</li>
      <li>Content that is illegal, hateful, harassing, or sexual content involving minors.</li>
      <li>Spam, misleading titles or artwork, and fake accounts.</li>
      <li>Attempts to break, overload or get around the security of the service, or to collect other users' data.</li>
    </ul>

    <h2>Reports and removal</h2>
    <p>
      Anyone can report a track, album, playlist or artist with “Report” in its menu. If you believe your work is used
      without permission, choose “It uses my work without permission” and tell us which work is yours.
      We may remove content or suspend accounts that break these terms, usually after looking at a report.
    </p>

    <h2>The service</h2>
    <p>
      SwagMusic is provided as is. We work to keep it available and your uploads safe, but we cannot promise it will
      always be online or free of errors, and features may change. Keep your own copies of your music.
    </p>

    <h2>Changes</h2>
    <p>
      We may update these terms; the date above shows the latest version. If you keep using SwagMusic after a change,
      the new terms apply.
    </p>

    <h2>Contact</h2>
    <p>Questions about these terms: <NuxtLink to="/feedback?kind=question">send us a message</NuxtLink>.</p>
  </article>
</template>
