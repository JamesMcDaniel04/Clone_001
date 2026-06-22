-- Tag integrity for production: make tags first-class on library entries.
--   • Fast filtering of library_entries by their tags[] array (GIN index).
--   • Case-insensitive tag uniqueness, so "PII" and "pii" can't both exist.
--   • Helpers to keep library_entries.tags[] consistent when a tag is renamed or
--     deleted, and to count how many entries use each tag.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to re-run.
--
-- NOTE: the case-insensitive unique index will fail to create if the tags table
-- already contains case-duplicate names. The pre-step below collapses any such
-- duplicates (keeps the oldest row) before the index is added.

-- ── Collapse pre-existing case-duplicate tags (idempotent) ───────────────────
delete from public.tags t
using public.tags keep
where lower(t.name) = lower(keep.name)
  and t.created_at > keep.created_at;

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists library_entries_tags_idx
  on public.library_entries using gin (tags);

create unique index if not exists tags_name_lower_idx
  on public.tags (lower(name));

-- ── Tag maintenance helpers (security invoker: run under the caller's RLS) ────
-- Remove a tag from every library entry that carries it.
create or replace function public.remove_tag_from_entries(tag_name text)
returns void language sql as $$
  update public.library_entries
  set tags = array_remove(tags, tag_name)
  where tags @> array[tag_name];
$$;

-- Rename a tag across every library entry that carries it.
create or replace function public.rename_tag_in_entries(old_name text, new_name text)
returns void language sql as $$
  update public.library_entries
  set tags = array_replace(tags, old_name, new_name)
  where tags @> array[old_name];
$$;

-- How many library entries use each tag → [{ tag, count }, …].
create or replace function public.tag_usage_counts()
returns table(tag text, count bigint) language sql stable as $$
  select t as tag, count(*) as count
  from public.library_entries, unnest(tags) as t
  group by t;
$$;
