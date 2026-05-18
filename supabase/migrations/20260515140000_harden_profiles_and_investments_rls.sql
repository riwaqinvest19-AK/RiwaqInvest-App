-- Production hardening: block client-side wallet / privilege escalation and fake investments.
-- Apply in Supabase Dashboard → SQL Editor or: supabase db push

-- ---------------------------------------------------------------------------
-- investments: only invest_in_project (security definer) may insert rows
-- ---------------------------------------------------------------------------
drop policy if exists "investments_insert_own" on public.investments;

revoke insert on table public.investments from authenticated;
grant select on table public.investments to authenticated;

-- ---------------------------------------------------------------------------
-- profiles: guard sensitive columns on direct UPDATE from the app
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin_user() then
    return new;
  end if;

  new.total_balance := old.total_balance;
  new.is_admin := old.is_admin;
  new.is_verified := old.is_verified;

  if new.verification_status is distinct from old.verification_status then
    if new.verification_status not in ('unverified', 'pending') then
      new.verification_status := old.verification_status;
    end if;
  end if;

  if new.returns_statement_url is distinct from old.returns_statement_url then
    new.returns_statement_url := old.returns_statement_url;
  end if;

  return new;
end;
$$;

comment on function public.profiles_guard_sensitive_columns() is
  'Prevents non-admin users from changing wallet balance, admin flag, verified state, or elevating KYC status.';

drop trigger if exists profiles_guard_sensitive_columns on public.profiles;
create trigger profiles_guard_sensitive_columns
  before update on public.profiles
  for each row
  execute procedure public.profiles_guard_sensitive_columns();

notify pgrst, 'reload schema';
