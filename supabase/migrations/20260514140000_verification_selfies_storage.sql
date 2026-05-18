-- Live selfie uploads for identity verification (private bucket verification_selfies)

alter table public.profiles
  add column if not exists verification_selfie_path text;

comment on column public.profiles.verification_selfie_path is
  'Storage object path in verification_selfies bucket for live selfie (optional supplement to KYC).';

-- ---------------------------------------------------------------------------
-- Storage: verification_selfies (private, 5MB, images only)
-- Object path convention: {auth.uid}/verification_selfies/{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification_selfies',
  'verification_selfies',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "verification_selfies_select_own" on storage.objects;
create policy "verification_selfies_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verification_selfies'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "verification_selfies_insert_own" on storage.objects;
create policy "verification_selfies_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verification_selfies'
    and split_part(name, '/', 1) = auth.uid()::text
    and name like (auth.uid()::text || '/verification_selfies/%')
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
  );

drop policy if exists "verification_selfies_delete_own" on storage.objects;
create policy "verification_selfies_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'verification_selfies'
    and split_part(name, '/', 1) = auth.uid()::text
  );
