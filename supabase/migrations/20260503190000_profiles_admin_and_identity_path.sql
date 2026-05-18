-- Admin role, document path for KYC review, RLS + RPC for managers

-- ---------------------------------------------------------------------------
-- profiles.is_admin
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'When true, user may review identity verifications in the app.';

-- ---------------------------------------------------------------------------
-- Last uploaded KYC object path in bucket identity-verifications (e.g. uid/timestamp_national_id.jpg)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists identity_document_path text;

comment on column public.profiles.identity_document_path is
  'Object path within storage bucket identity-verifications for the latest KYC upload.';

-- ---------------------------------------------------------------------------
-- RLS: admins can read pending KYC rows (to review queue)
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_admin_pending" on public.profiles;
create policy "profiles_select_admin_pending"
  on public.profiles for select
  to authenticated
  using (
    verification_status = 'pending'
    and exists (
      select 1
      from public.profiles adm
      where adm.id = auth.uid()
        and coalesce(adm.is_admin, false) = true
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: admins may read all objects in identity-verifications (list + download)
-- ---------------------------------------------------------------------------
drop policy if exists "identity_verifications_select_admin" on storage.objects;
create policy "identity_verifications_select_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'identity-verifications'
    and exists (
      select 1
      from public.profiles adm
      where adm.id = auth.uid()
        and coalesce(adm.is_admin, false) = true
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: only is_admin can approve/reject another user (bypasses RLS safely)
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_identity(p_user_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
begin
  if p_user_id is null then
    raise exception 'invalid user';
  end if;

  select coalesce(is_admin, false) into v_admin
  from public.profiles
  where id = auth.uid();

  if not v_admin then
    raise exception 'not authorized';
  end if;

  if p_approve then
    update public.profiles
    set
      verification_status = 'verified',
      is_verified = true
    where id = p_user_id;
  else
    update public.profiles
    set
      verification_status = 'unverified',
      is_verified = false,
      identity_document_path = null
    where id = p_user_id;
  end if;
end;
$$;

comment on function public.admin_review_identity(uuid, boolean) is
  'Approve (verified) or reject (unverified) a user KYC submission; requires is_admin.';

grant execute on function public.admin_review_identity(uuid, boolean) to authenticated;
