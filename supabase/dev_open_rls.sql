-- ⚠️ TEMPORARY — no-login test mode.
-- Disables Row-Level Security so the anon (publishable) key can read/write with no
-- signed-in user (pair with VITE_DISABLE_AUTH=true). This makes the database fully open
-- to anyone holding the anon key + URL. Fine for local testing with a couple of people;
-- NOT for production. Revert with supabase/dev_close_rls.sql before deploying or sharing.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','categories','library_entries','tags','merge_variables',
    'projects','project_sections','project_entries'
  ] loop
    -- drop the anon policy from the earlier version of this script, if present
    execute format('drop policy if exists %I on public.%I;', t || '_anon_all', t);
    execute format('alter table public.%I disable row level security;', t);
  end loop;
end $$;
