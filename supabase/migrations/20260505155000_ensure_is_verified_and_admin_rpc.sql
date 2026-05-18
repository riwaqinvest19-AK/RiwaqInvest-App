-- Ensure profiles.is_verified exists for admin_review_identity RPC

alter table public.profiles
  add column if not exists is_verified boolean not null default false;

comment on column public.profiles.is_verified is
  'True when identity has been verified (KYC).';

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

  select public.is_admin_user(auth.uid()) into v_admin;

  if not coalesce(v_admin, false) then
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

grant execute on function public.admin_review_identity(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
