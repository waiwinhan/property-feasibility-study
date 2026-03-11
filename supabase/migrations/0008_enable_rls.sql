-- Permissive RLS (no auth required — internal trusted network)
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

-- Allow all operations for all users (no auth)
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
