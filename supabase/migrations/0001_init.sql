-- MAX: Machine Answer Expert — initial schema + Row-Level Security.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to re-run.

create extension if not exists pgcrypto;

-- ── profiles (mirror of auth.users) ─────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  role       text default 'member',
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── library ─────────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  parent_id         uuid references public.categories(id) on delete set null,
  next_review_cycle date,
  reviewer_id       uuid references public.profiles(id) on delete set null,
  position          int default 0,
  created_at        timestamptz default now()
);

create table if not exists public.library_entries (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  question    text not null,
  answer      text,
  status      text not null default 'never_reviewed'
              check (status in ('unassigned','assigned','approved_with_edits','approved_without_edits','never_reviewed')),
  tags        text[] default '{}',
  times_used  int default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  updated_by  uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists library_entries_category_idx on public.library_entries(category_id);
create index if not exists library_entries_status_idx on public.library_entries(status);

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.merge_variables (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text default 'Project',
  value      text,
  comment    text,
  times_used int default 0,
  created_at timestamptz default now()
);

-- ── projects ────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  prospect    text,
  status      text not null default 'draft'
              check (status in ('draft','in_review','legal_flagged','approved','sent')),
  is_template boolean default false,
  owner_id    uuid references public.profiles(id) on delete set null,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.project_sections (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  parent_section_id uuid references public.project_sections(id) on delete cascade,
  name              text not null default 'Untitled Section',
  instructions      text,
  position          int default 0,
  created_at        timestamptz default now()
);

create table if not exists public.project_entries (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects(id) on delete cascade,
  section_id           uuid references public.project_sections(id) on delete set null,
  question_id          text,
  question             text not null,
  draft_answer         text,
  edited_answer        text,
  status               text not null default 'draft'
                       check (status in ('draft','edited','approved','needs_legal','needs_engineering','withheld')),
  flag                 boolean default false,
  flag_type            text,
  flag_reason          text,
  library_entries_used text[] default '{}',
  reviewer_id          uuid references public.profiles(id) on delete set null,
  position             int default 0,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
create index if not exists project_entries_project_idx on public.project_entries(project_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists t_library_updated on public.library_entries;
create trigger t_library_updated before update on public.library_entries
  for each row execute function public.touch_updated_at();
drop trigger if exists t_projects_updated on public.projects;
create trigger t_projects_updated before update on public.projects
  for each row execute function public.touch_updated_at();
drop trigger if exists t_project_entries_updated on public.project_entries;
create trigger t_project_entries_updated before update on public.project_entries
  for each row execute function public.touch_updated_at();

-- ── Row-Level Security ──────────────────────────────────────────────────────
-- Internal tool: any authenticated user (gated to your domain at the app + Google
-- OAuth layer) may read/write. Tighten later if you add external collaborators.
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.library_entries  enable row level security;
alter table public.tags             enable row level security;
alter table public.merge_variables  enable row level security;
alter table public.projects         enable row level security;
alter table public.project_sections enable row level security;
alter table public.project_entries  enable row level security;

create policy "profiles_read"   on public.profiles for select using (auth.uid() is not null);
create policy "profiles_self"   on public.profiles for update using (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'categories','library_entries','tags','merge_variables',
    'projects','project_sections','project_entries'
  ] loop
    execute format(
      'create policy %I on public.%I for all using (auth.uid() is not null) with check (auth.uid() is not null);',
      t || '_authed_all', t
    );
  end loop;
end $$;
