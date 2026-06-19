-- Library content can now be imported from a web page URL (the platform fetches
-- the page and extracts its text). Record where it came from for provenance.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to re-run.

alter table public.library_entries   add column if not exists source_url text;
alter table public.library_documents  add column if not exists source_url text;
