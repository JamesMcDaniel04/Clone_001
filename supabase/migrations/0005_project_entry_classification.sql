-- Claude now classifies every drafted answer into one of three review buckets,
-- persisted as first-class project_entry statuses:
--   'approved'      — confidently grounded in the library; safe to send.
--   'needs_review'  — answered, but a human should validate (legal / engineering
--                     sign-off, a known limitation, or weak grounding).
--   'gap'           — the library doesn't cover this question yet (no real answer
--                     on file). Replaces the old 'withheld'.
-- The legacy 'needs_legal' / 'needs_engineering' / 'withheld' values are migrated
-- onto the new buckets (the specific reason still lives in flag_type/flag_reason).
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to re-run.

alter table public.project_entries drop constraint if exists project_entries_status_check;
alter table public.project_entries
  add constraint project_entries_status_check
  check (status in ('draft','edited','approved','needs_review','gap','needs_legal','needs_engineering','withheld'));

-- Collapse the legacy statuses onto the three Claude buckets.
update public.project_entries set status = 'gap'          where status = 'withheld';
update public.project_entries set status = 'needs_review' where status in ('needs_legal','needs_engineering');
