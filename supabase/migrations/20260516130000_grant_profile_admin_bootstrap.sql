-- Bootstrap: grant is_admin when Table Editor UPDATE is silently reverted by profiles_guard_sensitive_columns.
-- Run once in SQL Editor, then call: select public.grant_profile_admin('USER-UUID-HERE');

create or replace function public.grant_profile_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'user id required';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'no profile row for user %', p_user_id;
  end if;

  alter table public.profiles disable trigger profiles_guard_sensitive_columns;

  update public.profiles
  set is_admin = true
  where id = p_user_id;

  alter table public.profiles enable trigger profiles_guard_sensitive_columns;
end;
$$;

comment on function public.grant_profile_admin(uuid) is
  'One-off bootstrap: set profiles.is_admin=true bypassing the guard trigger. Run from SQL Editor only.';

revoke all on function public.grant_profile_admin(uuid) from public;
grant execute on function public.grant_profile_admin(uuid) to postgres;
grant execute on function public.grant_profile_admin(uuid) to service_role;
