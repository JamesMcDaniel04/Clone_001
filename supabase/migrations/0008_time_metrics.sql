-- Time metrics to surface AI time-savings and drive faster completion:
--   first_draft_seconds — how long the first AI draft took (shown in the project
--                         header and averaged on Home as the time saved).
--   submitted_at        — when the project reached a completed status ('sent' or
--                         'approved'); created_at → submitted_at is the
--                         completion time shown / averaged on Home.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to re-run.

alter table public.projects add column if not exists first_draft_seconds int;
alter table public.projects add column if not exists submitted_at        timestamptz;

-- Backfill already-completed projects so the Home average isn't empty.
update public.projects
  set submitted_at = updated_at
  where status in ('sent', 'approved') and submitted_at is null and is_template = false;
