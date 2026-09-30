-- Feedback from visitors (bug reports, ideas, questions) and reports about content.
-- Messages are written only by the server (POST /api/v1/feedback, service role), which validates
-- them and limits how often one person can send; clients cannot insert directly.
-- Admins read and triage them in the admin panel.

create table public.feedback (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    kind text not null check (kind in ('bug', 'idea', 'question', 'other', 'report')),
    message text not null check (char_length(message) between 1 and 5000),
    -- Contact address for a reply (guests); signed-in senders are linked through user_id.
    email text check (email is null or char_length(email) <= 254),
    user_id uuid references public.profiles (id) on delete set null,
    -- What a report is about.
    target_type text check (target_type in ('track', 'album', 'playlist', 'artist')),
    target_id uuid,
    report_reason text check (report_reason in ('copyright', 'offensive', 'spam', 'other')),
    -- Context that helps to reproduce a bug.
    page_url text check (char_length(page_url) <= 500),
    user_agent text check (char_length(user_agent) <= 500),
    -- Keyed hash of the sender's IP, only for rate limiting (the address itself is not stored).
    ip_hash text,
    status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'dismissed')),
    admin_note text check (char_length(admin_note) <= 2000),
    resolved_at timestamptz,
    constraint feedback_report_target check (
        (kind = 'report') = (target_type is not null and target_id is not null and report_reason is not null)
    )
);

create index feedback_status_created_idx on public.feedback (status, created_at desc);
create index feedback_ip_hash_created_idx on public.feedback (ip_hash, created_at desc);
create index feedback_user_created_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

-- No client inserts; admins read, triage (status / note) and delete.
revoke all on public.feedback from anon, authenticated;
grant select, delete on public.feedback to authenticated;
grant update (status, admin_note, resolved_at) on public.feedback to authenticated;

create policy "Admins read feedback" on public.feedback
    for select to authenticated
    using ((select public.is_admin()));

create policy "Admins triage feedback" on public.feedback
    for update to authenticated
    using ((select public.is_admin()))
    with check ((select public.is_admin()));

create policy "Admins delete feedback" on public.feedback
    for delete to authenticated
    using ((select public.is_admin()));
