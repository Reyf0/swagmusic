# SwagMusic

A music streaming app: upload tracks, credit co-authors, build playlists and albums, like tracks and listen in a desktop / mobile player.

**Stack:** Nuxt 4 · Nuxt UI 4 (Tailwind 4) · Pinia · Howler.js · Supabase (Postgres, Auth, Storage) · Sentry

## Getting started

```bash
npm install
cp .env.example .env   # then fill in the values
npm run dev            # http://localhost:3000
```

### Environment

| Variable | Where to find it | Used by |
| --- | --- | --- |
| `NUXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | browser + server |
| `NUXT_PUBLIC_SUPABASE_KEY` | Publishable key (`sb_publishable_…`) | browser + server |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`) | server only (admin API) |
| `NUXT_PUBLIC_SENTRY_DSN` | Sentry project settings (optional) | error reporting |
| `NUXT_SITE_URL` | Public URL of the site (optional) | SEO module |

Older names (`SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, …) are still read as fallbacks, see `nuxt.config.ts`.

In the Supabase dashboard (Authentication → URL Configuration) add `http://localhost:3000/**` and your production / preview URLs to the redirect URLs. Sign-in links, OAuth and password resets land on `/confirm` and `/reset-password`.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `npm run preview` | production build / run it locally |
| `npm run test:unit` | unit tests (Vitest + `@nuxt/test-utils`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `vue-tsc` type check |
| `npm run gen:types` | regenerate `shared/types/generated/database.types.ts` (needs `npx supabase login`) |

## Project layout

```
app/
  components/   TrackList, TrackCard, TrackMenu, LikeButton, player/ (desktop bar, mobile player, views)
  composables/  data access (useTracksApi, usePlaylistsApi, useLikesApi, useStorageUpload, …)
  pages/        routes; admin/ is client-rendered and guarded by the `admin` middleware
  plugins/      00.supabase.ts creates the cookie-based Supabase client (SSR-aware auth)
  stores/       Pinia: player, tracks, likes, playlists, studio, profile, settings
  utils/        toTrack() normalizer, slug, storage helpers, formatting
server/
  api/v1/       admin-only endpoints (users, content moderation, stats) — see server/utils/requireAdmin.ts
shared/
  types/        UI types + generated Supabase types
supabase/
  migrations/   SQL migrations
tests/unit/     Vitest unit tests
```

### Data model in short

- `tracks` — audio in the public `tracks` bucket, covers in `covers`; `track_authors` credits profiles on a track (`status`: `approved` / `pending` / `declined`). Only approved credits are shown; pending ones appear as invites in **Studio**.
- `albums` (owner `user_id`), `playlists` + `playlist_tracks` (ordered by `position`), `likes` (`target_type` = `track`), `play_history`.
- The UI always works with the normalized `Track` type (`shared/types/index.ts`) produced by `toTrack()` (`app/utils/tracks.ts`).

## Deployment

Deployed on Vercel (Nitro auto-detects the preset). Set the environment variables above for Production and Preview.
