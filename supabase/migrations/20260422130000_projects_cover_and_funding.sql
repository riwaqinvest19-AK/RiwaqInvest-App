-- Optional columns for DBs where projects table predates cover / amounts.
-- Canonical: cover_image_url (text), target_amount (bigint), current_amount (bigint) — amounts in DZD.

alter table public.projects
  add column if not exists cover_image_url text;

alter table public.projects
  add column if not exists target_amount bigint;

alter table public.projects
  add column if not exists current_amount bigint;

comment on column public.projects.cover_image_url is 'HTTPS URL shown on project cards';
comment on column public.projects.target_amount is 'Total funding target in DZD (display)';
comment on column public.projects.current_amount is 'Amount raised so far in DZD (display)';

-- First three catalog projects
insert into public.projects (
  title,
  location,
  expected_return,
  investment_progress,
  total_units,
  status,
  cover_image_url,
  target_amount,
  current_amount
)
values
  (
    'إقامة النخيل - العاصمة',
    'الجزائر العاصمة',
    15.25,
    72,
    156,
    'published',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80',
    5200000000,
    3744000000
  ),
  (
    'برج وهران',
    'وهران',
    13.40,
    48,
    88,
    'published',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80',
    6800000000,
    3264000000
  ),
  (
    'مجمع قسنطينة العقاري',
    'قسنطينة',
    16.10,
    91,
    240,
    'published',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80',
    4100000000,
    3731000000
  );
