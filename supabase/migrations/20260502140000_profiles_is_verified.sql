-- Account verification flag for KYC / profile badge
alter table public.profiles
  add column if not exists is_verified boolean not null default false;

comment on column public.profiles.is_verified is 'True when identity has been verified (KYC)';
