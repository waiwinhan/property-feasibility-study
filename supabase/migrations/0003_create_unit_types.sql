create type unit_category as enum ('Residential', 'Affordable', 'Commercial');

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

create index idx_unit_types_phase_id on unit_types(phase_id);
