-- Replace legal_fees_pct and early_bird_pct with detailed selling expense fields
alter table cost_assumptions
  add column if not exists vip_discount_pct           numeric(6,2)  default 9,
  add column if not exists additional_sales_pkg_pct   numeric(6,2)  default 0.5,
  add column if not exists commission_brokerage_pct   numeric(6,2)  default 2,
  add column if not exists repeat_buyers_pct          numeric(6,2)  default 0.2,
  add column if not exists spa_legal_fees_per_unit    numeric(10,2) default 5500,
  add column if not exists director_staff_discount_pct numeric(6,2) default 0.15,
  add column if not exists bumi_penalty_per_unit      numeric(12,2) default 50000,
  add column if not exists maintenance_fund_rate_psf  numeric(8,4)  default 0.70;

alter table scenario_cost_assumptions
  add column if not exists vip_discount_pct           numeric(6,2),
  add column if not exists additional_sales_pkg_pct   numeric(6,2),
  add column if not exists commission_brokerage_pct   numeric(6,2),
  add column if not exists repeat_buyers_pct          numeric(6,2),
  add column if not exists spa_legal_fees_per_unit    numeric(10,2),
  add column if not exists director_staff_discount_pct numeric(6,2),
  add column if not exists bumi_penalty_per_unit      numeric(12,2),
  add column if not exists maintenance_fund_rate_psf  numeric(8,4);
