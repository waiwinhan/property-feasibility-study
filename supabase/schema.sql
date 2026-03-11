-- Reset & create schema for Wai Property Feasibility Study
-- Drops any pre-existing starter template tables, then creates the correct schema.

-- ── Drop template tables (if they exist) ────────────────────────────────────
drop table if exists public.users cascade;
drop table if exists public.projects cascade;

-- ── Drop our own tables (full reset, safe to re-run) ────────────────────────
drop table if exists construction_cost_allocations cascade;
drop table if exists construction_cost_pools cascade;
drop table if exists scenario_results cascade;
drop table if exists scenario_cost_assumptions cascade;
drop table if exists scenarios cascade;
drop table if exists cost_assumptions cascade;
drop table if exists unit_types cascade;
drop table if exists phases cascade;
drop table if exists app_settings cascade;

-- ── Drop enum types ──────────────────────────────────────────────────────────
drop type if exists project_status cascade;
drop type if exists unit_category cascade;

-- ── Enum types ───────────────────────────────────────────────────────────────
create type project_status as enum ('Active', 'On Hold', 'Completed', 'Archived');
create type unit_category as enum ('Residential', 'Affordable', 'Commercial');

-- ── Tables ───────────────────────────────────────────────────────────────────
create table projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      project_status not null default 'Active',
  land_area_acres numeric(10,4),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table phases (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  dev_type    text,
  launch_date date,
  land_area_acres numeric(10,4),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  unit_count        integer,
  total_ndv         numeric(18,2),
  total_gdv         numeric(18,2),
  total_gcc         numeric(18,2),
  total_gdc         numeric(18,2),
  total_ndp         numeric(18,2),
  profit_margin_pct numeric(8,4),
  financial_results jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table unit_types (
  id           uuid primary key default gen_random_uuid(),
  phase_id     uuid not null references phases(id) on delete cascade,
  name         text not null,
  category     unit_category not null default 'Residential',
  avg_size_sqft numeric(10,2),
  unit_count   integer not null default 0,
  selling_psf  numeric(10,2),
  sort_order   integer not null default 0
);

create table cost_assumptions (
  id         uuid primary key default gen_random_uuid(),
  phase_id   uuid not null unique references phases(id) on delete cascade,
  building_psf_residential  numeric(10,2) default 300,
  building_psf_affordable   numeric(10,2) default 200,
  building_psf_commercial   numeric(10,2) default 180,
  preliminary_pct   numeric(6,2) default 8,
  contingency_pct   numeric(6,2) default 5,
  sst_pct           numeric(6,2) default 6,
  land_area_acres       numeric(10,4),
  land_cost_psf         numeric(10,2),
  land_conversion_prem_pct numeric(6,2) default 0,
  quit_rent_pa          numeric(12,2) default 0,
  quit_rent_years       numeric(4,1) default 0,
  assessment_pa         numeric(12,2) default 0,
  assessment_years      numeric(4,1) default 0,
  strata_title_per_unit numeric(10,2) default 5000,
  planning_fees_per_unit numeric(10,2) default 1000,
  dev_charges_pct       numeric(6,2) default 1,
  syabas_pct            numeric(6,4) default 0.25,
  iwk_jps_pct           numeric(6,2) default 1,
  tnb_per_unit          numeric(10,2) default 1750,
  tm_fibre_per_unit     numeric(10,2) default 2000,
  road_drainage_per_acre numeric(10,2) default 6000,
  school_contrib_lump   numeric(14,2) default 0,
  isf_lump              numeric(14,2) default 0,
  professional_fees_pct numeric(6,2) default 6.5,
  site_admin_pct        numeric(6,2) default 2,
  marketing_pct         numeric(6,2) default 1,
  finance_rate_pct           numeric(6,4) default 4.55,
  land_loan_pct              numeric(6,2) default 70,
  land_loan_years            numeric(4,1) default 4,
  construction_loan_pct      numeric(6,2) default 20,
  construction_loan_years    numeric(4,1) default 4,
  bumi_discount_pct numeric(6,2) default 7,
  bumi_quota_pct    numeric(6,2) default 30,
  legal_fees_pct    numeric(6,4) default 0.4,
  early_bird_pct    numeric(6,2) default 9,
  overhead_project_dept_pct numeric(6,2) default 1.4,
  overhead_hq_pct           numeric(6,2) default 3,
  overhead_marketing_pct    numeric(6,2) default 0.5,
  overhead_corporate_pct    numeric(6,2) default 1
);

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

create table construction_cost_pools (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  pool_total  numeric(14,2) not null default 0,
  is_default  boolean not null default false
);

create table construction_cost_allocations (
  id          uuid primary key default gen_random_uuid(),
  pool_id     uuid not null references construction_cost_pools(id) on delete cascade,
  phase_id    uuid not null references phases(id) on delete cascade,
  allocation_pct numeric(6,2) not null default 0,
  unique(pool_id, phase_id)
);

create table app_settings (
  id            uuid primary key default gen_random_uuid(),
  company_name  text not null default 'Wai Property Feasibility Study',
  hurdle_rate_pct numeric(6,2) not null default 15.0,
  logo_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index idx_projects_status on projects(status);
create index idx_phases_project_id on phases(project_id);
create index idx_phases_sort_order on phases(project_id, sort_order);
create index idx_unit_types_phase_id on unit_types(phase_id);
create index idx_scenarios_phase_id on scenarios(phase_id);
create index idx_pools_project_id on construction_cost_pools(project_id);
create index idx_allocs_pool_id on construction_cost_allocations(pool_id);
create index idx_allocs_phase_id on construction_cost_allocations(phase_id);
create unique index app_settings_singleton on app_settings ((true));

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table projects enable row level security;
alter table phases enable row level security;
alter table unit_types enable row level security;
alter table cost_assumptions enable row level security;
alter table scenarios enable row level security;
alter table scenario_cost_assumptions enable row level security;
alter table scenario_results enable row level security;
alter table construction_cost_pools enable row level security;
alter table construction_cost_allocations enable row level security;
alter table app_settings enable row level security;

create policy "allow_all_projects" on projects for all using (true) with check (true);
create policy "allow_all_phases" on phases for all using (true) with check (true);
create policy "allow_all_unit_types" on unit_types for all using (true) with check (true);
create policy "allow_all_cost_assumptions" on cost_assumptions for all using (true) with check (true);
create policy "allow_all_scenarios" on scenarios for all using (true) with check (true);
create policy "allow_all_scenario_ca" on scenario_cost_assumptions for all using (true) with check (true);
create policy "allow_all_scenario_results" on scenario_results for all using (true) with check (true);
create policy "allow_all_pools" on construction_cost_pools for all using (true) with check (true);
create policy "allow_all_allocs" on construction_cost_allocations for all using (true) with check (true);
create policy "allow_all_settings" on app_settings for all using (true) with check (true);

-- ── Triggers ─────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_projects_updated_at before update on projects for each row execute function set_updated_at();
create trigger trg_phases_updated_at before update on phases for each row execute function set_updated_at();
create trigger trg_scenarios_updated_at before update on scenarios for each row execute function set_updated_at();
create trigger trg_settings_updated_at before update on app_settings for each row execute function set_updated_at();
