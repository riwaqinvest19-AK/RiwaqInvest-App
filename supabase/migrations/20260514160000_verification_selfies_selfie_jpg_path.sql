-- Allow selfie object path {auth.uid}/selfie.jpg (in addition to legacy verification_selfies/ prefix).

drop policy if exists "verification_selfies_insert_own" on storage.objects;
create policy "verification_selfies_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verification_selfies'
    and split_part(name, '/', 1) = auth.uid()::text
    and (
      name like (auth.uid()::text || '/verification_selfies/%')
      or name = (auth.uid()::text || '/selfie.jpg')
    )
  );
