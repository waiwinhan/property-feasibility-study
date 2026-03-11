-- Soft delete support for projects
alter table projects add column if not exists deleted_at timestamptz;
create index if not exists idx_projects_deleted_at on projects(deleted_at) where deleted_at is not null;
