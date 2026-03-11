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
