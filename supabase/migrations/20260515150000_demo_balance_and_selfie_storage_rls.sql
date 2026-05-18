-- Demo wallet for new signups + verification_selfies RLS aligned with app upload paths.

-- ---------------------------------------------------------------------------
-- New users: 500,000 DZD demo balance (student / QA testing)
-- ---------------------------------------------------------------------------
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

-- One-time: give demo balance to existing accounts that never received funds (0 DZD only).
update public.profiles
set total_balance = 500000
where total_balance = 0;

-- ---------------------------------------------------------------------------
-- verification_selfies: allow {uid}/selfie.jpg and {uid}/verification_selfies/*
-- ---------------------------------------------------------------------------
drop policy if exists "verification_selfies_insert_own" on storage.objects;
create policy "verification_selfies_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verification_selfies'
    and split_part(name, '/', 1) = auth.uid()::text
    and (
      name = (auth.uid()::text || '/selfie.jpg')
      or name like (auth.uid()::text || '/verification_selfies/%')
    )
  );

drop policy if exists "verification_selfies_update_own" on storage.objects;
create policy "verification_selfies_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'verification_selfies'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'verification_selfies'
    and split_part(name, '/', 1) = auth.uid()::text
    and (
      name = (auth.uid()::text || '/selfie.jpg')
      or name like (auth.uid()::text || '/verification_selfies/%')
    )
  );

-- Realtime: refresh wallet balance in the app without restart
alter table public.profiles replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end;
$$;

notify pgrst, 'reload schema';
