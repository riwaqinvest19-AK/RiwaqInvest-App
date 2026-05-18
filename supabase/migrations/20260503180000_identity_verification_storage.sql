-- KYC: verification_status on profiles + private storage bucket for identity documents

-- ---------------------------------------------------------------------------
-- profiles.verification_status
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists verification_status text not null default 'unverified';

comment on column public.profiles.verification_status is
  'KYC workflow: unverified (default) | pending (submitted) | verified | rejected';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_verification_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_verification_status_check
      check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: identity-verifications (private, 10MB, images + PDF)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identity-verifications',
  'identity-verifications',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies: users may only read/write objects under folder named with their auth uid
drop policy if exists "identity_verifications_select_own" on storage.objects;
create policy "identity_verifications_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'identity-verifications'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "identity_verifications_insert_own" on storage.objects;
create policy "identity_verifications_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'identity-verifications'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "identity_verifications_update_own" on storage.objects;
create policy "identity_verifications_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'identity-verifications'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'identity-verifications'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "identity_verifications_delete_own" on storage.objects;
create policy "identity_verifications_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'identity-verifications'
    and split_part(name, '/', 1) = auth.uid()::text
  );
