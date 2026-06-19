-- Library entries become free-form knowledge content instead of question/answer
-- pairs: each entry is now a titled block of text that's either pasted in or
-- extracted from an uploaded file (.pdf/.docx/.txt). The category + review
-- workflow (status, reviewer, next review) is unchanged — only the shape of an
-- entry changes. `title` keeps the old `question` (NOT NULL) data; `content`
-- keeps the old `answer` text. Run in the Supabase SQL editor (or `supabase db
-- push`). Safe to re-run.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'library_entries' and column_name = 'question'
  ) then
    alter table public.library_entries rename column question to title;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'library_entries' and column_name = 'answer'
  ) then
    alter table public.library_entries rename column answer to content;
  end if;
end $$;

-- Where the content came from, for display: 'text' (pasted) or 'file' (uploaded).
alter table public.library_entries add column if not exists source_type text;
alter table public.library_entries add column if not exists file_type  text;   -- pdf | docx | txt (when source_type = 'file')
alter table public.library_entries add column if not exists file_size  int;

-- Pre-existing Q&A entries are pasted text from here on.
update public.library_entries set source_type = 'text' where source_type is null;
