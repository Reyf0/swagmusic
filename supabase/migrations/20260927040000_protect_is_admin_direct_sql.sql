-- protect_is_admin treated a missing JWT as 'anon', so even the postgres role in the SQL Editor
-- (or a migration) could not change is_admin. Requests through the Supabase API always carry
-- request.jwt.claims; direct database connections don't, and are trusted.
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    claims text := nullif(current_setting('request.jwt.claims', true), '');
begin
    if new.is_admin is distinct from old.is_admin
        and claims is not null
        and coalesce(claims::jsonb ->> 'role', 'anon') <> 'service_role'
    then
        raise exception 'Forbidden to change is_admin';
    end if;
    return new;
end;
$$;
