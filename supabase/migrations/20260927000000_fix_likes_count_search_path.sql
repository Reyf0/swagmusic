-- Fix for 20260926010000_enable_rls: fn_update_likes_count got `search_path = public`, but the
-- tracks update it performs fires tracks_search_trigger, which calls unaccent() from the
-- `extensions` schema. With only `public` on the path every like failed with
-- "function unaccent(text) does not exist".
alter function public.fn_update_likes_count() set search_path = public, extensions;
