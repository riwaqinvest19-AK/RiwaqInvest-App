-- Fix recursive RLS policy on public.profiles that can break storage checks.

-- Helper runs as definer (postgres in migrations) to avoid RLS recursion.
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
  'Returns true when target user has profiles.is_admin=true; used by RLS policies.';

grant execute on function public.is_admin_user(uuid) to authenticated;

-- Replace recursive profile policy (it queried public.profiles from inside profiles policy).
drop policy if exists "profiles_select_admin_pending" on public.profiles;
create policy "profiles_select_admin_pending"
  on public.profiles for select
  to authenticated
  using (
    verification_status = 'pending'
    and public.is_admin_user()
  );

-- Replace storage admin policy to use helper function (no inline self-query).
drop policy if exists "identity_verifications_select_admin" on storage.objects;
create policy "identity_verifications_select_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'identity-verifications'
    and public.is_admin_user()
  );

-- Refresh API caches after policy/function changes.
notify pgrst, 'reload schema';
notify storage, 'reload';
