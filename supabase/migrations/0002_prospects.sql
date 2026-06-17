-- Prospects/clients managed in Settings (replaces the hardcoded dropdown list).
-- Run in the Supabase SQL editor. Safe to re-run.

create table if not exists public.prospects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

alter table public.prospects enable row level security;
drop policy if exists "prospects_authed_all" on public.prospects;
create policy "prospects_authed_all" on public.prospects
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

insert into public.prospects (name)
select v.name from (values ('Cvent'), ('Govini'), ('AdaIQ'), ('Energy Toolbase')) as v(name)
where not exists (select 1 from public.prospects);
