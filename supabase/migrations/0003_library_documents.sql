-- Library documents: the knowledge "brain". Uploaded certifications, policies, and
-- reports (SOC 2, GDPR, ISO, pen-test summaries, …) whose extracted text grounds the
-- AI drafter alongside the answer library and previously-answered questions.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to re-run.

create table if not exists public.library_documents (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid references public.categories(id) on delete set null,
  name           text not null,
  doc_type       text,                 -- free label: "SOC 2 Type II", "GDPR DPA", "ISO 27001", …
  file_type      text,                 -- pdf | docx | txt
  file_size      int,
  extracted_text text,                 -- searchable / grounding text pulled from the file
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists library_documents_category_idx on public.library_documents(category_id);

drop trigger if exists t_library_documents_updated on public.library_documents;
create trigger t_library_documents_updated before update on public.library_documents
  for each row execute function public.touch_updated_at();

alter table public.library_documents enable row level security;
drop policy if exists "library_documents_authed_all" on public.library_documents;
create policy "library_documents_authed_all" on public.library_documents
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
