-- Optional per-user URL for the “returns statement” PDF (portfolio download button)
alter table public.profiles
  add column if not exists returns_statement_url text;

comment on column public.profiles.returns_statement_url is
  'HTTPS URL to a returns PDF; if null, the app may use EXPO_PUBLIC_PORTFOLIO_RETURNS_PDF_URL for development';
