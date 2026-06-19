-- Workspace-level configuration as simple key/value rows. First use: the vendor
-- (your own organization) name that pre-fills the review-draft report header so
-- it no longer has to be retyped each time. Run in the Supabase SQL editor (or
-- `supabase db push`). Safe to re-run.

create table if not exists public.app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

drop trigger if exists t_app_settings_updated on public.app_settings;
create trigger t_app_settings_updated before update on public.app_settings
  for each row execute function public.touch_updated_at();

alter table public.app_settings enable row level security;
drop policy if exists "app_settings_authed_all" on public.app_settings;
create policy "app_settings_authed_all" on public.app_settings
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
