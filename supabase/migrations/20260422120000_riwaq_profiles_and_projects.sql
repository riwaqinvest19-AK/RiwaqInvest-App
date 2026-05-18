-- RiwaqInvest — profiles + projects + RLS
-- Run in Supabase Dashboard → SQL Editor (or: supabase db push)

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone_number text,
  avatar_url text,
  preferred_language text
);

comment on table public.profiles is 'App profile linked 1:1 with auth.users';
comment on column public.profiles.preferred_language is 'BCP-47-ish code: ar, fr, en';

-- ---------------------------------------------------------------------------
-- projects: investment listings (catalog)
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text,
  expected_return numeric(7, 3),
  investment_progress numeric(5, 2) not null default 0
    check (investment_progress >= 0 and investment_progress <= 100),
  total_units integer not null default 0 check (total_units >= 0),
  status text not null default 'draft',
  cover_image_url text,
  target_amount bigint,
  current_amount bigint
);

comment on table public.projects is 'Real-estate / investment projects visible in the app';
comment on column public.projects.expected_return is 'Expected return as a percentage (e.g. 14.5 meaning 14.5%)';
comment on column public.projects.investment_progress is 'Funding progress 0–100';
comment on column public.projects.cover_image_url is 'HTTPS URL shown on project cards';
comment on column public.projects.target_amount is 'Total funding target in DZD (display)';
comment on column public.projects.current_amount is 'Amount raised so far in DZD (display)';

-- ---------------------------------------------------------------------------
-- Auto-create profile when a user signs up (reads signup metadata)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone_number, preferred_language)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'preferred_language', '')), '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

alter table public.projects enable row level security;

drop policy if exists "projects_select_authenticated" on public.projects;
create policy "projects_select_authenticated"
  on public.projects for select
  to authenticated
  using (true);

-- App role access (RLS still applies)
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.projects to authenticated;

-- Optional: backfill profiles for users created before this migration ran
-- (run once if you already had accounts in auth.users)
--
-- insert into public.profiles (id, full_name, phone_number)
-- select
--   u.id,
--   nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''),
--   nullif(trim(coalesce(u.raw_user_meta_data->>'phone', '')), '')
-- from auth.users u
-- where not exists (select 1 from public.profiles p where p.id = u.id);
