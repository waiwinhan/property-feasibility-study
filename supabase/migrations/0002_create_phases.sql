create table phases (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  dev_type    text,
  launch_date date,
  land_area_acres numeric(10,4),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  -- Cached calculated results
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

create index idx_phases_project_id on phases(project_id);
create index idx_phases_sort_order on phases(project_id, sort_order);
