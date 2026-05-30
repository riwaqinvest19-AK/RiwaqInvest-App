-- Public bucket for permanent Android APK distribution links.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-releases',
  'app-releases',
  true,
  157286400,
  array['application/vnd.android.package-archive', 'application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "app_releases_select_public" on storage.objects;
create policy "app_releases_select_public"
  on storage.objects for select
  using (bucket_id = 'app-releases');

notify storage, 'reload';
