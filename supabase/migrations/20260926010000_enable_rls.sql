-- Close write access for anonymous / other users.
-- Before this, RLS was off on most public tables while anon + authenticated have full table grants,
-- so anyone with the publishable key could update or delete any track, profile, album or playlist.
-- track_authors is intentionally left untouched.

-- ───────────── tracks ─────────────
-- Existing: "Allow read access to all" (select), "Users can insert their tracks" (insert, own).
alter table public.tracks enable row level security;

create policy "Owners update their tracks" on public.tracks
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create policy "Owners delete their tracks" on public.tracks
    for delete to authenticated
    using (user_id = (select auth.uid()));

-- Liking someone else's track updates tracks.likes_count from a trigger. With RLS on tracks
-- that update would be filtered out, so the trigger runs with the owner's rights.
alter function public.fn_update_likes_count() security definer set search_path = public;

-- ───────────── profiles ─────────────
-- Existing: read for all, insert own, update own. is_admin changes are blocked by trg_protect_is_admin.
alter table public.profiles enable row level security;

-- Also forbid creating your own profile row with is_admin = true (profiles are normally made by handle_new_user).
drop policy "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
    for insert
    with check ((select auth.uid()) = id and coalesce(is_admin, false) = false);

-- ───────────── albums ─────────────
alter table public.albums enable row level security;

create policy "Albums are public" on public.albums
    for select using (true);

create policy "Owners create albums" on public.albums
    for insert to authenticated
    with check (user_id = (select auth.uid()) and (author_id is null or author_id = (select auth.uid())));

create policy "Owners update their albums" on public.albums
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create policy "Owners delete their albums" on public.albums
    for delete to authenticated
    using (user_id = (select auth.uid()));

-- ───────────── playlists ─────────────
-- Policies already exist (read all, CRUD own); only RLS itself was off.
alter table public.playlists enable row level security;

-- ───────────── playlist_tracks ─────────────
-- Was: any signed-in user could add tracks to any playlist; nobody could remove or reorder.
drop policy "Enable insert for authenticated users only" on public.playlist_tracks;

create policy "Playlist owners add tracks" on public.playlist_tracks
    for insert to authenticated
    with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = (select auth.uid())));

create policy "Playlist owners update tracks" on public.playlist_tracks
    for update to authenticated
    using (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = (select auth.uid())))
    with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = (select auth.uid())));

create policy "Playlist owners remove tracks" on public.playlist_tracks
    for delete to authenticated
    using (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = (select auth.uid())));

-- ───────────── play_history ─────────────
-- Was: any signed-in user could write listens on behalf of anyone.
drop policy "Enable insert for authenticated users only" on public.play_history;

create policy "Users record their own listens" on public.play_history
    for insert to authenticated
    with check (user_id = (select auth.uid()));

-- ───────────── genres / track_genres / track_embeddings (read-only for clients) ─────────────
alter table public.genres enable row level security;
create policy "Genres are public" on public.genres for select using (true);

alter table public.track_genres enable row level security;
create policy "Track genres are public" on public.track_genres for select using (true);

alter table public.track_embeddings enable row level security;
create policy "Track embeddings are public" on public.track_embeddings for select using (true);

-- ───────────── user_recommendations (own rows only) ─────────────
alter table public.user_recommendations enable row level security;
create policy "Users read their recommendations" on public.user_recommendations
    for select to authenticated
    using (user_id = (select auth.uid()));

-- ───────────── search_logs (server / service role only) ─────────────
alter table public.search_logs enable row level security;
