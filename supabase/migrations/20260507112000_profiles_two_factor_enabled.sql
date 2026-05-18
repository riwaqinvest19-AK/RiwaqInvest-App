-- Add 2FA toggle flag to profiles

alter table public.profiles
  add column if not exists two_factor_enabled boolean not null default false;

comment on column public.profiles.two_factor_enabled is
  'User preference: enable 2FA (email-based in upcoming release).';

notify pgrst, 'reload schema';

