create table scenarios (
  id          uuid primary key default gen_random_uuid(),
  phase_id    uuid not null references phases(id) on delete cascade,
  name        text not null,
  is_base     boolean not null default false,
  colour_tag  text default '#6366f1',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table scenario_cost_assumptions (
  id          uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references scenarios(id) on delete cascade,
  -- Overrides — same fields as cost_assumptions, all nullable
  building_psf_residential  numeric(10,2),
  building_psf_affordable   numeric(10,2),
  building_psf_commercial   numeric(10,2),
  preliminary_pct   numeric(6,2),
  contingency_pct   numeric(6,2),
  land_cost_psf     numeric(10,2),
  professional_fees_pct numeric(6,2),
  marketing_pct     numeric(6,2),
  bumi_discount_pct numeric(6,2),
  bumi_quota_pct    numeric(6,2)
);

create table scenario_results (
  id          uuid primary key default gen_random_uuid(),
  scenario_id uuid not null unique references scenarios(id) on delete cascade,
  results     jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create index idx_scenarios_phase_id on scenarios(phase_id);
