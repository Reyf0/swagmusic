-- Who may read track credits (track_authors). RLS was on without any SELECT rule, so nobody could
-- read credits and every track showed "Unknown artist".

-- Accepted credits are public: they are the artist names shown on tracks.
-- ('approved' is the old name of 'accepted', still on older rows.)
create policy "Accepted credits are public" on public.track_authors
    for select
    using (status in ('accepted', 'approved'));

-- Pending / rejected invites are visible only to the people involved (Studio → Invites) and to admins.
create policy "Involved users and admins see all credits" on public.track_authors
    for select to authenticated
    using (
        profile_id = (select auth.uid())
        or invited_by = (select auth.uid())
        or exists (select 1 from public.tracks t where t.id = track_id and t.user_id = (select auth.uid()))
        or (select public.is_admin())
    );
