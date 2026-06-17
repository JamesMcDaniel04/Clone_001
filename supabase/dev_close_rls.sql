-- Re-lock the database: re-enable Row-Level Security and remove any temporary anon
-- test policies. The original signed-in-user policies from 0001_init.sql become active
-- again. After running this, set VITE_DISABLE_AUTH=false and use Google sign-in.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','categories','library_entries','tags','merge_variables',
    'projects','project_sections','project_entries'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_anon_all', t);
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;
