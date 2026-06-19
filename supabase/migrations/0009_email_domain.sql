-- Restrict sign-ups to the allowed email domains (backstory.ai, people.ai) at the
-- database level, so the rule can't be bypassed by hitting the API directly (the
-- client enforces it too, for a friendly message). Combined with email
-- confirmation (a one-time code sent to the address), this verifies the person
-- controls an allowed inbox.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to re-run.

create or replace function public.enforce_email_domain()
returns trigger language plpgsql security definer as $$
begin
  if lower(split_part(coalesce(new.email, ''), '@', 2)) not in ('backstory.ai', 'people.ai') then
    raise exception 'Sign-up is restricted to backstory.ai and people.ai email addresses.';
  end if;
  return new;
end;
$$;

drop trigger if exists t_enforce_email_domain on auth.users;
create trigger t_enforce_email_domain
  before insert on auth.users
  for each row execute function public.enforce_email_domain();
