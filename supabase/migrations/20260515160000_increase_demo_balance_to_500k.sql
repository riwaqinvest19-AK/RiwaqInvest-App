-- Raise demo wallet to 500,000 DZD for new signups and accounts still on the old demo amount.

alter table public.profiles
  alter column total_balance set default 500000;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone_number, preferred_language, total_balance)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'preferred_language', '')), ''),
    500000
  );
  return new;
end;
$$;

-- Accounts with no funds or the previous 50k demo grant
update public.profiles
set total_balance = 500000
where total_balance = 0 or total_balance = 50000;

notify pgrst, 'reload schema';
