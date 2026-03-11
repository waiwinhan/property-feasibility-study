create type project_status as enum ('Active', 'On Hold', 'Completed', 'Archived');

create table projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      project_status not null default 'Active',
  land_area_acres numeric(10,4),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_projects_status on projects(status);
