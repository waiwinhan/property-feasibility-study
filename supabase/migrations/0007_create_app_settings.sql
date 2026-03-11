create table app_settings (
  id            uuid primary key default gen_random_uuid(),
  company_name  text not null default 'Wai Property Feasibility Study',
  hurdle_rate_pct numeric(6,2) not null default 15.0,
  logo_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Ensure only one row
create unique index app_settings_singleton on app_settings ((true));
