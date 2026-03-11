-- Add launch_date and completed_date to projects
alter table projects
  add column if not exists launch_date date,
  add column if not exists completed_date date;
