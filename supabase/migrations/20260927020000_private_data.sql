-- Personal data is visible only to its owner and to admins.
-- Before this, anyone (even without signing in) could read every user's email, settings and
-- admin flag, their full listening history and their likes.
--
-- Admins read everything through the server API (service role, see server/utils/requireAdmin.ts)
-- and, for the tables below, directly through RLS via public.is_admin().

-- ───────────── helper ─────────────
-- SECURITY DEFINER: reads profiles.is_admin, which clients can no longer select themselves.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false)
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ───────────── profiles: hide email, settings, is_admin from other users ─────────────
-- Column privileges can't depend on the row, so clients may only select the public columns
-- of any profile, and read their own full row through get_my_profile().
-- New columns added to profiles later are NOT readable by clients until granted here.
revoke select on public.profiles from anon, authenticated;
grant select (id, username, full_name, avatar_url, website, slug, created_at, updated_at)
    on public.profiles to anon, authenticated;

-- Users edit only these columns of their own row (RLS "profiles_update_own");
-- email mirrors auth.users and is_admin is set by admins through the server API.
revoke update on public.profiles from anon, authenticated;
grant update (username, full_name, avatar_url, website, slug, settings, updated_at)
    on public.profiles to authenticated;

-- The signed-in user's own profile, including the private columns.
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
    select * from public.profiles where id = (select auth.uid())
$$;

-- Supabase grants EXECUTE on new functions to anon explicitly, so revoke from anon as well.
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- ───────────── play_history: own listens only ─────────────
drop policy "Enable read access for all users" on public.play_history;
create policy "Users read their listens, admins read all" on public.play_history
    for select to authenticated
    using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Charts only return track ids and play counts, so they may count everyone's listens.
alter function public.get_popular_tracks(integer) security definer set search_path = public, extensions;
alter function public.get_trending(integer, integer) security definer set search_path = public, extensions;
alter function public.get_related_tracks(uuid, integer) security definer set search_path = public, extensions;

-- ───────────── likes: own likes only (tracks.likes_count stays public) ─────────────
drop policy "Enable read access for all users" on public.likes;
create policy "Users read their likes, admins read all" on public.likes
    for select to authenticated
    using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ───────────── recommendations / search logs ─────────────
drop policy "Users read their recommendations" on public.user_recommendations;
create policy "Users read their recommendations, admins read all" on public.user_recommendations
    for select to authenticated
    using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins read search logs" on public.search_logs
    for select to authenticated
    using ((select public.is_admin()));
