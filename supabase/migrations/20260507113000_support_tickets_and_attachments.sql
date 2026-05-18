-- Support tickets + attachments storage

-- ---------------------------------------------------------------------------
-- Table: support_tickets
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  message text not null,
  attachment_urls text[] not null default array[]::text[],
  status text not null default 'open',
  created_at timestamptz not null default now()
);

comment on table public.support_tickets is
  'User-submitted support messages + optional attachment URLs.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_tickets_status_check'
  ) then
    alter table public.support_tickets
      add constraint support_tickets_status_check
      check (status in ('open', 'closed'));
  end if;
end $$;

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_select_own" on public.support_tickets;
create policy "support_tickets_select_own"
  on public.support_tickets for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own"
  on public.support_tickets for insert
  to authenticated
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: support-attachments (public, 5MB, JPG/PNG/PDF)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies: users may only write/read objects under folder named with their auth uid
drop policy if exists "support_attachments_select_own" on storage.objects;
create policy "support_attachments_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'support-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "support_attachments_insert_own" on storage.objects;
create policy "support_attachments_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'support-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "support_attachments_update_own" on storage.objects;
create policy "support_attachments_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'support-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'support-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "support_attachments_delete_own" on storage.objects;
create policy "support_attachments_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'support-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );

