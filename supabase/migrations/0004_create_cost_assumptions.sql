create table cost_assumptions (
  id         uuid primary key default gen_random_uuid(),
  phase_id   uuid not null unique references phases(id) on delete cascade,
  -- Building PSF
  building_psf_residential  numeric(10,2) default 300,
  building_psf_affordable   numeric(10,2) default 200,
  building_psf_commercial   numeric(10,2) default 180,
  -- Add-ons
  preliminary_pct   numeric(6,2) default 8,
  contingency_pct   numeric(6,2) default 5,
  sst_pct           numeric(6,2) default 6,
  -- Land
  land_area_acres       numeric(10,4),
  land_cost_psf         numeric(10,2),
  land_conversion_prem_pct numeric(6,2) default 0,
  quit_rent_pa          numeric(12,2) default 0,
  quit_rent_years       numeric(4,1) default 0,
  assessment_pa         numeric(12,2) default 0,
  assessment_years      numeric(4,1) default 0,
  -- Statutory
  strata_title_per_unit numeric(10,2) default 5000,
  planning_fees_per_unit numeric(10,2) default 1000,
  -- Authority
  dev_charges_pct       numeric(6,2) default 1,
  syabas_pct            numeric(6,4) default 0.25,
  iwk_jps_pct           numeric(6,2) default 1,
  tnb_per_unit          numeric(10,2) default 1750,
  tm_fibre_per_unit     numeric(10,2) default 2000,
  road_drainage_per_acre numeric(10,2) default 6000,
  school_contrib_lump   numeric(14,2) default 0,
  isf_lump              numeric(14,2) default 0,
  -- Professional
  professional_fees_pct numeric(6,2) default 6.5,
  site_admin_pct        numeric(6,2) default 2,
  marketing_pct         numeric(6,2) default 1,
  -- Finance
  finance_rate_pct           numeric(6,4) default 4.55,
  land_loan_pct              numeric(6,2) default 70,
  land_loan_years            numeric(4,1) default 4,
  construction_loan_pct      numeric(6,2) default 20,
  construction_loan_years    numeric(4,1) default 4,
  -- GDV deductions
  bumi_discount_pct numeric(6,2) default 7,
  bumi_quota_pct    numeric(6,2) default 30,
  legal_fees_pct    numeric(6,4) default 0.4,
  early_bird_pct    numeric(6,2) default 9,
  -- Overheads
  overhead_project_dept_pct numeric(6,2) default 1.4,
  overhead_hq_pct           numeric(6,2) default 3,
  overhead_marketing_pct    numeric(6,2) default 0.5,
  overhead_corporate_pct    numeric(6,2) default 1
);
