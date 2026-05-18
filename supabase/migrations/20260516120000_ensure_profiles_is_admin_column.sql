-- Ensure profiles.is_admin exists (fixes dashboard "column does not exist" + app admin gates).
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'When true, user may access admin screens (KYC review, project publish).';

create or replace function public.is_admin_user(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and coalesce(p.is_admin, false) = true
  );
$$;

comment on function public.is_admin_user(uuid) is
  'Returns true when target user has profiles.is_admin=true; used by RLS policies and the app.';

grant execute on function public.is_admin_user(uuid) to authenticated;

notify pgrst, 'reload schema';
