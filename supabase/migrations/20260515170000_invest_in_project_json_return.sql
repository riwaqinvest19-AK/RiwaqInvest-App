-- Return JSON from invest_in_project so PostgREST clients avoid composite-row payload issues.

drop function if exists public.invest_in_project(uuid, bigint);

create or replace function public.invest_in_project(p_project_id uuid, p_amount bigint)
returns jsonb
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
  v_fee bigint;
  v_total bigint;
  v_new_balance bigint;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  v_fee := round(p_amount::numeric * 0.02)::bigint;
  v_total := p_amount + v_fee;

  select p.total_balance
  into v_profile_balance
  from public.profiles p
  where p.id = v_user_id
  for update;

  if v_profile_balance is null then
    raise exception 'Profile not found';
  end if;

  if v_profile_balance < v_total then
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
  set total_balance = total_balance - v_total
  where id = v_user_id
  returning total_balance into v_new_balance;

  update public.projects
  set
    current_amount = v_new_current,
    investment_progress = v_new_progress
  where id = p_project_id;

  insert into public.investments (user_id, project_id, amount, status)
  values (v_user_id, p_project_id, p_amount, 'confirmed')
  returning * into v_investment;

  return jsonb_build_object(
    'ok', true,
    'investment_id', v_investment.id,
    'amount', p_amount,
    'fee', v_fee,
    'total_charged', v_total,
    'new_balance', v_new_balance
  );
end;
$$;

grant execute on function public.invest_in_project(uuid, bigint) to authenticated;

notify pgrst, 'reload schema';
