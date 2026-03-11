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

create index idx_pools_project_id on construction_cost_pools(project_id);
create index idx_allocs_pool_id on construction_cost_allocations(pool_id);
create index idx_allocs_phase_id on construction_cost_allocations(phase_id);
