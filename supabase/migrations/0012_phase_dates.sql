-- Add VP date and construction dates to phases
alter table phases
  add column if not exists vp_date date,
  add column if not exists construction_start_date date,
  add column if not exists construction_end_date date;
