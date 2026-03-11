-- App settings singleton
insert into app_settings (company_name, hurdle_rate_pct)
values ('Wai Property Feasibility Study', 15.0);

-- Sample project
insert into projects (id, name, description, status)
values (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Taman Wai Residence',
  'Mixed residential and commercial development',
  'Active'
);

-- Sample phases
insert into phases (id, project_id, name, dev_type, sort_order)
values
  ('b1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Phase 1A — Superlink', '3-Sty Superlink', 0),
  ('b1b2c3d4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Phase 1B — Affordable', 'Affordable Home', 1),
  ('b1b2c3d4-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Phase 1C — Commercial', 'Commercial Shoplot', 2);

-- Default construction cost pools for sample project
insert into construction_cost_pools (project_id, name, pool_total, is_default)
values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Earthworks', 700000, true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Landscaping', 125000, true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Clubhouse', 1000000, true);

-- Sample unit types for Phase 1A
insert into unit_types (phase_id, name, category, avg_size_sqft, unit_count, selling_psf, sort_order)
values
  ('b1b2c3d4-0000-0000-0000-000000000001', '3-Sty Superlink (Type A)', 'Residential', 2200, 80, 350, 0),
  ('b1b2c3d4-0000-0000-0000-000000000001', '3-Sty Superlink (Type B)', 'Residential', 2500, 40, 380, 1);

-- Default cost assumptions for Phase 1A
insert into cost_assumptions (phase_id)
values
  ('b1b2c3d4-0000-0000-0000-000000000001'),
  ('b1b2c3d4-0000-0000-0000-000000000002'),
  ('b1b2c3d4-0000-0000-0000-000000000003');
