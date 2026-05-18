-- Project catalog: risk narrative + admin publish + storage for cover / legal PDF

alter table public.projects
  add column if not exists risk_analysis text;

comment on column public.projects.risk_analysis is
  'Long-form risk disclosure / analysis shown on project detail (optional).';

-- ---------------------------------------------------------------------------
-- Storage: project-assets (public URLs for catalog images and PDFs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project_assets_select_public" on storage.objects;
create policy "project_assets_select_public"
  on storage.objects for select
  using (bucket_id = 'project-assets');

drop policy if exists "project_assets_insert_admin" on storage.objects;
create policy "project_assets_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-assets'
    and public.is_admin_user()
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "project_assets_update_admin" on storage.objects;
create policy "project_assets_update_admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-assets'
    and public.is_admin_user()
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'project-assets'
    and public.is_admin_user()
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "project_assets_delete_admin" on storage.objects;
create policy "project_assets_delete_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-assets'
    and public.is_admin_user()
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- projects: admins may create / update listings
-- ---------------------------------------------------------------------------
drop policy if exists "projects_insert_admin" on public.projects;
create policy "projects_insert_admin"
  on public.projects for insert
  to authenticated
  with check (public.is_admin_user());

drop policy if exists "projects_update_admin" on public.projects;
create policy "projects_update_admin"
  on public.projects for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

grant insert, update on table public.projects to authenticated;

notify pgrst, 'reload schema';
notify storage, 'reload';
