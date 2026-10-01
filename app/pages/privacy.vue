<script setup lang="ts">
const cookieSettingsOpen = useCookieSettingsOpen()

useSeoMeta({
  title: 'Privacy policy',
  description: 'What data SwagMusic collects, why, who processes it and how to get it deleted.',
})
</script>

<template>
  <article class="legal p-4 md:p-6 max-w-3xl">
    <h1>Privacy policy</h1>
    <p class="text-sm text-old-neutral-500">Last updated: 30 September 2026</p>

    <p>
      SwagMusic is a place to listen to music, upload your own tracks and build playlists. This page explains what
      information we collect, why, and what you can do about it. Questions or requests:
      <NuxtLink to="/feedback?kind=question">send us a message</NuxtLink>.
    </p>

    <h2>What we collect</h2>
    <h3>Your account</h3>
    <ul>
      <li>Email address and password (the password is stored only as a secure hash by our authentication provider).</li>
      <li>If you sign in with Google: your email address and name from your Google account.</li>
      <li>What you add to your profile: username, full name, avatar and website. Your username, avatar and website are public.</li>
    </ul>
    <h3>What you publish</h3>
    <ul>
      <li>Tracks you upload (audio, cover, title, lyrics, description), albums and playlists. These are public and anyone can see and play them.</li>
      <li>Some artist pages are not accounts: they show public details of artists on <a href="https://www.jamendo.com" target="_blank" rel="noopener">Jamendo</a> (name, avatar, a link to their Jamendo page) taken from the Jamendo API together with their Creative Commons tracks. We keep them only while the tracks are on Jamendo and remove them when they are gone.</li>
      <li>Co-author credits you accept, which show your name on a track.</li>
    </ul>
    <h3>How you use the site (signed-in users)</h3>
    <ul>
      <li>Tracks you played and when, used for “Recently played” and for popularity charts (charts only show totals, never who listened).</li>
      <li>Tracks you liked and playlists you made. Like counts are public; who liked a track is not.</li>
    </ul>
    <h3>Messages you send us</h3>
    <ul>
      <li>Feedback and reports: your message, your email if you leave one, the page you were on and your browser version.</li>
      <li>To stop spam we keep a one-way hash of your IP address with each message; the address itself is not stored.</li>
    </ul>
    <h3>Technical data</h3>
    <ul>
      <li>Our hosting provider keeps short-lived server logs (such as IP address and requested page) to run and protect the service.</li>
      <li>Only if you allow statistics: anonymous page views (page, referrer, country, device type) through Vercel Web Analytics. It uses no cookies and does not identify you.</li>
    </ul>

    <h2 id="cookies">Cookies and browser storage</h2>
    <table>
      <thead>
        <tr><th>What</th><th>Why</th><th>Kind</th></tr>
      </thead>
      <tbody>
        <tr><td>Sign-in cookies (<code>sb-…-auth-token</code>)</td><td>Keep you signed in</td><td>Necessary</td></tr>
        <tr><td>Theme (<code>nuxt-color-mode</code>)</td><td>Remember light / dark mode</td><td>Necessary</td></tr>
        <tr><td>Volume, recent searches</td><td>Remember your player volume and recent searches in this browser</td><td>Necessary</td></tr>
        <tr><td>Cookie choice (<code>swagmusic:cookie-consent</code>)</td><td>Remember whether you allowed statistics</td><td>Necessary</td></tr>
        <tr><td>Vercel Web Analytics</td><td>Anonymous visit statistics (no cookies)</td><td>Optional, off until you allow it</td></tr>
      </tbody>
    </table>
    <p>
      We do not use advertising or cross-site tracking.
      <button type="button" class="link" @click="cookieSettingsOpen = true">Change your cookie choice</button>.
    </p>

    <h2>Who processes the data</h2>
    <ul>
      <li><b>Supabase</b>: database, sign-in and file storage (servers in the EU, Stockholm).</li>
      <li><b>Vercel</b>: hosting, image resizing and, if you allow it, visit statistics.</li>
      <li><b>Google</b>: only when you choose “Sign in with Google”.</li>
    </ul>
    <p>We do not sell your data or share it with anyone else, except where the law requires it.</p>

    <h2>How long we keep it</h2>
    <p>
      Account data, uploads, likes, playlists and listening history are kept while your account exists.
      Feedback is kept until it has been handled and is no longer needed. If you ask us to delete your account,
      we delete your profile together with your uploads, playlists, likes and listening history.
    </p>

    <h2>Your choices and rights</h2>
    <ul>
      <li>Edit your profile on the <NuxtLink to="/profile">Profile</NuxtLink> page; delete your tracks, playlists and likes at any time.</li>
      <li>Ask for a copy of your data, a correction or deletion of your account through the <NuxtLink to="/feedback?kind=question">feedback form</NuxtLink>. We answer within 30 days.</li>
      <li>Turn visit statistics on or off at any time in <button type="button" class="link" @click="cookieSettingsOpen = true">cookie settings</button>.</li>
    </ul>

    <h2>Children</h2>
    <p>SwagMusic is not intended for children under 13, and we do not knowingly collect their data.</p>

    <h2>Changes</h2>
    <p>If this policy changes in an important way, we will update the date above and, where needed, ask for your choice again.</p>
  </article>
</template>

