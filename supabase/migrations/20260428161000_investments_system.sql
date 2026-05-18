-- RiwaqInvest — investments system (wallet + portfolio + atomic invest flow)

alter table public.profiles
add column if not exists total_balance bigint not null default 500000;

comment on column public.profiles.total_balance is 'User wallet balance in DZD';

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  amount bigint not null check (amount > 0),
  status text not null default 'confirmed',
  invested_at timestamptz not null default now()
);

comment on table public.investments is 'User investment transactions by project';
comment on column public.investments.amount is 'Investment amount in DZD';
comment on column public.investments.status is 'Investment state: pending/confirmed/failed';

create index if not exists investments_user_id_idx on public.investments (user_id);
create index if not exists investments_project_id_idx on public.investments (project_id);
create index if not exists investments_user_invested_at_idx on public.investments (user_id, invested_at desc);

alter table public.investments enable row level security;

drop policy if exists "investments_select_own" on public.investments;
create policy "investments_select_own"
  on public.investments for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "investments_insert_own" on public.investments;
create policy "investments_insert_own"
  on public.investments for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on table public.investments to authenticated;

create or replace function public.invest_in_project(p_project_id uuid, p_amount bigint)
returns public.investments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile_balance bigint;
  v_project_target bigint;
  v_project_current bigint;
  v_investment public.investments;
  v_new_current bigint;
  v_new_progress numeric(5, 2);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select p.total_balance
  into v_profile_balance
  from public.profiles p
  where p.id = v_user_id
  for update;

  if v_profile_balance is null then
    raise exception 'Profile not found';
  end if;

  if v_profile_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  select pr.target_amount, coalesce(pr.current_amount, 0)
  into v_project_target, v_project_current
  from public.projects pr
  where pr.id = p_project_id
  for update;

  if v_project_current is null then
    raise exception 'Project not found';
  end if;

  v_new_current := v_project_current + p_amount;
  if coalesce(v_project_target, 0) > 0 then
    v_new_progress := least(100, round((v_new_current::numeric / v_project_target::numeric) * 100, 2));
  else
    v_new_progress := 0;
  end if;

  update public.profiles
  set total_balance = total_balance - p_amount
  where id = v_user_id;

  update public.projects
  set
    current_amount = v_new_current,
    investment_progress = v_new_progress
  where id = p_project_id;

  insert into public.investments (user_id, project_id, amount, status)
  values (v_user_id, p_project_id, p_amount, 'confirmed')
  returning * into v_investment;

  return v_investment;
end;
$$;

grant execute on function public.invest_in_project(uuid, bigint) to authenticated;
