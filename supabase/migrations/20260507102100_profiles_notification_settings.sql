-- Add notification preference columns to profiles

alter table public.profiles
  add column if not exists notify_investments boolean not null default true,
  add column if not exists notify_account boolean not null default true,
  add column if not exists notify_news boolean not null default true;

comment on column public.profiles.notify_investments is
  'User preference: investment alerts (dividends, new projects).';

comment on column public.profiles.notify_account is
  'User preference: account alerts (KYC, deposits/withdrawals).';

comment on column public.profiles.notify_news is
  'User preference: general updates (market news, tips).';

notify pgrst, 'reload schema';

