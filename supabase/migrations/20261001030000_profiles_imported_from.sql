-- Profiles created by scripts/import-jamendo.ts for Jamendo artists, who never signed up here.
-- The artist page says so (Jamendo's API terms forbid impersonating their members).
alter table public.profiles add column if not exists imported_from text;

-- Public like username: see the column grants in 20260927020000_private_data.sql.
grant select (imported_from) on public.profiles to anon, authenticated;
