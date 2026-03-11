# Property Feasibility Study Web App — Project Plan

**Project:** Wai Property Feasibility Study — Web Application  
**Stack:** React (frontend) + Node.js/Express (backend) + PostgreSQL via Supabase (database)  
**Users:** All users — full edit, no role restrictions. No authentication required (internal trusted network).  
**Devices:** Desktop (primary), tablet, mobile (responsive)  
**Currency:** RM only  
**Language:** English only  
**Branding:** Company name + logo configurable in Settings  
**Animations:** Minimal — performance-first  
**Date:** March 2026

---

## 1. Executive Summary

This web application fully replaces the existing Excel-based feasibility study template for **Wai Property Feasibility Study**. It supports **10+ development projects** managed simultaneously, each with **user-defined phases** (no fixed count or codes). All financial calculations are re-implemented as server-side logic. A dedicated **per-project management dashboard** presents real-time KPIs — GDV, NDV, Construction Cost, Construction PSF, Net Profit, and Profit Margin — at both the phase level and total project level. A **portfolio summary dashboard** aggregates across all projects, showing total GDV, total NDP, blended profit margin, NDP margin comparison chart across projects, and a timeline of upcoming launch dates.

A built-in **Scenario Comparison & Sensitivity Analysis** module allows users to model multiple named scenarios per phase (e.g. Base Case, Optimistic, Conservative, Best Offer) by varying key drivers — selling price PSF, construction cost PSF, bumi discount/quota, land cost PSF, professional fees, marketing fees, and finance rates — and compare their impact on NDP and margin side-by-side. The primary use case for scenario comparison is **presenting options to the board for approval**, but the module equally supports offer evaluation, mix optimisation, and downside stress-testing.

**No authentication is required** — this is a single-company internal tool on a trusted network. All users have full edit access to all projects with no role restrictions. All monetary values are in **Malaysian Ringgit (RM)** — millions shorthand on the dashboard (e.g. RM 12.5M), full precision in the editor. The app is English-only. Company logo and company name are configurable once in Settings and applied across all views and exports (PDF headers, Excel headers). No audit trail or change history is required for the initial release.

**Projects carry a status label**: Active, On Hold, Completed, or Archived. The portfolio dashboard filters and summarises by status. **Duplication** is supported at three levels: clone an entire project, duplicate a phase within a project, or duplicate a scenario within a phase. **Auto-save** is active throughout the Study Editor with a visible "Last saved" timestamp — no manual save button required.

**Animations are intentionally minimal** — page transitions and countUp KPI numbers only, with everything else rendered immediately. The app must be responsive across desktop, tablet, and mobile, with desktop as the primary design target. Export (Excel) matches the original template layout exactly — all phases side-by-side on one sheet. PDF exports include company logo, project name, prepared-by field, and date. Excel import is flexible — the importer attempts to map any reasonably structured feasibility Excel, not just the exact original template. Deployment target is not yet decided; the Docker Compose setup must support both on-premise and cloud VPS deployment without modification.

---

## 2. Excel Template Analysis

The existing template (`Feasibility_Study_Template.xlsx`) contains a **single sheet** with 193 rows × 56 columns. It is structured in two major sections:

### Section A — Gross Development Value (GDV)
| Row | Content |
|-----|---------|
| 1–10 | Project header: land area, conversion rates, phase list |
| 11 | Launch dates per phase |
| 13–19 | Phase land stats: area (acres/sqm/sqft), unit count, saleable area, plot ratio |
| 20–62 | Unit type pricing matrix — each phase lists development type, unit count (residential + commercial), NFA, selling price PSF, and average price per unit with multiple sub-types |
| 63 | **GDV total per phase** |
| 65–67 | Deductions: Bumiputera discount (7%), legal fees (0.4%), early bird discount (9%) |
| 71 | **NDV total per phase** |
| 75 | Net selling price PSF |

### Section B — Gross Development Cost (GDC)
| Row | Content |
|-----|---------|
| 79–83 | Item 5: Land & other costs — land cost, conversion premium (15/30%), quit rent, assessment |
| 85–102 | Item 6: Gross Construction Cost — building work (residential RM300psf, affordable RM200psf, commercial RM180psf), earthworks (RM700k/phase), landscaping (RM125k/phase), clubhouse (RM1M), preliminary (8%), contingency (5%), SST (6% commercial only) |
| 103–107 | Items 7–8: Strata title fees (RM5,000/unit), planning fees (RM1,000/unit) |
| 109–117 | Item 9: Authority contributions — development charges (1% NDV), SYABAS (0.25%), IWK & JPS (1%), TNB (RM1,750/unit), TM Fibre (RM2,000/unit), road & drainage (RM6,000/acre) |
| 119–120 | Item 10: Consultancy fees (6.5% of GCC) |
| 122–126 | Items 11–12: Other construction cost, site admin (2% of GCC) |
| 130 | GDC before marketing |
| 134–143 | Item 15: Marketing expenses — general (1% NDV), sales gallery, show units |
| 145 | GDC after marketing |
| 148 | Gross Development Profit after marketing |
| 151–153 | Item 16: Financial charges — land cost interest (4.55%, 70% of land cost, 4yr), construction loan interest (4.55%, 20% of GCC, 4yr) |
| 155 | GDC after financial charges |
| 158 | Gross Development Profit after financial charges |
| 161–164 | Overhead items 17–20: Project dept (1.4%), Head office (3%), Marketing dept (0.5%), Corporate (1%) — all % of NDV |
| 168 | **Net Development Profit (NDP)** |
| 169 | **% NDP/NDV (Profit Margin)** |

### Phases (from Original Excel Template — user-configurable in app)

The original Excel template contains 18 pre-set phases across two groups. In the web app, **all phases are fully user-defined** — the list below is simply the starting reference from the Excel file. After import, users can rename, reorder, add, or delete any phase freely.

| Original Code | Development Type |
|--------------|-----------------|
| 1a | 3-Sty Superlink |
| 1b | 3-Sty Superlink |
| 1c | Affordable Home |
| 1d | Affordable Home |
| 1e | Commercial |
| 1f | Mixed Comm / Serviced Apt |
| 1g | Commercial Shoplot |
| 1h | Commercial Shoplot |
| 2a | 2-Sty Linkhouse |
| 2b | 2-Sty Linkhouse |
| 2c | 2-Sty Linkhouse |
| 2d | 2-Sty Semi-D |
| 2e | Terrace Villa / Semi-D |
| 2f | Zero Lot Bungalow |
| 2g1 | Condominium |
| 2g2 | Condominium |
| 2g3 | Park / Recreational |
| 2h | Terrace House |
| 2j | Commercial Shoplot |

---

## 3. Application Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  Project     │  │  Feasibility     │  │  Management       │  │
│  │  List /      │  │  Study Editor    │  │  Dashboard        │  │
│  │  Selector    │  │  (18 phases)     │  │  (KPI charts)     │  │
│  └──────────────┘  └──────────────────┘  └───────────────────┘  │
│                                                                  │
│           Axios / React Query (API layer)                        │
└──────────────────────────────┬───────────────────────────────────┘
                               │ REST API (JSON)
┌──────────────────────────────▼───────────────────────────────────┐
│                    BACKEND (Node.js / Express)                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Calculation Engine (replaces all Excel formulas)        │    │
│  │  • GDV, NDV, GCC, GDC, GDP, NDP calculations            │    │
│  │  • Phase-level and total aggregation                     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Routes: /projects  /phases  /study  /dashboard  /export        │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                       PostgreSQL Database                        │
│  Tables: projects, phases, unit_types, phase_inputs,             │
│          cost_assumptions, financial_results                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema

### `projects`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR | e.g. "Project Harmoni" |
| description | TEXT | |
| original_land_area_acres | DECIMAL | |
| total_dev_land_acres | DECIMAL | |
| land_cost_per_sqft | DECIMAL | |
| status | ENUM | `active` / `on_hold` / `completed` / `archived` — default `active` |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `app_settings` (singleton table — one row per deployment)

Stores global configuration applied to all projects and all exports. Seeded on first run with defaults.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID PK | — | Always one row |
| company_name | VARCHAR | `"Wai Property Feasibility Study"` | Displayed in app navbar header and all PDF/Excel export headers |
| company_logo_url | TEXT | `/assets/wai-logo.png` (bundled) | Supabase Storage URL after upload; falls back to bundled logo |
| logo_updated_at | TIMESTAMP | — | |
| hurdle_rate_pct | DECIMAL | `15.0` | NDP margin threshold — phases below show red/amber colour coding throughout app and exports |
| updated_at | TIMESTAMP | — | |

> **Default logo:** The WAI Property Feasibility logo (`Gemini_Generated_Image_vg38dhvg38dhvg38.png`) is bundled in `client/src/assets/wai-logo.png` as the default. It is displayed at 160×48px in the navbar (top-left) and at 120×36px in PDF/Excel export headers. Users can upload a replacement via Settings → drag-and-drop zone (PNG/SVG, max 2MB, recommended 200×60px). Uploaded logos are stored in Supabase Storage under `settings/logo`.

> **Hurdle rate visual indicator:** Wherever NDP margin % is displayed (phase summary panel, TOTAL tab, dashboard KPI card, scenario comparison table, PDF exports), the value is colour-coded: **green** ≥ hurdle rate, **amber** within 3 percentage points below, **red** more than 3 points below. The hurdle rate is also shown as a horizontal dashed reference line on the NDP + Margin combo chart.

---

### `phases`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | |
| phase_code | VARCHAR | Fully user-defined, e.g. "Phase A", "Block 1", "Tower 3" |
| phase_name | VARCHAR | User-defined display name |
| sort_order | INT | Controls display order; drag-to-reorder in UI |
| launch_date | DATE | |
| land_area_acres | DECIMAL | |
| development_type | VARCHAR | Free-text or dropdown (user-editable) |
| is_active | BOOLEAN | Soft-delete — excluded from totals when false |

> **Design note:** Phases are **fully user-managed** — no pre-set codes, no grouping into Phase 1 / Phase 2. Users can add, rename, reorder, and delete any phase at any time. Deleting a phase with data requires a confirmation dialog ("This will permanently remove all unit types, cost inputs, scenarios and results for this phase. This cannot be undone."). Phases can also be temporarily deactivated (toggle off) to exclude from totals without deleting.

### `unit_types`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| phase_id | UUID FK | |
| category | ENUM | residential / commercial |
| type_name | VARCHAR | e.g. "Superlink (24' x 65') Intermediate" |
| avg_size_sqft | DECIMAL | NFA |
| unit_count | INT | |
| selling_price_psf | DECIMAL | RM psf (nett) |
| avg_price_per_unit | DECIMAL | computed |

### `cost_assumptions`

All fields are fully user-editable `[input]` fields. Values shown are **suggested defaults only** — the UI pre-fills them but the user can override every single one. No value is ever hardcoded in calculations.

| Column | Type | Default Hint | Notes |
|--------|------|-------------|-------|
| id | UUID PK | | |
| phase_id | UUID FK | | |
| **GDV / Revenue Deductions** | | | |
| bumi_discount_pct | DECIMAL | 7% | `[input]` — % applied to bumi-quota units |
| bumi_quota_pct | DECIMAL | 50% | `[input]` — % of total units subject to bumi discount |
| legal_fees_pct | DECIMAL | 0.4% | `[input]` — % of NDV |
| early_bird_discount_pct | DECIMAL | 9% | `[input]` — % of NDV |
| **Building Work — Construction PSF** | | | |
| construction_psf_residential | DECIMAL | RM 300 | `[input]` — RM per sqft |
| construction_psf_affordable | DECIMAL | RM 200 | `[input]` — RM per sqft |
| construction_psf_commercial | DECIMAL | RM 180 | `[input]` — RM per sqft |
| **Infrastructure Lump Sums** | | | |
| earthworks_lump_sum | DECIMAL | RM 700,000 | `[input]` — per phase |
| landscaping_lump_sum | DECIMAL | RM 125,000 | `[input]` — per phase |
| clubhouse_lump_sum | DECIMAL | RM 1,000,000 | `[input]` — per phase |
| **Construction Add-ons** | | | |
| preliminary_pct | DECIMAL | 8% | `[input]` — % of Construction Cost |
| contingency_pct | DECIMAL | 5% | `[input]` — % of Construction Cost |
| sst_pct | DECIMAL | 6% | `[input]` — % of CC (commercial only) |
| **Statutory Fees** | | | |
| strata_title_fee_per_unit | DECIMAL | RM 5,000 | `[input]` — per unit |
| planning_fee_per_unit | DECIMAL | RM 1,000 | `[input]` — per unit |
| **Authority Contributions** | | | |
| dev_charges_pct | DECIMAL | 1.0% | `[input]` — % of NDV |
| syabas_pct | DECIMAL | 0.25% | `[input]` — % of NDV |
| iwk_jps_pct | DECIMAL | 1.0% | `[input]` — % of NDV |
| tnb_per_unit | DECIMAL | RM 1,750 | `[input]` — per unit |
| tm_fibre_per_unit | DECIMAL | RM 2,000 | `[input]` — per unit |
| road_drainage_per_acre | DECIMAL | RM 6,000 | `[input]` — per acre |
| school_contribution | DECIMAL | 0 | `[input]` — lump sum |
| isf_contribution | DECIMAL | 0 | `[input]` — lump sum |
| **Professional & Advisory Fees** | | | |
| professional_fees_pct | DECIMAL | 6.5% | `[input]` — % of GCC (consultancy) |
| site_admin_pct | DECIMAL | 2.0% | `[input]` — % of GCC |
| **Marketing & Selling** | | | |
| marketing_fees_pct | DECIMAL | 1.0% | `[input]` — % of NDV |
| **Financial Charges** | | | |
| land_interest_rate | DECIMAL | 4.55% | `[input]` — annual rate |
| land_loan_pct | DECIMAL | 70% | `[input]` — % of land cost financed |
| land_loan_years | DECIMAL | 4 | `[input]` — years |
| construction_interest_rate | DECIMAL | 4.55% | `[input]` — annual rate |
| construction_loan_pct | DECIMAL | 20% | `[input]` — % of GCC financed |
| construction_loan_years | DECIMAL | 4 | `[input]` — years |
| **Overheads** | | | |
| proj_dept_overhead_pct | DECIMAL | 1.4% | `[input]` — % of NDV |
| hq_overhead_pct | DECIMAL | 3.0% | `[input]` — % of NDV |
| mkt_dept_overhead_pct | DECIMAL | 0.5% | `[input]` — % of NDV |
| corporate_overhead_pct | DECIMAL | 1.0% | `[input]` — % of NDV |

### `misc_cost_items` (per-phase miscellaneous / custom cost rows)

For one-off or site-specific costs that don't fit the standard template line items. These rows appear as a dedicated **"Other / Miscellaneous"** sub-section at the bottom of the Other Development Costs section (Sub-section E) in the Study Editor. They feed directly into GDC.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| phase_id | UUID FK | |
| label | VARCHAR | User-defined name, e.g. "Demolition works", "Heritage wall remediation" |
| amount | DECIMAL | `[input]` — RM lump sum |
| notes | TEXT | Optional — description or reference |
| sort_order | INT | Display order within the misc section |
| created_at | TIMESTAMP | |

**Calculation impact:**
```
Misc Total (phase) = Σ amount for all misc_cost_items for this phase
GDC (before marketing) += Misc Total
```

Misc items are included in all exports — they appear as individual named rows in the Excel template's Other Development Costs section and in the PDF feasibility output. Scenarios have a mirrored `scenario_misc_cost_items` table (same structure, `scenario_id` FK) so scenario overrides can add, remove, or change misc line items independently.


| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| phase_id | UUID FK | Parent phase this scenario belongs to |
| name | VARCHAR | e.g. "Base Case", "Optimistic", "Conservative", "Best Offer" |
| is_base | BOOLEAN | If true, this is the committed/active scenario |
| colour_tag | VARCHAR | Hex colour for UI differentiation |
| notes | TEXT | Free-text rationale / assumptions |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `scenario_unit_types`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| scenario_id | UUID FK | |
| category | ENUM | residential / commercial |
| type_name | VARCHAR | e.g. "Superlink (24' x 65') Intermediate" |
| avg_size_sqft | DECIMAL | Layout size — **key scenario variable** |
| unit_count | INT | |
| selling_price_psf | DECIMAL | **Key scenario variable** |
| avg_price_per_unit | DECIMAL | Computed |

### `scenario_cost_assumptions`

Mirrors `cost_assumptions` exactly — every field is a `[input]` that the scenario can override independently from the Base Case.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| scenario_id | UUID FK | |
| **GDV Drivers** | | |
| bumi_discount_pct | DECIMAL | `[input]` **Key scenario variable** |
| bumi_quota_pct | DECIMAL | `[input]` **Key scenario variable** |
| legal_fees_pct | DECIMAL | `[input]` |
| early_bird_discount_pct | DECIMAL | `[input]` |
| **Construction PSF** | | |
| construction_psf_residential | DECIMAL | `[input]` **Key scenario variable** |
| construction_psf_affordable | DECIMAL | `[input]` **Key scenario variable** |
| construction_psf_commercial | DECIMAL | `[input]` **Key scenario variable** |
| **Land Cost** | | |
| land_cost_psf | DECIMAL | `[input]` **Key scenario variable** |
| **Infrastructure** | | |
| earthworks_lump_sum | DECIMAL | `[input]` |
| landscaping_lump_sum | DECIMAL | `[input]` |
| clubhouse_lump_sum | DECIMAL | `[input]` |
| **Statutory Fees** | | |
| strata_title_fee_per_unit | DECIMAL | `[input]` |
| planning_fee_per_unit | DECIMAL | `[input]` |
| **Professional Fees** | | |
| professional_fees_pct | DECIMAL | `[input]` **Key scenario variable** — % of GCC |
| site_admin_pct | DECIMAL | `[input]` |
| **Marketing** | | |
| marketing_fees_pct | DECIMAL | `[input]` **Key scenario variable** — % of NDV |
| **Authority Contributions** | | |
| dev_charges_pct | DECIMAL | `[input]` |
| syabas_pct | DECIMAL | `[input]` |
| iwk_jps_pct | DECIMAL | `[input]` |
| tnb_per_unit | DECIMAL | `[input]` |
| tm_fibre_per_unit | DECIMAL | `[input]` |
| road_drainage_per_acre | DECIMAL | `[input]` |
| school_contribution | DECIMAL | `[input]` |
| isf_contribution | DECIMAL | `[input]` |
| **Add-ons & Overheads** | | |
| preliminary_pct | DECIMAL | `[input]` |
| contingency_pct | DECIMAL | `[input]` |
| sst_pct | DECIMAL | `[input]` |
| land_interest_rate | DECIMAL | `[input]` |
| land_loan_pct | DECIMAL | `[input]` |
| land_loan_years | DECIMAL | `[input]` |
| construction_interest_rate | DECIMAL | `[input]` |
| construction_loan_pct | DECIMAL | `[input]` |
| construction_loan_years | DECIMAL | `[input]` |
| proj_dept_overhead_pct | DECIMAL | `[input]` |
| hq_overhead_pct | DECIMAL | `[input]` |
| mkt_dept_overhead_pct | DECIMAL | `[input]` |
| corporate_overhead_pct | DECIMAL | `[input]` |

### `scenario_results` (computed & cached per scenario)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| scenario_id | UUID FK | |
| gdv | DECIMAL | |
| ndv | DECIMAL | |
| gcc | DECIMAL | |
| construction_psf | DECIMAL | |
| land_cost_total | DECIMAL | |
| professional_fees | DECIMAL | |
| marketing_fees | DECIMAL | |
| gdc_before_marketing | DECIMAL | |
| gdc_after_marketing | DECIMAL | |
| gdc_after_finance | DECIMAL | |
| ndp | DECIMAL | |
| ndp_margin_pct | DECIMAL | |
| computed_at | TIMESTAMP | |

### `construction_cost_pools` (project-level cost budgets)

Each row defines the **total project budget** for one construction cost line item. Phase allocations are defined in `construction_cost_allocations`.

| Column | Type | Default Hint | Notes |
|--------|------|-------------|-------|
| id | UUID PK | | |
| project_id | UUID FK | | |
| cost_item | VARCHAR | | e.g. `"earthworks"`, `"landscaping"`, `"clubhouse"`, `"building_work_residential"`, `"building_work_affordable"`, `"building_work_commercial"` |
| display_name | VARCHAR | | e.g. `"Earthworks"`, `"Landscaping & Soft Landscaping"` |
| total_amount | DECIMAL | 0 | `[input]` — total RM budget for this cost item across the entire project |
| sort_order | INT | | Controls display order in the cost breakdown table |
| is_active | BOOLEAN | true | Can be toggled off to exclude an item project-wide |

> **Predefined cost items** (seeded from `seed.sql`): `building_work_residential`, `building_work_affordable`, `building_work_commercial`, `earthworks`, `landscaping`, `clubhouse_show_units`, `preliminary`, `contingency`, `sst`. Users can add custom cost items for their project.

---

### `construction_cost_allocations` (per-phase allocation %)

Each row assigns a **percentage of a cost pool's total budget** to one phase. All allocations for a given `cost_item` across all phases must sum to 100%.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| pool_id | UUID FK | → `construction_cost_pools.id` |
| phase_id | UUID FK | → `phases.id` |
| allocation_pct | DECIMAL | `[input]` — 0.00 to 100.00; all phase rows for same pool_id must sum to 100% |
| allocated_amount | DECIMAL | **Computed** — `total_amount × (allocation_pct / 100)` |

> **Validation rule (enforced both in UI and API):** For any given `pool_id`, the sum of `allocation_pct` across all active phases must equal exactly 100%. If it does not, the save is blocked and a validation error is shown: *"Earthworks allocation must total 100% across all phases. Current total: 85%."*

> **Auto-balance helper:** The UI offers a one-click **"Distribute evenly"** button per cost item that sets all phase allocations to `100% / number_of_phases` (rounded to 2 dp, with remainder assigned to the last phase to guarantee exactly 100%).

> **Phase addition/deletion:** When a new phase is added, a new `construction_cost_allocations` row is created for every pool with `allocation_pct = 0`. This keeps the 100% rule intact — the user must then deliberately redistribute. When a phase is deleted, its allocation rows are deleted and the remaining phase allocations become invalid (< 100%) — the UI surfaces a warning: *"Phase deletion has caused allocation totals to drop below 100%. Please rebalance the construction cost allocations."*

---

### Updated `cost_assumptions` — Lump Sums Removed

The following columns are **removed** from `cost_assumptions` because they are now managed at the project level via `construction_cost_pools` + `construction_cost_allocations`:

| Removed Column | Replaced By |
|---------------|-------------|
| `earthworks_lump_sum` | `construction_cost_pools` row with `cost_item = 'earthworks'` |
| `landscaping_lump_sum` | `construction_cost_pools` row with `cost_item = 'landscaping'` |
| `clubhouse_lump_sum` | `construction_cost_pools` row with `cost_item = 'clubhouse_show_units'` |

The `construction_psf_*` fields **remain in `cost_assumptions`** per-phase because building work (residential / affordable / commercial) is inherently per-phase (it depends on each phase's unit mix and NFA). Earthworks, landscaping, and clubhouse are project-wide infrastructure costs that are more naturally budgeted at a total and then allocated — hence the pool model.

> **Design decision:** Building work PSF stays per-phase. Infrastructure lump sums (earthworks, landscaping, clubhouse) move to the pool/allocation model. If a project wants to model building work as a pooled cost instead of PSF, they can add a custom `construction_cost_pools` row with `cost_item = 'building_work_custom'` and use the allocation % system for it — but the standard PSF model remains the default for building work.

---

### Scenario `construction_cost_allocations` override

When a scenario wants to model a different allocation split (e.g. "what if Phase A gets 60% of earthworks instead of 40%?"), it stores overrides in `scenario_construction_cost_allocations`:

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| scenario_id | UUID FK | |
| pool_id | UUID FK | → `construction_cost_pools.id` |
| phase_id | UUID FK | → `phases.id` |
| allocation_pct | DECIMAL | `[input]` override — must still sum to 100% across all phases for this pool + scenario |
| allocated_amount | DECIMAL | Computed |

If no override row exists for a given `pool_id` + `phase_id` combination in a scenario, the scenario inherits the base `construction_cost_allocations` values.

---

## 5. Calculation Engine (Formulas to Implement)

All formulas are re-implemented as pure JavaScript functions in `calculationEngine.js`. Every rate, PSF, lump sum, and fee referenced below is a **user `[input]`** — nothing is hardcoded. The engine receives a fully populated inputs object and returns all computed outputs.

### 5.1 Revenue Side (Section A)

**Step 1 — NDV (calculated directly from unit sales)**
```
NDV = Σ (unit_count × avg_size_sqft × selling_price_psf)   [per phase, across all unit types]

Net Selling Price PSF = NDV / Total Saleable NFA (sqft)
```

**Step 2 — Deductions (all rates are `[input]`)**
```
Bumiputera Deduction  = bumi_discount_pct[input] × bumi_quota_pct[input] × NDV
                        e.g. 7% discount on 50% quota = 3.5% effective deduction on NDV

Legal Fees            = legal_fees_pct[input] × NDV          (e.g. 0.4%)
Early Bird Discount   = early_bird_discount_pct[input] × NDV  (e.g. 9%)
```

**Step 3 — GDV (back-calculated from NDV)**
```
GDV = NDV + Bumiputera Deduction + Legal Fees + Early Bird Discount
```

> **Key design clarification:** NDV is the primary computed value (from actual unit sales). GDV is derived by adding back the deductions. This is the reverse of a typical top-down model and must be preserved exactly in the engine.

### 5.2 Construction Cost (Section B — Item 6)

All PSF rates and add-on percentages are `[input]` fields per phase in `cost_assumptions`. Infrastructure lump sums are now defined at project level in `construction_cost_pools` and distributed to phases via `construction_cost_allocations`.

**Building Work (per-phase, PSF-based — unchanged)**
```
Building Work Residential  = Σ (unit_count × avg_size_sqft) × construction_psf_residential[input]
Building Work Affordable   = Σ (unit_count × avg_size_sqft) × construction_psf_affordable[input]
Building Work Commercial   = Σ (unit_count × avg_size_sqft) × construction_psf_commercial[input]
```

**Infrastructure Costs (pooled — allocated from project-level budget)**
```
For each cost item i in { earthworks, landscaping, clubhouse_show_units, ... }:

  Pool Total (i)           = construction_cost_pools[cost_item=i].total_amount   [project-level input]
  Allocation % (i, phase)  = construction_cost_allocations[pool_id=i, phase_id].allocation_pct  [per-phase input]

  Phase Allocated Cost (i) = Pool Total (i) × Allocation % (i, phase) / 100
```

**Validation (enforced before any calculation runs)**
```
For each pool i:
  Σ Allocation % across all active phases MUST = 100%
  If not → block calculation, surface error to UI
```

**Aggregation into Construction Cost (CC)**
```
CC = Building Work Residential
   + Building Work Affordable
   + Building Work Commercial
   + Phase Allocated Cost (earthworks)
   + Phase Allocated Cost (landscaping)
   + Phase Allocated Cost (clubhouse_show_units)
   + Phase Allocated Cost (any additional custom pools)
```

**Add-ons (applied to CC, per phase)**
```
Preliminary   = preliminary_pct[input] × CC          (e.g. 8%)
Contingency   = contingency_pct[input] × CC          (e.g. 5%)
SST           = sst_pct[input] × CC_commercial_only  (e.g. 6%)

GCC (Gross Construction Cost) = CC + Preliminary + Contingency + SST

Construction Cost PSF (phase) = GCC / Total Gross Floor Area (sqft) for this phase
```

**Project-level construction totals**
```
Total GCC (all phases)          = Σ GCC across all active phases
Total Construction Cost PSF     = Total GCC / Total GFA (all active phases)

Infrastructure Allocation Summary (per cost item, shown on dashboard):
  Pool Total          = construction_cost_pools.total_amount
  Phase Breakdown     = [ { phase_name, allocation_pct, allocated_amount } for each phase ]
  Unallocated Amount  = Pool Total × (100% − Σ allocation_pct) / 100   [should be 0]
```

### 5.3 Other Development Costs (All `[input]`)

```
Land Cost                     = land_area_acres × land_cost_psf[input] × 43,560
Land Conversion Premium       = land_conversion_pct[input] × Net Land Value   (e.g. 15% or 30%)
Quit Rent                     = quit_rent_rate[input] × quit_rent_years[input]
Assessment                    = assessment_rate[input] × assessment_years[input]

Strata Title Fees             = strata_title_fee_per_unit[input] × total_units   (e.g. RM 5,000)
Planning Fees                 = planning_fee_per_unit[input] × total_units       (e.g. RM 1,000)

Development Charges           = dev_charges_pct[input] × NDV             (e.g. 1.0%)
SYABAS                        = syabas_pct[input] × NDV                  (e.g. 0.25%)
IWK & JPS                     = iwk_jps_pct[input] × NDV                 (e.g. 1.0%)
TNB                           = tnb_per_unit[input] × total_units         (e.g. RM 1,750)
TM Fibre Optic                = tm_fibre_per_unit[input] × total_units    (e.g. RM 2,000)
Road & Drainage               = road_drainage_per_acre[input] × land_area_acres (e.g. RM 6,000)
School Contribution           = school_contribution[input]               (lump sum)
ISF                           = isf_contribution[input]                  (lump sum)

Professional Fees             = professional_fees_pct[input] × GCC       (e.g. 6.5%)
Site Administration           = site_admin_pct[input] × GCC              (e.g. 2.0%)
General Marketing             = marketing_fees_pct[input] × NDV          (e.g. 1.0%)

GDC (before marketing)        = Land Cost + Land Conversion + Quit Rent + Assessment
                                + GCC + Strata Title + Planning Fees
                                + All Authority Contributions
                                + Professional Fees + Site Admin
                                + Misc Total   ← Σ all misc_cost_items for this phase

GDC (after marketing)         = GDC (before marketing) + General Marketing
```

### 5.4 Financial Charges (All `[input]`)

```
Land Cost Interest            = Land Cost × land_loan_pct[input] × land_interest_rate[input] × land_loan_years[input]
                                (e.g. 70% of land cost × 4.55% × 4 years)

Construction Loan Interest    = GCC × construction_loan_pct[input] × construction_interest_rate[input] × construction_loan_years[input]
                                (e.g. 20% of GCC × 4.55% × 4 years)

GDC (after finance)           = GDC (after marketing) + Land Interest + Construction Interest
GDP (after finance)           = NDV − GDC (after finance)
```

### 5.5 Overheads & Final Profit (All `[input]`)

```
Project Dept Overhead         = proj_dept_overhead_pct[input] × NDV    (e.g. 1.4%)
Head Office Overhead          = hq_overhead_pct[input] × NDV           (e.g. 3.0%)
Marketing Dept Overhead       = mkt_dept_overhead_pct[input] × NDV     (e.g. 0.5%)
Corporate Overhead            = corporate_overhead_pct[input] × NDV    (e.g. 1.0%)
Total Overhead                = Sum of above

NDP (Net Development Profit)  = GDP (after finance) − Total Overhead
Profit Margin                 = NDP / NDV × 100%
```

### 5.6 Project-Level Totals

```
Total GDV                     = Σ GDV across all active phases
Total NDV                     = Σ NDV across all active phases
Total GCC                     = Σ GCC across all active phases
Total NDP                     = Σ NDP across all active phases
Overall Profit Margin         = Total NDP / Total NDV × 100%

Total Construction Cost PSF   = Total GCC (all phases) / Total GFA (all phases)
                                [Replaces "Blended Construction PSF" — displayed on dashboard
                                 as "Total Construction Cost PSF (All Phases)"]
```

---

## 6. Scenario Comparison & Sensitivity Analysis

This is a **core module** — not a post-launch feature. It allows Project Managers and the Finance Team to create multiple named financial scenarios per phase, each with independent input assumptions, and compare them side-by-side to support investment decisions.

---

### 6.1 Concept & Data Model

Each **Phase** can have **unlimited named Scenarios**. One scenario is always marked as the **Base Case** (the committed/live version that feeds the main dashboard). All other scenarios are "what-if" analyses.

```
Project
 └── Phase (e.g. Phase 2c)
      ├── Scenario: Base Case        ← feeds dashboard
      ├── Scenario: Optimistic
      ├── Scenario: Conservative
      └── Scenario: Vendor Best Offer
```

Every scenario has its **own complete set of inputs**:

| Input Group | Specific Variables |
|-------------|-------------------|
| **GDV Drivers** | Unit layout size (sqft per unit type), Selling price PSF (per unit type) |
| **Construction Cost** | Construction cost PSF — residential, affordable, commercial (separate) |
| **Land Cost** | Land cost PSF |
| **Professional Fees** | Professional / consultancy fees % (of GCC) |
| **Marketing Fees** | Marketing fees % (of NDV) |
| Other (inherited or overridable) | Preliminary %, contingency %, bumi discount %, legal fees %, overheads |

---

### 6.2 Scenario Manager Page (`/project/:id/phase/:phaseId/scenarios`)

**Scenario List Panel (left)**
- List of all scenarios for the phase with colour-coded tags
- "Base Case" badge on the active scenario
- `+ New Scenario` button — offers two creation modes:
  1. **Blank** — all inputs at zero, user fills from scratch
  2. **Clone from existing** — duplicates any existing scenario as a starting point (most common workflow)
- Rename, delete, set-as-base-case actions per scenario
- Lock icon on Base Case (requires confirmation to edit)

**Scenario Input Form (right / main panel)**

Structured into three collapsible sections:

#### Section 1 — GDV Assumptions (NDV Inputs)
An editable unit-type grid identical to the Study Editor, scoped to this scenario:

| Unit Type | Category | Layout Size (sqft) | No. of Units | Selling Price PSF (RM) | Avg Price/Unit | NDV Contribution |
|-----------|----------|--------------------|--------------|----------------------|---------------|-----------------|
| `[input]` | Res/Aff/Comm | `[input]` | `[input]` | `[input]` | *(auto)* | *(auto)* |

- **NDV** = Σ (unit_count × layout_size × selling_price_psf) — primary revenue figure
- **GDV** = NDV + Bumi Deduction + Legal Fees + Early Bird — back-calculated and displayed
- Deduction rates (bumi %, bumi quota %, legal fees %, early bird %) are all `[input]` editable at the bottom of this section

#### Section 2 — Cost Assumptions
Six key scenario variables prominently displayed as large input cards at the top, followed by secondary assumptions below:

**Primary Variables (large input cards):**
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Construction PSF    │  │   Land Cost PSF      │  │  Professional Fees  │
│  Residential        │  │                      │  │   % of GCC          │
│  RM [ 300 ] psf     │  │  RM [ 45  ] psf      │  │  [ 6.5 ] %          │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Construction PSF    │  │  Construction PSF    │  │   Marketing Fees    │
│  Affordable         │  │   Commercial         │  │   % of NDV          │
│  RM [ 200 ] psf     │  │  RM [ 180 ] psf      │  │  [ 1.0 ] %          │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

**Secondary Assumptions (collapsed accordion):**
- Earthworks lump sum, landscaping, clubhouse
- Preliminary %, contingency %, SST %
- Financial charges: interest rates, loan %
- Overhead %s (project dept, HQ, marketing dept, corporate)
- Authority contributions (TNB, TM, road & drainage, etc.)

#### Section 3 — Live Results Panel (always visible, right sidebar or bottom strip)

Updates in real-time as any input changes (500ms debounce):

```
┌──────────────────────────────────────────────────────────────────────┐
│  LIVE RESULTS — [Scenario Name]                                      │
├────────────┬────────────┬────────────┬────────────┬──────────────────┤
│  GDV       │  NDV       │  GCC       │ Const. PSF │  NDP    Margin   │
│ RM 45.2M   │ RM 38.1M   │ RM 18.4M   │ RM 312 psf │ RM 7.2M  18.9%  │
└────────────┴────────────┴────────────┴────────────┴──────────────────┘
```

---

### 6.3 Scenario Comparison View (`/project/:id/phase/:phaseId/scenarios/compare`)

Accessed via "Compare All" button on the Scenario Manager. Displays all scenarios for the phase in a structured side-by-side layout.

#### Comparison Table
A sticky-header table showing all scenarios as columns:

| Metric | Base Case | Optimistic | Conservative | Vendor Offer |
|--------|-----------|------------|--------------|--------------|
| **GDV (RM)** | 45.2M | 52.1M | 38.7M | 47.0M |
| **NDV (RM)** | 38.1M | 44.3M | 32.5M | 39.8M |
| **Gross Construction Cost** | 18.4M | 19.2M | 17.1M | 18.8M |
| **Construction PSF (blended)** | RM 312 | RM 320 | RM 295 | RM 316 |
| **Land Cost** | 8.2M | 8.2M | 8.2M | 7.5M |
| **Professional Fees** | 1.2M | 1.2M | 1.1M | 1.2M |
| **Marketing Fees** | 0.38M | 0.44M | 0.33M | 0.40M |
| **GDC (before finance)** | 29.1M | 30.2M | 27.4M | 29.4M |
| **Financial Charges** | 1.8M | 1.9M | 1.6M | 1.8M |
| **Total Overheads** | 2.1M | 2.4M | 1.8M | 2.2M |
| **NDP (RM)** | **7.2M** | **11.8M** | **3.5M** | **8.4M** |
| **Profit Margin %** | **18.9%** | **26.6%** | **10.8%** | **21.1%** |
| **Net Selling Price PSF** | RM 285 | RM 310 | RM 254 | RM 292 |

- Rows with the **largest variance** are auto-highlighted in amber
- Best value per metric highlighted in green, worst in red
- Pinning: user can pin Base Case as the fixed left column

#### Scenario Comparison Charts

**Chart A — NDP & Margin Bar Chart**
- Grouped bars per scenario: NDP amount (left axis) + Margin % line (right axis)
- Colour-coded to scenario colour tags
- Reference line at project hurdle rate (configurable)

**Chart B — GDV → NDP Waterfall per Scenario**
- Side-by-side waterfalls for up to 4 scenarios
- Each waterfall: GDV → (−Deductions) → NDV → (−Construction) → (−Land) → (−Prof. Fees) → (−Marketing) → (−Finance) → (−Overheads) → NDP
- Instantly shows which cost category drives the biggest difference between scenarios

**Chart C — Spider / Radar Chart — Input Variables**
- Axes: Selling Price PSF, Construction PSF, Land Cost PSF, Professional Fees %, Marketing Fees %
- Each scenario plotted as a polygon overlay
- Quickly visualises which scenario is aggressive on revenue vs conservative on costs

**Chart D — Sensitivity Tornado Chart**
- Shows impact of ±10% change in each of the 6 key variables on NDP margin
- Bars sorted longest to shortest — instantly reveals which variable has the most leverage
- Calculated dynamically by the backend using the Base Case as origin

---

### 6.4 Sensitivity Analysis Tool (`/project/:id/phase/:phaseId/sensitivity`)

A dedicated interactive tool for single-variable and two-variable sensitivity tables — replicating the classic Excel "Data Table" feature.

#### Single-Variable Sensitivity
User selects:
- **Variable to stress-test**: Selling Price PSF / Construction PSF / Land Cost PSF / Professional Fees % / Marketing Fees %
- **Output metric to observe**: NDP / Profit Margin % / NDV / GDC
- **Range**: min value, max value, step size (auto-suggested based on variable type)

Renders a sensitivity table and line chart:

```
Sensitivity: Selling Price PSF  →  Profit Margin %
(Base Case: RM 285 psf → 18.9%)

  PSF    │  Margin %
─────────┼──────────
  RM 240 │   8.2%   ◄ danger zone (red)
  RM 255 │  11.5%
  RM 270 │  15.1%
  RM 285 │  18.9%   ◄ Base Case (bold)
  RM 300 │  22.4%
  RM 315 │  25.7%
  RM 330 │  28.9%   ◄ upside zone (green)
```

Break-even line automatically marked (where margin = 0%).

#### Two-Variable Sensitivity (Heat Map Table)
User selects two variables. Generates a matrix table colour-coded from red → amber → green:

```
                    Construction PSF (RM)
                 260    280    300    320    340
Selling    260 │  2.1%  0.8% -0.5% -1.9% -3.2%
Price PSF  270 │  7.3%  5.9%  4.6%  3.2%  1.9%
(RM)       280 │ 12.4% 11.0%  9.7%  8.3%  7.0%
           285 │ 15.0% 13.6% 12.3% 10.9%  9.6%   ← Base Row
           290 │ 17.5% 16.2% 14.8% 13.5% 12.1%
           300 │ 22.7% 21.3% 20.0% 18.6% 17.3%
           310 │ 27.8% 26.4% 25.1% 23.7% 22.4%
```

- Cells below 10% margin shaded red
- Cells 10–15% shaded amber
- Cells above 15% shaded green
- Base Case cell marked with border
- Exportable as PNG image or included in PDF export

---

### 6.5 Promoting a Scenario to Base Case

When the Finance Team or PM decides a scenario is the approved plan:
1. Click "Set as Base Case" on any scenario
2. Confirmation dialog: "This will replace the current Base Case as the live data feeding the management dashboard. Continue?"
3. On confirm: `is_base = true` toggled, previous base demoted
4. Dashboard KPIs update immediately to reflect the new base case
5. Old base case retained as a named scenario (not deleted), auto-renamed with a "(Previous)" suffix if unnamed

---

## 7. Application Pages & Features

### 7.0 Portfolio Summary Dashboard (`/`)

The home page. Aggregates KPIs across **all active projects** (excludes Archived by default; filter toggle available).

**KPI cards (top row):**
- Total GDV across all projects
- Total NDP across all projects
- Blended profit margin (Total NDP ÷ Total NDV)
- Count of projects by status (Active / On Hold / Completed / Archived)

**Charts:**
- **NDP Margin Comparison** — horizontal bar chart, one bar per project, sorted by margin %, colour-coded by status
- **Launch Date Timeline** — Gantt-style horizontal timeline showing upcoming phase launch dates across all projects, grouped by project. Phases with no launch date are shown as "TBD".

**Project cards (below charts):**
- One card per project showing: name, status badge, total GDV, total NDP, margin %, phase count, last updated
- Clicking a card navigates to `/project/:id`
- Status filter tabs: All / Active / On Hold / Completed / Archived
- Sort options: Last Updated, Name A–Z, NDP (high→low), Margin % (high→low)
- "New Project" button (top right)
- "Import from Excel" button

---

### 7.1 Project List Page — removed

Project listing is now handled by the Portfolio Summary Dashboard at `/`. There is no separate Project List page.

---

### 7.2 Project Overview Page (`/project/:id`)
- Project header: name (editable inline), status badge (dropdown: Active / On Hold / Completed / Archived), total land area, description, last updated
- **Phase management panel:**
  - Displays all user-created phases as draggable cards (drag to reorder)
  - Each card shows: phase name, development type, unit count, NDV, NDP, margin
  - `+ Add Phase` button — opens a modal to name the new phase (blank slate)
  - Each card has **Edit name**, **Duplicate phase** (clones all unit types + cost assumptions for that phase into a new phase within the same project), **Toggle active/inactive**, and **Delete** actions
  - Delete shows a confirmation dialog with full data-loss warning before proceeding
  - No pre-set phase codes or grouping — phases are completely free-form
- **Project actions** (toolbar):
  - "Manage Cost Allocation" — navigates to `/project/:id/cost-allocation`
  - "Clone Project" — duplicates the entire project (all phases, cost assumptions, scenarios) into a new project named "[Original Name] — Copy"
  - "Change Status" — dropdown shortcut (also editable inline on the status badge)
  - "Delete Project" — confirmation required; irreversible
- "View Dashboard" CTA button for the per-project management dashboard

### 7.3 Feasibility Study Editor (`/project/:id/study`)
- Phase tabs rendered dynamically from the user's phase list (in sort order), plus a `TOTAL` tab
- Tabs are labelled by user-defined phase names (not fixed codes)
- Tab bar includes an `+` button to add a new phase inline
- Each tab has a kebab (⋮) menu: Rename, Duplicate, Delete, Move Left/Right
- **Auto-save:** All field changes are debounced (500ms) and saved automatically to the database. A "Last saved [time]" indicator appears in the toolbar — e.g. "Last saved 2 minutes ago". No manual save button. A subtle spinner shows while a save is in flight. If the save fails (e.g. network error), a red "Save failed — retrying…" banner appears.

**Within each phase tab:**

**Sub-section A — Phase Header**
- Phase name (editable inline)
- Launch date picker
- Land area (acres) `[input]`
- Development type `[input]` (free-text or dropdown)

**Sub-section B — Unit Types (NDV Inputs)**

Editable grid — each row is a unit type:

| Unit Type Name | Layout Size (sqft) | No. of Units | Selling Price PSF (RM) | Avg Price/Unit | NDV Contribution |
|----------------|-------------------|--------------|----------------------|---------------|-----------------|
| `[input]` | `[input]` | `[input]` | `[input]` | *(auto)* | *(auto)* |

- Category selector per row: Residential / Affordable / Commercial
- Add row / Remove row buttons
- **NDV** = Σ (unit_count × layout_size × selling_price_psf) — shown as the running total
- Net Selling Price PSF = NDV / Total NFA — auto-computed and displayed

**Sub-section C — GDV & Deductions**

All rates are `[input]` — pre-filled with default hints, fully editable:

| Item | Rate | Computed Amount |
|------|------|----------------|
| Bumiputera Discount | `[input]`% discount on `[input]`% quota of NDV | *(auto)* |
| Legal Fees | `[input]`% of NDV | *(auto)* |
| Early Bird Discount | `[input]`% of NDV | *(auto)* |
| **GDV** (back-calculated) | NDV + all deductions above | *(auto)* |

> Display order in UI: NDV (top, primary figure) → deductions itemised → GDV (derived total). This matches the financial logic: NDV is the committed net revenue; GDV is the gross before discounts.

**Sub-section D — Construction Cost Inputs**

This sub-section has two parts: **Building Work** (per-phase PSF inputs) and **Infrastructure Allocation** (project-level pool budgets with per-phase allocation %).

---

*Part D1 — Building Work (per-phase, PSF-based)*

| Type | Construction PSF | Total NFA (sqft) | Building Work Cost |
|------|-----------------|-----------------|-------------------|
| Residential | `[input]` RM/psf | *(from unit types)* | *(auto)* |
| Affordable | `[input]` RM/psf | *(from unit types)* | *(auto)* |
| Commercial | `[input]` RM/psf | *(from unit types)* | *(auto)* |

Building Work PSF rates are entered per-phase (they depend on each phase's unit mix). Total NFA is pulled automatically from the unit types grid above.

---

*Part D2 — Infrastructure & Other Cost Allocation (project-level pools)*

This table lives at the **project level** (not inside a single phase tab) and is accessible from a dedicated **"Cost Allocation"** panel. It is always visible when editing any phase, surfaced as a collapsible panel at the top of Sub-section D with a link *"Manage project-level cost allocation →"* that opens the full allocation manager.

**Cost Allocation Manager** (`/project/:id/cost-allocation`):

The allocation manager presents a matrix table — **cost items as rows, phases as columns**:

```
┌──────────────────────────┬────────────┬──────────┬──────────┬──────────┬──────────┬───────────────┐
│ Cost Item                │ Total (RM) │ Phase 1a │ Phase 1b │ Phase 2a │ Phase 2b │ Total Alloc'd │
├──────────────────────────┼────────────┼──────────┼──────────┼──────────┼──────────┼───────────────┤
│ Earthworks               │ [input] RM │  [30%]   │  [25%]   │  [25%]   │  [20%]   │  ✅ 100%      │
│                          │RM 700,000  │ RM 210k  │ RM 175k  │ RM 175k  │ RM 140k  │               │
├──────────────────────────┼────────────┼──────────┼──────────┼──────────┼──────────┼───────────────┤
│ Landscaping              │ [input] RM │  [40%]   │  [30%]   │  [20%]   │  [10%]   │  ✅ 100%      │
│                          │RM 125,000  │ RM 50k   │ RM 37.5k │ RM 25k   │ RM 12.5k │               │
├──────────────────────────┼────────────┼──────────┼──────────┼──────────┼──────────┼───────────────┤
│ Clubhouse / Show Units   │ [input] RM │  [100%]  │  [0%]    │  [0%]    │  [0%]    │  ✅ 100%      │
│                          │RM 1,000,000│RM 1,000k │RM 0      │ RM 0     │ RM 0     │               │
├──────────────────────────┼────────────┼──────────┼──────────┼──────────┼──────────┼───────────────┤
│ *(+ Add custom item)*    │            │          │          │          │          │               │
└──────────────────────────┴────────────┴──────────┴──────────┴──────────┴──────────┴───────────────┘
```

**Each cell in the phase columns shows:**
- Top: % input field (bold, editable) → `[input]`
- Bottom: Computed RM amount = Total × % ÷ 100 (grey, auto-updated)

**"Total Alloc'd" column (rightmost):**
- Shows running sum of all phase allocations for that row
- ✅ Green `100%` when balanced
- ⚠️ Amber with value (e.g. `85%`) when under-allocated — save blocked
- ❌ Red with value (e.g. `105%`) when over-allocated — save blocked

**Row-level controls (per cost item):**
- **"Distribute Evenly" button** — sets all phase allocations to `100% ÷ N phases` (remainder assigned to last phase to guarantee exactly 100%)
- **"Allocate by Land Area" button** — auto-sets each phase % proportional to its `land_area_acres` relative to total project area
- **"Allocate by Unit Count" button** — auto-sets each phase % proportional to its total unit count
- **"Clear All" button** — resets all phase allocations to 0% (triggers validation warning)

**Table-level controls:**
- **"+ Add Cost Item"** — adds a new custom pool row with a user-defined name and total amount
- **"Reorder items"** — drag to reorder cost items (affects display order in study editor and Excel export)
- **"Reset to defaults"** — restores default cost item names and total amounts from `seed.sql`

**Allocation % input validation (real-time):**
- As the user types in any % cell, the running total updates instantly
- If total ≠ 100%: the row highlight turns amber/red and the "Save" button shows a warning tooltip
- A global save is only allowed when **all rows are at exactly 100%**
- Exception: rows with `total_amount = 0` skip the 100% validation (inactive items)

**Phase column in the allocation manager is read-only** for the allocation %s that feed into the currently-active scenario. If a scenario overrides allocations, a small scenario colour tag badge appears on the relevant cells.

---

*Phase tab view of allocated costs (read-only summary):*

When viewing a specific phase tab in the Study Editor, Sub-section D shows a read-only summary of that phase's infrastructure allocations alongside the editable PSF fields:

| Item | Phase Allocation | Allocated Amount |
|------|-----------------|-----------------|
| Earthworks | 30% of RM 700,000 | **RM 210,000** |
| Landscaping | 40% of RM 125,000 | **RM 50,000** |
| Clubhouse / Show Units | 100% of RM 1,000,000 | **RM 1,000,000** |

A small **"Edit allocation →"** link opens the Cost Allocation Manager focused on that phase's column.

---

*Part D3 — Construction Add-ons (per-phase, % of CC)*

| Item | Rate | Basis | Computed Amount |
|------|------|-------|----------------|
| Preliminary | `[input]` % | of Construction Cost | *(auto)* |
| Contingency | `[input]` % | of Construction Cost | *(auto)* |
| SST (Commercial only) | `[input]` % | of CC (commercial) | *(auto)* |
| **GCC (Gross Construction Cost)** | | CC + Preliminary + Contingency + SST | ***(auto)*** |
| **Construction Cost PSF** | | GCC ÷ Total GFA | ***(auto)*** |

**Sub-section E — Other Development Costs**

All values are `[input]`:

| Item | Input | Basis |
|------|-------|-------|
| Land Cost PSF | `[input]` RM/psf | → total auto-computed |
| Land Conversion Premium | `[input]` % | of Net Land Value |
| Quit Rent | `[input]` RM | per annum × `[input]` years |
| Assessment | `[input]` RM | per annum × `[input]` years |
| Strata Title Fees | `[input]` RM/unit | e.g. RM 5,000 |
| Planning Fees | `[input]` RM/unit | e.g. RM 1,000 |
| Development Charges | `[input]` % | of NDV |
| SYABAS | `[input]` % | of NDV |
| IWK & JPS | `[input]` % | of NDV |
| TNB | `[input]` RM/unit | |
| TM Fibre Optic | `[input]` RM/unit | |
| Road & Drainage | `[input]` RM/acre | |
| School Contribution | `[input]` RM | lump sum |
| ISF | `[input]` RM | lump sum |
| Professional Fees | `[input]` % | of GCC |
| Site Administration | `[input]` % | of GCC |
| Marketing Fees | `[input]` % | of NDV |

*Other / Miscellaneous (custom rows)*

A free-form table at the bottom of Sub-section E for one-off or site-specific costs:

| Item Name | Amount (RM) | Notes |
|-----------|------------|-------|
| `[input]` | `[input]` | `[input]` optional |
| *(+ Add row)* | | |

- Add / remove rows freely
- Row add/remove animated via Anime.js (max-height expand/collapse)
- Misc total auto-computed and included in GDC
- Rows are named individually and appear as separate labelled lines in Excel and PDF exports

**Sub-section F — Financial Charges**

| Item | Rate | Financing % | Years | Computed Amount |
|------|------|------------|-------|----------------|
| Land Cost Interest | `[input]` % | `[input]` % of land cost | `[input]` yrs | *(auto)* |
| Construction Loan Interest | `[input]` % | `[input]` % of GCC | `[input]` yrs | *(auto)* |

**Sub-section G — Overheads**

| Item | Rate | Basis | Computed Amount |
|------|------|-------|----------------|
| Project Dept Overhead | `[input]` % | of NDV | *(auto)* |
| Head Office Overhead | `[input]` % | of NDV | *(auto)* |
| Marketing Dept Overhead | `[input]` % | of NDV | *(auto)* |
| Corporate Overhead | `[input]` % | of NDV | *(auto)* |

**Sub-section H — Financial Summary (read-only, auto-computed)**

Full P&L waterfall displayed as a summary panel. **Presentation starts from GDV (top line) and deducts downward to NDP.** The calculation engine remains NDV-first (NDV is computed from units; GDV is back-calculated) — this is a display-only change.

```
GDV (Gross Development Value)               RM XX,XXX,XXX   ← top line
  Less: Bumiputera Discount                (RM X,XXX,XXX)   ← indented, bracketed, grey
  Less: Legal Fees                         (RM XXX,XXX)
  Less: Early Bird Discount                (RM X,XXX,XXX)
─────────────────────────────────────────────────────────
NDV (Net Development Value)                 RM XX,XXX,XXX   ← bold subtotal, border-top
─────────────────────────────────────────────────────────
  Less: GCC (Gross Construction Cost)      (RM XX,XXX,XXX)
    Construction Cost PSF (this phase)      RM XXX psf      ← sub-label, no amount col
  Less: Land & Related Costs               (RM XX,XXX,XXX)
  Less: Authority Contributions            (RM X,XXX,XXX)
  Less: Professional Fees                  (RM X,XXX,XXX)
  Less: Marketing Fees                     (RM XXX,XXX)
─────────────────────────────────────────────────────────
GDC (before finance)                        RM XX,XXX,XXX
  Less: Financial Charges                  (RM X,XXX,XXX)
─────────────────────────────────────────────────────────
GDC (after finance)                         RM XX,XXX,XXX
─────────────────────────────────────────────────────────
GDP (after finance)                         RM XX,XXX,XXX
  Less: Total Overheads                    (RM X,XXX,XXX)
─────────────────────────────────────────────────────────
NDP (Net Development Profit)                RM XX,XXX,XXX   ← bold, prominent
Profit Margin (NDP/NDV)                        XX.X%        ← colour-coded vs hurdle rate
```

**Display rules:**
- GDV is always the **first row** — the largest gross number
- Deduction rows are **indented**, shown in **bracketed format** `(RM X,XXX,XXX)`, and use a **lighter text colour** (e.g. `text-gray-500`)
- Subtotal rows (NDV, GDC before finance, GDC after finance, GDP, NDP) are **bold** with a **top border separator line**
- NDP and Profit Margin % are the **bottom two rows** — NDP in a larger font size, Margin % with green/amber/red colour coding against the hurdle rate
- Construction Cost PSF is a **sub-label row** under GCC with no amount column — indented further
- All values are sourced from the existing computed results object — **no formula or calculation changes**

**TOTAL tab:** Aggregates all active phases — non-editable, all values summed or computed from totals

### 7.3b Construction Cost Allocation Manager (`/project/:id/cost-allocation`)

A dedicated page for managing how project-level infrastructure cost budgets are distributed across phases. Accessible from:
- The **Project Overview** page via a "Manage Cost Allocation" button in the project toolbar
- Sub-section D of any phase tab in the Study Editor via an "Edit allocation →" link
- The project sidebar navigation

**Page layout:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONSTRUCTION COST ALLOCATION                    Project: Wai Property Feasibility Study         │
│  Define total budgets and distribute them across phases by percentage.      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ⓘ All phase allocations per cost item must total exactly 100%.             │
│     Unbalanced rows will block recalculation and export.                    │
├───────────────────────────────┬────────────┬────────┬────────┬──────────────┤
│ Cost Item                     │ Total (RM) │ Ph 1a  │ Ph 1b  │ Total Alloc'd│
│                               │            │        │        │              │
│ Earthworks                    │ 700,000    │  30%   │  70%   │  ✅ 100%    │
│                               │            │RM 210k │RM 490k │              │
│                  [=] [🏠] [≡] │            │        │        │              │
├───────────────────────────────┼────────────┼────────┼────────┼──────────────┤
│ Landscaping                   │ 125,000    │  60%   │  40%   │  ✅ 100%    │
│ Soft & Hard Landscaping       │            │ RM 75k │ RM 50k │              │
│                  [=] [🏠] [≡] │            │        │        │              │
├───────────────────────────────┼────────────┼────────┼────────┼──────────────┤
│ Clubhouse / Show Units        │ 1,000,000  │ 100%   │   0%   │  ✅ 100%    │
│                               │            │RM 1M   │ RM 0   │              │
│                  [=] [🏠] [≡] │            │        │        │              │
├───────────────────────────────┼────────────┼────────┼────────┼──────────────┤
│ + Add Custom Cost Item        │            │        │        │              │
└───────────────────────────────┴────────────┴────────┴────────┴──────────────┘
  [Save All]  [Reset to Defaults]
```

**Icon legend for row controls:**
- `[=]` Distribute Evenly — sets all phase %s to 100% ÷ N
- `[🏠]` Distribute by Land Area — weights %s by each phase's `land_area_acres`
- `[≡]` Distribute by Unit Count — weights %s by each phase's total unit count

**Phase column headers** show a colour dot matching the phase's colour tag (same colour used in the Scenario Manager), making it easy to orient when many phases are present.

**Scroll behaviour:** If there are many phases (> 6), the phase columns scroll horizontally. The "Cost Item" and "Total (RM)" columns are **sticky left** so they remain visible while scrolling.

**Anime.js animations on this page:**
- Table rows slide in with stagger on page load (`translateX: -12px→0`, 30ms stagger per row)
- When a "Distribute Evenly" button is clicked, all % cells in that row animate simultaneously to their new values (number transition via `countUp`, 400ms `easeOutExpo`)
- When total flips from ⚠️ to ✅, the status badge scales with a bounce (`scale: 0.8→1.1→1`, `easeOutBack`, 300ms)
- "Save" button animates a brief green pulse on successful save

**Top KPI Strip (cards)**
| Metric | Display |
|--------|---------|
| Total GDV | RM X million |
| Total NDV | RM X million |
| Total Construction Cost | RM X million |
| **Total Construction Cost PSF (All Phases)** | RM X psf |
| Net Development Profit | RM X million |
| Profit Margin (NDP/NDV) | X% |

> "Blended Construction PSF" is replaced by **"Total Construction Cost PSF (All Phases)"** = Total GCC ÷ Total GFA across all active phases.

**Chart 1 — GDV vs NDV by Phase (Grouped Bar Chart)**
- X-axis: All user-created phases (in sort order) + Total
- Two bars per phase: GDV (blue) and NDV (green)
- Hover tooltip showing exact values and deduction breakdown

**Chart 2 — Cost Breakdown Waterfall (Project Total)**
- Waterfall from NDV → +Deductions → GDV → −GCC → −Land → −Authority → −Professional → −Marketing → −Finance → −Overheads → NDP
- Shows where value is consumed

**Chart 3 — Construction Cost PSF by Phase (Bar Chart)**
- X-axis: All user-created phases
- Y-axis: RM PSF
- Colour-coded by development type
- Total Construction Cost PSF (All Phases) shown as a reference line

**Chart 4 — Net Profit & Margin by Phase (Combo Chart)**
- Bars: NDP per phase (RM)
- Line: Profit margin % per phase
- Configurable threshold line at project hurdle rate

**Chart 5 — Phase Timeline (Gantt-style)**
- Horizontal bars per phase showing launch dates
- Colour by development type (no phase group colouring)

**Summary Table**
- All user-created phases (dynamic, not fixed 18) + Total row
- Columns: Phase Name | Dev Type | Units | NDV | GDV | Const. Cost | Const. PSF | NDP | Margin %
- Sortable, exportable to CSV / PDF

### 7.5 Export Centre (`/project/:id/export`)

The Export Centre provides three download formats. All exports are generated **server-side** in Node.js to ensure pixel-accurate formatting and consistent output across all browsers and operating systems.

---

#### 7.5.1 Excel Export — Exact Template Format

**Library:** `exceljs` (preferred over SheetJS for full style fidelity — supports borders, fills, merged cells, number formats, and row/column dimensions)

**Requirement:** The exported `.xlsx` file must be **byte-for-byte layout-identical** to the uploaded `Feasibility_Study_Template.xlsx`. Every formatting attribute observed in the original must be reproduced exactly.

##### Sheet Structure

The exported `.xlsx` workbook contains **two sheets:**

**Sheet 1 — "Feasibility Study" (All Phases)**
- The original multi-phase summary format: 193 rows × dynamic columns
- Columns A–H: fixed left structure (row labels, descriptions, rates, totals)
- One pair of data + spacer columns per user-defined phase — **no cap on phase count** (columns extend rightward indefinitely)
- TOTAL column at the far right
- All original formatting, column widths, row heights, fonts, fills, borders, and merged cells reproduced exactly (see specs below)
- Misc cost item rows inserted dynamically in Sub-section E with the user-defined labels; row count expands to accommodate them

**Sheet 2 onwards — One sheet per phase (named by phase name)**
- Each sheet is the single-phase version of the original template (same 193 rows × 8 fixed columns + 1 data column + TOTAL)
- Formatted identically to Sheet 1 but scoped to one phase's data
- Sheet tabs are named after the user-defined phase names (e.g. "Phase 1a", "Block A", "Tower 3")
- Useful for printing or sharing individual phase workbooks without the full multi-phase view



| Column(s) | Width |
|-----------|-------|
| A | 6.664 |
| B | 21.109 |
| C | 51.219 |
| D | 17.109 |
| E | 18.332 |
| F | 28.0 |
| G | 22.777 |
| H | 22.664 |
| Per-phase data col (I, K, M…) | 15.664 |
| Per-phase spacer col (J, L, N…) | 3.664 |
| TOTAL data col | 18.109 |

- Row heights reproduced exactly (e.g. row 1 = 21pt, rows 4–62 = 15pt, row 63 = 30pt, row 71 = 30pt, rows 72–74 = 22.95pt, row 76 = 6.9pt, row 132 = 28.2pt, separator rows = 6.9pt)

##### Typography — All Cells
- **Base font:** Arial, 10pt for all cells
- **Header row 1 (project name):** Arial, 16pt, Bold
- **Header rows 2–3 (study title):** Arial, 14pt, Bold
- **Section headers (A, B, items 5–20):** Arial, 10pt, Bold
- **Sub-item labels:** Arial, 10pt, Normal
- **Net Selling PSF values:** Arial, 10pt, Bold + Italic
- **Construction Cost (CC) subtotal label:** Arial, 10pt, Bold + Italic
- **Reference/conversion values (red):** Arial, 10pt, color `FF0000`

##### Cell Fills
| Area | Fill Colour |
|------|------------|
| Development type rows (Row 22 per phase) | Yellow `FFFF00` |
| Bumiputera effective rate cell (G65) | Yellow `FFFF00` |
| All other cells | No fill / transparent |

##### Borders
Borders are the primary structural element of the template. Reproduce exactly:
- **Left edge of data area (Col A):** medium left border on rows 11, 20, 22–27, 63, 65–67, 71, 77–83, 85–87, 99, 103, 106, 109, 119, 122, 125, 128, 130, 134, 145, 148, 151, 155, 158, 161–164, 168, 169
- **Per-phase data columns (I, K, M…):** medium left + medium right border on all data rows, creating a "box" around each phase column pair
- **Summary rows (GDV=63, NDV=71, GDC=130, 145, 155, GDP=148, 158, NDP=168):** thin top + thin bottom borders spanning A–H
- **Bottom of table (Row 169):** medium bottom border spanning A through last TOTAL column
- **Spacer columns (J, L, N…):** right medium border only

##### Number Formats — Reproduce Exactly
| Cell type | Format string |
|-----------|--------------|
| Monetary values (RM) | `_(* #,##0_);_(* \(#,##0\);_(* "-"??_);_(@_)` |
| Monetary with decimals | `_(* #,##0.00_);_(* \(#,##0.00\);_(* "-"??_);_(@_)` |
| PSF values | `"RM"#,##0\ "psf"` |
| Percentage (0 dp) | `0%` |
| Percentage (2 dp) | `0.00%` |
| Bumi quota label | `"for"\ 0%\ "of NDV"` |
| Date (launch date) | `mmm-yy` |
| Land area | `0\ "acres"` |
| Area (sqft) | `#,##0\ " sqft"` |
| Item numbers | `0.0` |

##### Merged Cells — Reproduce Exactly
All merged ranges from the original must be recreated:
- `A85:A87` (GCC section label spans 3 rows)
- `B85:C87` (GCC section description spans 3 rows)
- `A130:F131`, `A145:G146`, `A148:F149`, `A155:F156`, `A158:F159` (summary row label merges)
- Per-phase merged result cells on rows 130–131, 145–146, 155–156 for each phase column
- `A69:H70` (NDV note row)
- `A132:H132` (GDC before land cost label)
- `U2:U5` (reference area)
- `AW7:AW9` (Phase 2j label)

##### Alignment
- Phase header names (row 9): horizontal center
- Section letter labels (A, B): horizontal center, vertical center
- Item numbers (col A): horizontal center, vertical center
- Sub-item descriptions (col C): horizontal right, vertical center
- Launch dates: horizontal center
- All monetary values in phase columns: default (right-align)
- NDV note row: left-align

##### Page Setup — Reproduce Exactly
- Orientation: Portrait
- Paper size: A3 (paperSize = 8)
- Margins: left=0.236", right=0.236", top=0.236", bottom=0.512" (6mm / 6mm / 6mm / 13mm)
- Fit to page: width × height as original
- No print area set

##### Data Mapping — App Data → Excel Cells

The excelExport service maps live database values into the correct cells:

| App Data | Excel Location |
|----------|---------------|
| Project name | A1 |
| Phase name (per phase) | Row 9, phase data column |
| Launch date | Row 11, phase data column |
| Land area (acres) | Row 13, phase data column |
| No. of units | Row 16, phase data column |
| NFA (saleable area) | Row 17, phase data column |
| Development type | Row 22, phase data column |
| Unit count residential | Row 23 D |
| Unit count commercial | Row 24 D |
| NFA residential | Row 25 D |
| NFA commercial | Row 26 D |
| Per unit type rows | Rows 29–62, phase data column (NDV contribution) |
| NDV | Row 71, phase data column |
| Bumi deduction | Row 65, phase data column |
| Legal fees | Row 66, phase data column |
| Early bird | Row 67, phase data column |
| GDV | Row 63, phase data column |
| Net selling PSF | Row 75, phase data column |
| Land cost | Row 80, phase data column |
| Land conversion premium | Row 81, phase data column |
| Quit rent | Row 82, phase data column |
| Assessment | Row 83, phase data column |
| GCC | Row 85, phase data column |
| Construction CC | Row 99, phase data column |
| Preliminary | Row 100, phase data column |
| Contingency | Row 101, phase data column |
| SST | Row 102, phase data column |
| Strata title fees | Row 103, phase data column |
| Planning fees | Row 106, phase data column |
| Authority contributions total | Row 109, phase data column |
| Consultancy fees | Row 119, phase data column |
| Site admin | Row 125, phase data column |
| GDC before marketing | Row 130, phase data column |
| Marketing expenses | Row 134, phase data column |
| GDC after marketing | Row 145, phase data column |
| GDP after marketing | Row 148, phase data column |
| Financial charges | Row 151, phase data column |
| GDC after finance | Row 155, phase data column |
| GDP after finance | Row 158, phase data column |
| Total overheads | Row 166, phase data column |
| NDP | Row 168, phase data column |
| Profit margin % | Row 169, phase data column |
| TOTAL column | Rightmost data column, all rows |

##### Rate/Assumption Cells (Cols D–H, rows 65–169)
All user-entered rate inputs are written to their corresponding cols D–G cells exactly as in the original template (e.g. E65 = bumi_discount_pct, F65 = bumi_quota_pct, G65 = computed effective %, F66 = legal_fees_pct, F67 = early_bird_discount_pct, F89 = construction_psf_residential, etc.).

---

#### 7.5.2 Dashboard PDF Export

**Library:** `puppeteer` (headless Chrome — renders the live React dashboard page to PDF, preserving all chart images, colours, fonts, and layout exactly as seen on screen)

**Approach:** Server spawns a Puppeteer instance, navigates to the dashboard URL with a `?print=true` query param (which hides interactive controls and shows a print-optimised layout), captures the full page as PDF.

##### PDF Page Specifications
- Paper: **A4 Landscape (297mm × 210mm)**
- Margins: 8mm all sides
- Scale: 0.80 (reduces element size to fit all content cleanly on A4)
- Background graphics: enabled (preserves chart fills and coloured KPI cards)
- Print CSS class `.print-hide` hides: navigation sidebar, export buttons, interactive tooltips
- Print CSS class `.print-show` reveals: chart titles with full label text, legend boxes

##### PDF Page Layout (Dashboard)
The `?print=true` layout renders in this fixed order across pages:

**Page 1 — Executive Summary**
- Company logo (top-left) + Project name + export date (top header bar)
- 6 KPI cards in a 3×2 grid: Total GDV | Total NDV | Total Construction Cost | Total Construction Cost PSF | Net Development Profit | Profit Margin % — each card coloured green/amber/red based on hurdle rate
- Chart 1: GDV vs NDV by Phase (full width, 90mm tall)

**Page 2 — Cost & Profit Analysis**
- Chart 2: Cost Breakdown Waterfall — Project Total (full width, 90mm tall)
- Chart 4: Net Profit & Margin by Phase — combo chart with hurdle rate dashed reference line (full width, 90mm tall)

**Page 3 — Construction & Timeline**
- Chart 3: Construction Cost PSF by Phase (half width left, 80mm tall)
- Chart 5: Phase Timeline / Gantt (half width right, 80mm tall)
- Summary Table — all phases + Total row (full width, remaining height)

##### PDF Fidelity Rules
- All chart colours identical to the web dashboard (Recharts SVG renders faithfully through Puppeteer)
- Table row shading, alternating colours, and bold Total row preserved
- NDP margin % cells colour-coded green/amber/red per hurdle rate setting
- Number formatting identical to dashboard (RM X.XM / X.X% / RM XXX psf)
- Page numbers printed bottom-right on each page: "Page X of 3"
- Project name printed as header on pages 2 and 3

---

#### 7.5.3 Feasibility Study PDF Export

**Library:** `puppeteer` — same approach as dashboard PDF

**Approach:** Server renders the Feasibility Study Editor in a special print mode (`?print=true`) which collapses the tab navigation and renders all phases stacked vertically as continuous sections, then exports the full page scroll as a multi-page PDF.

##### PDF Page Specifications
- Paper: **A4 Landscape (297mm × 210mm)**
- Margins: 6mm all sides
- Scale: auto-computed based on phase count — starts at 0.70 for ≤ 6 phases, reduces by ~0.05 per additional 2 phases, minimum 0.45
- Background graphics: enabled

##### Print Layout for Feasibility PDF
The `?print=true` feasibility view renders as a continuous HTML table that mimics the Excel structure:

- **Fixed left columns (A–H):** Row labels, item numbers, descriptions, rate inputs — rendered as a sticky left section
- **Phase data columns:** One column per user-defined phase + TOTAL — rendered side by side exactly as in Excel
- **Formatting matches Excel exactly:**
  - Yellow fills on development type rows
  - Medium borders around each phase column
  - Thin top/bottom borders on summary rows (GDV, NDV, GDC, NDP)
  - Bold text on all section headers and summary rows
  - Bold+italic on Net Selling PSF and Construction Cost (CC) rows
  - Number formatting: RM #,##0 for monetary, 0.00% for margins, "RM X psf" for PSF values

##### PDF Page Breaks
- **Page 1:** Project header (rows 1–10) + Section A: GDV table (rows 11–75)
- **Page 2:** Section B: GDC Part 1 — Land costs through Construction costs (rows 77–128)
- **Page 3:** Section B: GDC Part 2 — Marketing, Financial charges, Overheads, NDP summary (rows 129–169)
- If a project has many phases (> 8), the wide table is allowed to scroll horizontally within each page using `overflow: visible` and a smaller scale factor (auto-computed based on phase count)

##### Feasibility PDF Header/Footer
- **Header (every page):** Company name (from project settings) | "OVERALL FEASIBILITY STUDY" | Project name | "Page X of Y"
- **Footer (every page):** "Confidential — For internal use only" | Export timestamp

---

#### 7.5.4 Download UI

The Export Centre page presents three clearly labelled download buttons:

```
┌─────────────────────────────────────────────────────────────────┐
│  EXPORT CENTRE                                                  │
├─────────────────────────┬───────────────────────────────────────┤
│  📊 Feasibility Study   │  Download the complete feasibility    │
│     Excel (.xlsx)       │  study: a summary sheet with all      │
│                         │  phases + one tab per phase.          │
│  [↓ Download Excel]     │                                       │
├─────────────────────────┼───────────────────────────────────────┤
│  📋 Feasibility Study   │  Download the feasibility study as    │
│     PDF                 │  a PDF formatted to match the Excel   │
│                         │  layout exactly. A4 landscape.        │
│  [↓ Download PDF]       │                                       │
├─────────────────────────┼───────────────────────────────────────┤
│  📈 Dashboard PDF       │  Download the management dashboard    │
│                         │  with all KPI cards, charts, and      │
│                         │  summary table. A4 landscape.         │
│  [↓ Download PDF]       │                                       │
├─────────────────────────┼───────────────────────────────────────┤
│  📄 Summary CSV         │  Lightweight CSV of key metrics per   │
│                         │  phase for use in other tools.        │
│  [↓ Download CSV]       │                                       │
└─────────────────────────┴───────────────────────────────────────┘
```

- All three downloads are also accessible from the top toolbar on both the Study Editor and Dashboard pages via a "⬇ Export" dropdown button — so users never need to navigate away to download
- While generating, a spinner with "Generating export…" replaces the button (Excel typically < 2s; PDFs typically 5–10s via Puppeteer)
- On completion, the browser triggers a native file download with a filename of: `Wai_Property_Feasibility_2026-03-09.xlsx` / `.pdf`

---

#### 7.5.5 CSV Export

- Available from the Summary Table on the Dashboard page via a secondary "⬇ CSV" button
- Exports all phase rows + TOTAL row with columns: Phase Name | Dev Type | Launch Date | Units | NDV | GDV | GCC | Const PSF | Land Cost | GDC | NDP | Margin %
- Formatted as UTF-8 CSV with RM values as raw numbers (no currency symbols) for spreadsheet compatibility

---

## 8. Tech Stack Details

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| React | 18 | UI framework |
| React Router | v6 | Page routing |
| React Query (TanStack) | v5 | Server state, caching, auto-refetch |
| Recharts | latest | All dashboard charts |
| **Anime.js** | **v3** | **All UI animations — page transitions, scroll effects, micro-interactions** |
| React Hook Form | latest | Form management in study editor |
| Zod | latest | Client-side validation |
| Tailwind CSS | v3 | Styling |
| shadcn/ui | latest | Component library (tables, modals, tabs) |
| @supabase/supabase-js | v2 | Supabase client — auth, realtime subscriptions, direct DB access |
| xlsx (SheetJS) | latest | Excel import parsing (upload direction only) |
| date-fns | latest | Date formatting |

#### Animation Strategy — Performance-First (Minimal)

The user has confirmed **speed over visual polish**. Animations are stripped to the functional minimum. The goal is zero perceived jank — every transition must feel instant, not theatrical.

**Retained animations (functional value only):**
| Trigger | Element | Animation | Duration | Notes |
|---------|---------|-----------|----------|-------|
| KPI number on page load | `.kpi-value` | Count up 0 → final value | 600ms `easeOutExpo` | Helps users read large numbers changing |
| Page route change | `.page-shell` | `opacity: 0→1` | 150ms `easeOutSine` | Prevents flash of unstyled content |
| Auto-save indicator | `.save-dot` | pulse fade | 800ms | Confirms save without distracting |
| Toast notification enter/exit | `.toast` | `translateY + opacity` | 200ms | Functional feedback only |
| Modal open/close | `.modal-card` | `opacity + scale 0.96→1` | 160ms `easeOutSine` | Subtle, not bouncy |

**Removed entirely** (previously planned, now cut for performance):
- Phase tab switch slide animations
- Chart container scale-in on mount
- Scroll-triggered section header animations
- Summary table row stagger
- Unit type row add/delete expand/collapse
- Sensitivity heatmap cell stagger reveal
- Button hover/press scale micro-interactions
- Scenario card promote pulse
- Cost Allocation Manager row slide-in stagger

**Implementation:** All remaining animations are in `client/src/animations/index.js` as simple exported functions. `prefers-reduced-motion` is respected — if set, all animations are skipped entirely (duration = 0).

```js
// client/src/animations/index.js — minimal set only
import anime from 'animejs/lib/anime.es.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const pageEnter = (el) => anime({
  targets: el, opacity: [0, 1],
  duration: reduced ? 0 : 150, easing: 'easeOutSine',
});

export const countUp = (el, endValue) => anime({
  targets: { value: 0 }, value: endValue, round: 1,
  duration: reduced ? 0 : 600, easing: 'easeOutExpo',
  update(anim) { el.textContent = formatCurrency(anim.animations[0].currentValue); },
});
```

> **Note on Anime.js dependency:** Given the minimal animation set, the team may elect to replace Anime.js with simple CSS transitions + a single vanilla countUp utility. This is acceptable — the architecture does not depend on Anime.js specifically. The decision is left to the implementer.

---

### Backend
| Library | Version | Purpose |
|---------|---------|---------|
| Node.js | 20 LTS | Runtime |
| Express | 4 | HTTP framework |
| **@supabase/supabase-js** | **v2** | **Supabase client — DB queries via PostgREST and file storage** |
| Zod | latest | Server-side input validation |
| multer | latest | Excel file uploads (multipart/form-data) |
| xlsx (SheetJS) | latest | Parse uploaded Excel files on import |
| **exceljs** | **latest** | **Excel export — full style, border, merge, number format fidelity** |
| **puppeteer** | **latest** | **PDF export — headless Chrome renders dashboard + feasibility to PDF** |
| cors | latest | Cross-origin headers |
| helmet | latest | Security headers |
| dotenv | latest | Environment config |

> **No authentication layer.** All API endpoints are open. The app is secured at the network level only (VPN / internal LAN). Supabase RLS policies are permissive — all operations are allowed. No JWT, no sessions, no login page.

> **Supabase replaces standalone PostgreSQL + Prisma.** Supabase provides a hosted PostgreSQL instance, auto-generated REST API (PostgREST), real-time subscriptions via websockets, and file storage. The `@supabase/supabase-js` client is used on both frontend (for realtime subscriptions) and backend (for server-side DB operations with the service role key). Schema migrations are managed via `supabase db push`.

> **Why exceljs over SheetJS for export?** SheetJS community edition has limited styling support. `exceljs` provides full programmatic control over cell fonts, fills, borders, merged cells, column widths, row heights, number formats, and page setup — all required to match the original template exactly.

> **Why Puppeteer for PDF?** Puppeteer renders the live React page through a real Chrome engine, guaranteeing that Recharts SVG charts, Tailwind colours, and table layouts in the PDF are pixel-identical to what the user sees on screen.

**Supabase Architecture**

```
Supabase Project
├── PostgreSQL 15          ← All tables (projects, phases, scenarios, app_settings, etc.)
├── PostgREST              ← Auto-generated REST API (used by supabase-js)
├── Row Level Security     ← Permissive (no auth) — all operations allowed
├── Realtime               ← WebSocket subscriptions for live calculation updates
└── Storage                ← Uploaded Excel files + company logo (settings/logo)
```

**Realtime Subscriptions** — used for the live results panel in the Scenario Manager. When the backend writes updated `scenario_results` to Supabase, the frontend subscription fires and the Live Results Panel updates without polling:

```js
// client/src/hooks/useLiveResults.js
const channel = supabase
  .channel(`scenario-results:${scenarioId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'scenario_results',
    filter: `scenario_id=eq.${scenarioId}`,
  }, (payload) => setResults(payload.new))
  .subscribe();
```

**Supabase Local Development** — the `supabase` CLI runs a full local Supabase stack (PostgreSQL + PostgREST + Auth + Realtime + Studio) inside Docker via `supabase start`. This is the authoritative local dev database — see Docker Compose section.

**Environment Variables**
```
SUPABASE_URL=https://<project-ref>.supabase.co          # Staging/Prod
SUPABASE_ANON_KEY=<anon-key>                            # Public (frontend)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>            # Private (backend only)
SUPABASE_DB_URL=postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres
```

### Dev & Infrastructure
| Tool | Purpose |
|------|---------|
| Vite | Frontend build tool |
| ESLint + Prettier | Code quality |
| Jest | Unit tests (calculation engine) |
| Supabase CLI | Database migrations, local stack management |
| Docker Compose | Local dev + staging + production environments (see Section 15) |
| GitHub Actions | CI/CD pipeline |

---

## 9. Project Structure

```
feasibility-app/
│
├── client/                              # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ProjectList.jsx
│   │   │   ├── ProjectOverview.jsx
│   │   │   ├── StudyEditor.jsx
│   │   │   ├── CostAllocation.jsx           # Construction cost allocation manager
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ScenarioManager.jsx
│   │   │   ├── ScenarioCompare.jsx
│   │   │   ├── SensitivityAnalysis.jsx
│   │   │   ├── Export.jsx
│   │   │   ├── Snapshots.jsx                # Version history: list, compare, restore
│   │   │   └── Settings.jsx                 # App settings: company name, logo, hurdle rate
│   │   ├── components/
│   │   │   ├── layout/                  # Sidebar, Navbar, PageShell, AnimatedOutlet
│   │   │   ├── study/                   # PhaseTab, UnitTypeGrid, SummaryPanel
│   │   │   ├── allocation/              # AllocationMatrix, AllocationRow, PoolTotalInput, AllocationStatusBadge
│   │   │   ├── dashboard/               # KPICard, PhaseBarChart, WaterfallChart, etc.
│   │   │   ├── scenarios/               # ScenarioCard, ScenarioInputForm, LiveResultsBar
│   │   │   ├── comparison/              # CompareTable, WaterfallGroup, RadarChart, TornadoChart
│   │   │   ├── sensitivity/             # SingleVarTable, TwoVarHeatmap, SensitivityChart
│   │   │   └── shared/                  # DataTable, Modal, CurrencyInput, Toast
│   │   ├── animations/
│   │   │   ├── index.js                 # All anime() exports (pageEnter, pageExit, staggerCards, countUp, etc.)
│   │   │   └── scroll.js                # IntersectionObserver + anime scroll-trigger helpers
│   │   ├── hooks/
│   │   │   ├── useProject.js
│   │   │   ├── usePhase.js
│   │   │   ├── useDashboard.js
│   │   │   ├── useAnimate.js            # useEffect wrapper for scroll-triggered animations
│   │   │   └── useLiveResults.js        # Supabase realtime subscription for scenario results
│   │   ├── lib/
│   │   │   └── supabaseClient.js        # createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
│   │   ├── api/                         # Axios API client functions (Express backend calls)
│   │   ├── utils/                       # formatCurrency, formatPSF, formatDate, etc.
│   │   └── App.jsx
│   ├── .env.local                       # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│   └── package.json
│
├── server/                              # Node.js / Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── projects.js
│   │   │   ├── phases.js
│   │   │   ├── study.js
│   │   │   ├── costAllocation.js        # CRUD for pools + allocation %s + distribute helpers
│   │   │   ├── scenarios.js
│   │   │   ├── sensitivity.js
│   │   │   ├── dashboard.js
│   │   │   └── export.js
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── calculationEngine.js     # All Excel formulas (pure function)
│   │   │   ├── scenarioEngine.js        # Scenario recalc + comparison aggregation
│   │   │   ├── sensitivityEngine.js     # Single-var + two-var table generators
│   │   │   ├── excelImport.js           # Parse uploaded .xlsx → Supabase
│   │   │   ├── excelExport.js           # Generate .xlsx via exceljs (exact template format)
│   │   │   ├── pdfDashboard.js          # Puppeteer → dashboard PDF (A3 landscape)
│   │   │   └── pdfFeasibility.js        # Puppeteer → feasibility PDF (A3 landscape, Excel layout)
│   │   ├── lib/
│   │   │   └── supabaseClient.js        # createClient(URL, SERVICE_ROLE_KEY) — server-side
│   │   ├── middleware/
│   │   └── app.js
│   ├── .env                             # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
│   └── package.json
│
├── supabase/                            # Supabase project config (CLI-managed)
│   ├── config.toml                      # Local dev ports, auth settings
│   ├── migrations/
│   │   ├── 0001_create_projects.sql
│   │   ├── 0002_create_phases.sql
│   │   ├── 0003_create_unit_types.sql
│   │   ├── 0004_create_cost_assumptions.sql
│   │   ├── 0005_create_misc_cost_items.sql
│   │   ├── 0006_create_scenarios.sql
│   │   ├── 0007_create_results.sql
│   │   ├── 0008_create_construction_cost_pools.sql
│   │   ├── 0009_create_construction_cost_allocations.sql
│   │   ├── 0010_create_scenario_allocation_overrides.sql
│   │   ├── 0012_create_app_settings.sql
│   │   └── 0014_enable_rls_policies.sql
│   └── seed.sql                         # Default cost assumption seeds (Excel defaults)
│
├── docker/
│   ├── client.Dockerfile                # Multi-stage: build (Node) → serve (nginx)
│   ├── server.Dockerfile                # Multi-stage: build (Node) → runtime (Node slim)
│   └── nginx/
│       ├── local.conf                   # Nginx config for local dev (proxy to Vite HMR)
│       └── prod.conf                    # Nginx config for staging/production (serve built SPA)
│
├── docker-compose.yml                   # Local development
├── docker-compose.staging.yml           # Staging overrides
├── docker-compose.prod.yml              # Production overrides
├── .env.example                         # Template for all environment variables
└── README.md
```

---

## 10. API Endpoints

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| GET | `/api/auth/me` | Get current user profile + role | any |
| GET | `/api/settings` | Get app settings (company name, logo URL) | any |
| PUT | `/api/settings` | Update company name, logo, hurdle rate | any |
| POST | `/api/settings/logo` | Upload company logo to Supabase Storage | admin / finance |
| GET | `/api/users` | List all users + roles | admin |
| PUT | `/api/users/:id/role` | Update a user's role | admin |
| GET | `/api/projects` | List all projects | any |
| POST | `/api/projects` | Create new project | pm / finance / admin |
| GET | `/api/projects/:id` | Get project details | any |
| PUT | `/api/projects/:id` | Update project header | pm / finance / admin |
| DELETE | `/api/projects/:id` | Delete project | pm / admin |
| GET | `/api/projects/:id/phases` | List all phases for project | any |
| GET | `/api/phases/:id` | Get phase with full data | any |
| PUT | `/api/phases/:id` | Update phase inputs → triggers recalculation | pm / finance / admin |
| POST | `/api/phases/:id/unit-types` | Add unit type row | pm / finance / admin |
| PUT | `/api/unit-types/:id` | Update unit type | pm / finance / admin |
| DELETE | `/api/unit-types/:id` | Remove unit type row | pm / finance / admin |
| GET | `/api/projects/:id/dashboard` | Aggregated KPIs + per-phase results | any |
| GET | `/api/projects/:id/cost-allocation` | Get all pools + all phase allocations (matrix) | any |
| PUT | `/api/projects/:id/cost-allocation` | Bulk update all allocation %s (validates 100% per pool) | pm / finance / admin |
| POST | `/api/projects/:id/cost-allocation/pools` | Add custom cost pool item | pm / finance / admin |
| PUT | `/api/cost-allocation/pools/:poolId` | Update pool total amount or display name | pm / finance / admin |
| DELETE | `/api/cost-allocation/pools/:poolId` | Delete custom pool | pm / finance / admin |
| POST | `/api/projects/:id/cost-allocation/distribute-evenly` | Auto-balance: set all phases to 100%÷N | pm / finance / admin |
| POST | `/api/projects/:id/cost-allocation/distribute-by-land-area` | Auto-balance by land area ratio | pm / finance / admin |
| POST | `/api/projects/:id/cost-allocation/distribute-by-unit-count` | Auto-balance by unit count ratio | pm / finance / admin |
| GET | `/api/phases/:id/scenarios` | List all scenarios for a phase | any |
| POST | `/api/phases/:id/scenarios` | Create new scenario (blank or clone) | pm / finance / admin |
| GET | `/api/scenarios/:id` | Get scenario with full inputs + results | any |
| PUT | `/api/scenarios/:id` | Update scenario inputs → triggers recalculation | pm / finance / admin |
| DELETE | `/api/scenarios/:id` | Delete scenario (cannot delete base case) | pm / finance / admin |
| POST | `/api/scenarios/:id/set-base` | Promote scenario to Base Case | pm / admin |
| GET | `/api/phases/:id/scenarios/compare` | Side-by-side results for all scenarios | any |
| POST | `/api/scenarios/:id/sensitivity` | Run single-variable sensitivity table | pm / finance / admin |
| POST | `/api/scenarios/:id/sensitivity/two-variable` | Run two-variable heat map table | pm / finance / admin |
| POST | `/api/projects/import/preview` | Dry-run: parse Excel, return mapped + unmapped fields for review — no DB writes | pm / finance / admin |
| POST | `/api/projects/import` | Confirm import: save reviewed/corrected data to DB | pm / finance / admin |
| GET | `/api/projects/:id/export/excel` | Generate and stream .xlsx (exact template format) | any |
| GET | `/api/projects/:id/export/pdf/feasibility` | Generate and stream feasibility PDF | any |
| GET | `/api/projects/:id/export/pdf/dashboard` | Generate and stream dashboard PDF | any |
| GET | `/api/projects/:id/export/csv` | Stream summary table as UTF-8 CSV | any |

---

## 11. Development Phases & Timeline

### Phase 1 — Foundation (Weeks 1–2)
- [ ] Project scaffold: Vite + React + Express + Docker Compose (local)
- [ ] `supabase init` — configure local Supabase stack via CLI (`supabase start`)
- [ ] Database schema via Supabase migrations — `app_settings`, `projects`, `phases`, `unit_types`, `cost_assumptions`, `construction_cost_pools`, `construction_cost_allocations`, `scenarios`, `scenario_results`, RLS (permissive)
- [ ] `seed.sql`: default cost items, default allocation pools, `app_settings` singleton row
- [ ] Basic CRUD: projects and phases via `@supabase/supabase-js` server client
- [ ] Calculation engine (JS module) with unit tests for all 20+ formulas against Excel reference values
- [ ] Portfolio dashboard page — project cards, status filter, KPI totals, NDP margin chart, launch timeline
- [ ] Project Overview page — phase cards, drag-to-reorder, status badge, clone project action
- [ ] Minimal animation setup: `animations/index.js` with countUp + opacity page fade only

**Milestone:** Core data model working, all formulas verified against Excel, portfolio + project overview pages navigable

### Phase 2 — Study Editor (Weeks 3–4)
- [ ] Phase tab navigation (dynamic user phases + TOTAL tab)
- [ ] Unit type input grid (editable table with add/remove rows)
- [ ] Cost assumption inputs with default values from Excel (seeded via `seed.sql`)
- [ ] Real-time auto-calculation on input change (500ms debounce → API → recalc → display)
- [ ] Auto-save with "Last saved [time]" indicator; save failure banner
- [ ] Per-phase financial summary panel (GDV → NDP)
- [ ] TOTAL aggregation tab
- [ ] Form validation (Zod)
- [ ] Construction Cost Allocation Manager page — matrix table, distribution helpers (evenly / by land area / by unit count), 100% validation, unbalanced warning banner

**Milestone:** Full parity with Excel — any data entry produces identical outputs; auto-save reliable

### Phase 3 — Scenario Comparison & Sensitivity Analysis (Weeks 5–6)
- [ ] Scenario data model migrations in Supabase
- [ ] Scenario Manager page — create (blank / clone), rename, delete, colour-tag
- [ ] Scenario Input Form — GDV section (unit grid with layout size + selling PSF), Cost section (6 primary variable cards + secondary accordion)
- [ ] Live Results Panel — Supabase realtime subscription (`useLiveResults` hook) fires on `scenario_results` UPDATE; panel values update via countUp
- [ ] Set-as-Base-Case workflow with confirmation dialog
- [ ] Scenario Comparison view — side-by-side table, variance highlighting
- [ ] Comparison charts: NDP/Margin bar, side-by-side waterfall, radar/spider chart, tornado chart
- [ ] Sensitivity Analysis — single-variable table + line chart with break-even marker
- [ ] Two-variable heat map
- [ ] Scenario export: include in PDF / Excel exports

**Milestone:** Finance team can fully model Base / Optimistic / Conservative / Offer scenarios and present comparison to management

### Phase 4 — Management Dashboard (Weeks 7–8)
- [ ] KPI summary cards (6 metrics) with countUp number animation on mount
- [ ] GDV vs NDV grouped bar chart (all phases + total)
- [ ] Cost waterfall chart (project total)
- [ ] Construction PSF bar chart
- [ ] NDP + Margin combo chart
- [ ] Phase timeline (Gantt-style launch dates)
- [ ] Summary table — row stagger reveal on scroll into view
- [ ] Responsive layout for large screens / TV presentation

**Milestone:** Dashboard ready for senior management presentation with polished animations

### Phase 5 — Export, Import & Polish (Weeks 9–10)

**Excel Export (exceljs)**
- [ ] Set up `excelExport.js` service with exceljs
- [ ] Reproduce exact column widths (A=6.664, B=21.109, C=51.219, D=17.109, E=18.332, F=28.0, G=22.777, H=22.664, phase data cols=15.664, spacer cols=3.664, TOTAL=18.109)
- [ ] Reproduce exact row heights (standard=15pt, row 1=21pt, rows 2–3=17.25pt, row 63=30pt, row 71=30pt, rows 72–74=22.95pt, separator rows=6.9pt, row 132=28.2pt)
- [ ] Reproduce all fonts: Arial 16pt bold (row 1), Arial 14pt bold (rows 2–3), Arial 10pt for all others, bold+italic for PSF and CC subtotal rows
- [ ] Reproduce all fills: yellow `FFFF00` on development type row and Bumi effective rate cell; no fill elsewhere
- [ ] Reproduce all borders: medium left+right on phase data columns, medium left edge col A, thin top+bottom on summary rows, medium bottom on row 169
- [ ] Reproduce all number formats: RM #,##0, RM #,##0.00, "RM" psf, 0%, 0.00%, mmm-yy dates
- [ ] Reproduce all merged cell ranges (A85:A87, B85:C87, A130:F131, A145:G146, A148:F149, A155:F156, A158:F159, A69:H70, A132:H132, per-phase row merges on summary rows, U2:U5, AW7:AW9)
- [ ] Map all computed values from DB to correct row/column positions
- [ ] Write all user-entered rate inputs to D–H columns
- [ ] Set page setup: portrait, A3, margins 6mm/6mm/6mm/13mm
- [ ] Dynamic phase columns: add one data+spacer column pair per user-defined phase in sort_order

**Dashboard PDF (Puppeteer)**
- [ ] Install and configure Puppeteer in Docker container
- [ ] Implement `?print=true` CSS mode in React dashboard: hide nav/buttons, fix chart sizes, show print headers
- [ ] `pdfDashboard.js` service: launch Puppeteer, navigate to dashboard print URL, wait for all Recharts SVGs to render, export A3 landscape PDF
- [ ] Page 1: KPI cards (3×2 grid) + Chart 1 (GDV vs NDV)
- [ ] Page 2: Chart 2 (Waterfall) + Chart 4 (NDP+Margin combo)
- [ ] Page 3: Chart 3 (Const PSF) + Chart 5 (Timeline) + Summary table
- [ ] Add page numbers (Page X of 3) and project name header on pages 2–3
- [ ] Verify all chart colours, table shading, and RM formatting render faithfully

**Feasibility Study PDF (Puppeteer)**
- [ ] Implement `?print=true` CSS mode for feasibility study: collapse phase tabs → vertical stacked sections
- [ ] Render structure as a single wide HTML table matching Excel layout (sticky left cols A–H, phase data cols side by side)
- [ ] Match all Excel formatting in the print CSS: yellow fills, medium borders per phase column, bold section headers, bold+italic PSF/CC rows, thin top+bottom on summary rows
- [ ] `pdfFeasibility.js` service: Puppeteer, A3 landscape, margins 6mm, scale factor auto-computed from phase count
- [ ] Page break rules: row 75 (after NDV), row 128 (after construction), remaining rows on page 3+
- [ ] Add header every page: company name | "OVERALL FEASIBILITY STUDY" | project name | "Page X of Y"
- [ ] Add footer every page: "Confidential — For internal use only" | export timestamp

**Import & Polish**
- [ ] Excel import parser (SheetJS — map known row/column positions to DB schema)
- [ ] `POST /api/projects/import/preview` dry-run endpoint — returns mapped / unmapped / skipped field lists
- [ ] `ImportReviewPage` — 3-column review: auto-mapped (read-only), unmapped (user fills), skipped (raw value + correction input)
- [ ] `POST /api/projects/import` confirm endpoint — saves reviewed data to DB
- [ ] Hurdle rate indicator: green/amber/red colour coding on all NDP margin % displays throughout the app
- [ ] Hurdle rate dashed reference line on NDP + Margin combo chart
- [ ] Settings page: `hurdle_rate_pct` field (default 15%), company name, logo upload
- [ ] Apply company logo + name to all PDF headers and Excel row 1
- [ ] Number formatting: RM millions on dashboard (RM 12.5M); full precision in editor (RM 12,500,000)
- [ ] Misc cost items: add/remove rows in Sub-section E; included in GDC calculation and all exports
- [ ] Export Centre page UI with four download buttons (Excel, Feasibility PDF, Dashboard PDF, CSV) + toolbar dropdown shortcut
- [ ] Loading spinner during generation; file download trigger on completion; auto-filename with date
- [ ] User Management page (admin only): list users, change roles, remove access
- [ ] Multiple project support — project switcher in nav
- [ ] Error handling, loading states, empty states
- [ ] UI polish: branding, typography
- [ ] Cross-browser testing
- [ ] **Ops Runbook** — written in `README.md`: setup, day-to-day operations, backup, troubleshooting (5 common scenarios), upgrade procedure — all steps as copy-paste terminal commands

**Milestone:** All three exports (Excel, Dashboard PDF, Feasibility PDF) are pixel-accurate and production-ready

### Phase 6 — Testing & Deployment (Week 11)
- [ ] Unit tests: calculation engine + scenario engine + sensitivity engine (Jest)
- [ ] Integration tests: all API endpoints including auth middleware, role guards, scenario, sensitivity, and export routes
- [ ] Auth tests: verify each role can only access permitted endpoints and UI elements
- [ ] Supabase RLS policy tests: verify `consultant` cannot write, `senior_management` read-only enforced
- [ ] Supabase migration smoke test against clean local instance
- [ ] Animation regression: verify no janky transitions on low-end hardware (Chrome DevTools throttle)
- [ ] End-to-end smoke tests (Playwright): login → create project → add phases → run scenario → export PDF
- [ ] `docker-compose.yml` — final local dev validation with all three services
- [ ] `docker-compose.staging.yml` — deploy to staging VPS; point to Supabase staging project
- [ ] `docker-compose.prod.yml` — deploy to production; point to Supabase production project
- [ ] Supabase production project: enable backups, configure connection pooling (PgBouncer), set RLS policies
- [ ] GitHub Actions CI/CD: lint → test → build → push Docker images → deploy staging → smoke test → promote to prod
- [ ] User documentation / quick-start guide

**Total Estimated Duration: 11 weeks**

---

## 12. Key Design Decisions

### All Inputs, No Hardcoded Rates
Every rate, PSF, lump sum, fee, and percentage in the system is a user `[input]` stored in the database. The calculation engine is a pure function that takes an inputs object and returns outputs — it contains no hardcoded constants. This means a user can model any market, geography, or project type without hitting invisible limits. Default hint values (e.g. RM 300 psf residential, 6.5% professional fees) are pre-filled in the UI as convenience starting points but are never enforced.

### NDV-First Revenue Model
NDV is calculated directly from unit sales (Σ unit_count × size × PSF). GDV is then back-calculated as NDV plus the deductions. This is the opposite of a gross-down model and must be preserved exactly. The UI displays NDV as the primary/top figure, with GDV shown as the derived gross figure below the deduction table. The Bumiputera discount is defined by two independent inputs: discount rate % (applied to bumi-quota units) and quota % (proportion of total NDV subject to the discount).

### Total Construction Cost PSF (All Phases)
The dashboard KPI formerly called "Blended Construction PSF" is renamed to **"Total Construction Cost PSF (All Phases)"** and is computed as Total GCC ÷ Total GFA across all active phases. Individual phase tabs also display a per-phase Construction Cost PSF. Both are labelled distinctly in the UI to avoid confusion.

### Phases Are Fully User-Managed
There are no pre-set phase codes, no Phase 1 / Phase 2 grouping, and no fixed count. Users create, name, reorder (drag-and-drop), and delete phases freely. The sort_order column controls display order. Deleting a phase with data requires a two-step confirmation. Phases can be toggled inactive (excluded from totals) without deletion for scenario modelling.

### Scenario Isolation
Every scenario stores its own complete copy of unit types and cost assumptions — there is no inheritance from the Base Case after creation. This means editing the Base Case never silently affects other scenarios. When a user clones a scenario, they get a point-in-time snapshot. This avoids the classic Excel problem of linked cells breaking when someone edits the "original."

### Auto-calculation Strategy
Every time a user edits any input in the study editor, the frontend sends the change to the backend API, the calculation engine recomputes all derived values for that phase, and the result is returned and displayed — similar to how Excel recalculates on cell change. A 500ms debounce prevents excessive API calls while typing.

### TOTAL Tab
The TOTAL tab sums all active phases. Phase results can be individually toggled active/inactive for scenario modelling without deletion.

### Defaults Pre-filled
All cost assumption inputs are pre-populated with the rates from the original Excel template so that a new project requires minimal setup. These are hints only — every field is overridable.

### Supabase as the Database Layer
Supabase is chosen over a self-hosted PostgreSQL + Prisma stack for three reasons: (1) the hosted cloud instance eliminates database operations burden in staging/production; (2) the realtime subscription system allows the Live Results Panel to update instantly via websocket without polling; (3) the built-in storage bucket handles uploaded Excel files without requiring a separate S3-equivalent setup. For local development, the Supabase CLI runs a full self-contained stack inside Docker so behaviour is identical to cloud. Schema changes are managed via versioned SQL migration files in `supabase/migrations/` and applied with `supabase db push`.

### Animation Strategy — Minimal, Performance-First
The user confirmed speed is more important than visual polish. All Anime.js animations are stripped to the functional minimum: KPI countUp on page load, a 150ms opacity fade for route transitions, auto-save pulse, and toast notifications. All other planned animations (stagger entrances, scroll triggers, phase tab slides, micro-interactions) are removed. The `animations/index.js` file is kept for the minimal retained set but is small enough it could be replaced with plain CSS transitions if preferred. `prefers-reduced-motion` disables all animations.

### Excel Import — Review-Before-Save
The import flow is two-step: (1) `POST /api/projects/import/preview` parses the uploaded `.xlsx` using SheetJS, maps known row/column positions to the DB schema, and returns a structured review object with three lists — **mapped fields** (auto-populated, shown as read-only), **unmapped fields** (no matching cell found — shown as empty inputs the user must fill), and **skipped fields** (found but couldn't parse cleanly — shown with the raw value and a correction input). The user reviews this on an `ImportReviewPage` before confirming. (2) `POST /api/projects/import` saves the corrected data to the DB. No data is written until the user clicks Confirm on the review screen.

### Hurdle Rate — Configurable Threshold with Visual Traffic Lights
The NDP margin hurdle rate is stored as `hurdle_rate_pct` in `app_settings` (default 15%). Every location in the app that displays NDP margin % shows a colour indicator: **green** ≥ hurdle rate, **amber** within 3 percentage points below, **red** more than 3 points below. This applies to: the phase summary panel, TOTAL tab, dashboard KPI card, scenario comparison table, and all PDF exports. The hurdle rate appears as a dashed reference line on the NDP + Margin combo chart. Configurable by any user in Settings (no role restriction).

### Miscellaneous Cost Items — Per-Phase Custom Rows
Each phase can have any number of user-defined miscellaneous cost rows (label + RM amount + optional notes), stored in `misc_cost_items`. These appear as a named sub-section in the Study Editor and in all exports (each row labelled individually). They feed directly into GDC. Scenarios have an independent `scenario_misc_cost_items` table so each scenario can have different misc items without affecting the base case or other scenarios.

### Launch Dates — Display Only
Phase launch dates appear on the Gantt timeline chart on the dashboard and in the summary table, but do not drive any financial calculations. Loan years (`land_loan_years`, `construction_loan_years`) remain independent manual inputs. This keeps the calculation engine simpler and more transparent — the user always knows exactly what drives finance charges.

### Excel Export — All Phases Side-by-Side (Single Sheet)
The exported workbook contains **one sheet** ("Feasibility Study") with all phases side-by-side in the original multi-column layout — exactly matching the original template structure, with columns extending rightward for any number of phases. No per-phase individual sheets. Misc cost item rows are inserted dynamically in Sub-section E with their user-defined labels.

### PDF Paper Size — A4 Landscape
Both the Dashboard PDF and Feasibility Study PDF are rendered to **A4 landscape (297mm × 210mm)**. A4 is the standard standard office printing size. The scale factor for the feasibility PDF is auto-computed based on phase count to ensure all columns fit without overflow.

### Responsive Design — Desktop Primary, Tablet + Mobile Supported
The app is designed desktop-first (1280px+) since the Study Editor and Cost Allocation matrix are wide, data-dense tables. On tablet (768–1279px): the phase tab bar scrolls horizontally; the allocation matrix switches to a vertically-stacked view per cost item; the dashboard charts resize fluidly. On mobile (<768px): the Study Editor and allocation matrix are read-only with a banner prompting the user to switch to a larger screen for editing; the portfolio dashboard and per-project KPI cards remain fully usable. The export and scenario compare features are desktop-only (no mobile layout).

### No Authentication — Network-Level Security
There is no login screen, no session management, and no JWT tokens. The app assumes it is deployed on an internal network (VPN or office LAN) where all users are trusted. Supabase RLS policies are set to permissive. API endpoints are open. Security is the responsibility of the network layer, not the application.
Given the small team size (2–10 users) and the fact that typically one person edits a project at a time, the app uses a simple last-write-wins strategy. No field locking or conflict detection is implemented. If two users happen to edit simultaneously, the second save silently overwrites the first. This is acceptable and keeps the architecture simple.

### Ops Runbook — IT-Maintainable Deployment
The deployment stack must be maintainable by an IT team with no coding background. The `README.md` includes a full **Operations Runbook** covering: initial setup (Docker Desktop, `.env` file from template, `docker compose up`), day-to-day operations (health check URLs, log inspection, restart commands), backup procedures (Supabase automated backups + manual export command), common troubleshooting scenarios (container won't start, PDF export times out, database connection error), and upgrade procedure (pull new image, run migrations, restart). All runbook steps use copy-paste terminal commands — no code editing required.

### Sensitivity Engine
The sensitivity engine runs entirely server-side. For a single-variable sweep of N steps, it calls the calculation engine N times with the variable substituted, returns an array of `{variable_value, ndp, margin}` tuples. For the two-variable heat map it runs N×M iterations. With the calculation engine being pure JS (no DB writes), a 10×10 two-variable table (100 iterations) completes in under 50ms.

### Currency Display
All monetary values displayed in Malaysian Ringgit (RM), formatted with thousands separators. PSF values to 2 decimal places. Large values shown in millions (e.g. RM 148.5M) on the dashboard, full precision in the editor.

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Formula discrepancy vs Excel | Medium | High | Unit-test every formula against Excel reference data before building UI |
| Excel import format variations | Medium | Medium | Build robust parser with fallback to manual entry |
| Performance on TOTAL aggregation (18 phases) | Low | Low | Aggregate is fast; cache results in `scenario_results` table |
| Scope creep on dashboard charts | Medium | Medium | Fix chart list in Phase 4, treat extras as post-launch |
| Data loss risk (no auth) | Low | High | Auto-save on every input change; soft-delete only; Supabase nightly backups enabled |
| Scenario proliferation (too many per phase) | Medium | Low | Soft-cap UI warning at 10 scenarios per phase; archive old scenarios |
| Sensitivity table performance | Low | Low | Two-variable tables max 10×10 = 100 recalcs; runs server-side in <1s |
| Excel export style drift from original | Medium | High | Extract and unit-test every style attribute from the original .xlsx; visual diff test against reference before release |
| Puppeteer PDF chart rendering timing | Medium | Medium | Wait for `recharts-surface` SVG elements to be fully painted before capture; add 2s render buffer |
| Puppeteer Docker container size | Medium | Low | Use Alpine Chromium in Dockerfile; ~400MB total; acceptable for server deployment |
| PDF wide table truncation (many phases) | Low | Medium | Auto-compute scale factor from phase count; cap at 0.55 minimum; warn user if > 15 phases |
| Allocation % not summing to 100% — blocking recalc | Medium | High | Real-time running total with colour-coded status badge; server rejects any save where Σ ≠ 100%; "Distribute Evenly" helper available per row |
| Phase addition leaving allocations < 100% | Medium | Medium | New phase auto-added with 0% to all pools; prominent rebalance warning banner shown on Study Editor and Cost Allocation pages until resolved |
| Phase deletion leaving allocations < 100% | Medium | Medium | Warning shown on delete confirm dialog: "This will make [X] cost allocations invalid. You must rebalance after deleting." Banner persists until fixed |
| Scenario allocation override conflicting with base | Low | Medium | Scenario overrides stored separately in `scenario_construction_cost_allocations`; validated independently; base case allocations never mutated by scenario edits |
| Supabase RLS misconfiguration | Low | Low | RLS is permissive (no auth); only risk is accidental data exposure on public network — mitigated by deploying on internal network only |
| Supabase realtime subscription memory leak | Medium | Medium | Always call `.unsubscribe()` in `useEffect` cleanup; test with React StrictMode double-mount |
| Responsive layout breaking on tablet (wide tables) | Medium | Medium | Study Editor and allocation matrix use horizontal scroll on tablet; test on iPad viewport (768px) during Phase 2 |

---

## 14. Docker Compose — Local, Staging & Production

Three Docker Compose files share a common service definition pattern. The base `docker-compose.yml` is used for local development. `docker-compose.staging.yml` and `docker-compose.prod.yml` are **override files** applied on top of the base with `docker compose -f docker-compose.yml -f docker-compose.staging.yml up`.

---

### 14.1 Services Overview

| Service | Local | Staging | Production |
|---------|-------|---------|-----------|
| `client` | Vite dev server (HMR) | Nginx serving built SPA | Nginx serving built SPA |
| `server` | Node.js with `nodemon` | Node.js compiled build | Node.js compiled build |
| `supabase` | Full local stack via Supabase CLI | ❌ (remote Supabase project) | ❌ (remote Supabase project) |

> Supabase is **only containerised for local development**. Staging and production environments connect to hosted Supabase projects (cloud-managed PostgreSQL, Auth, Realtime, Storage). This eliminates the operational burden of managing database containers in production.

---

### 14.2 `docker-compose.yml` — Local Development

```yaml
# docker-compose.yml
# Usage: docker compose up --build
# Starts: client (Vite HMR) + server (nodemon) + Supabase local stack

version: "3.9"

networks:
  app-network:
    driver: bridge

services:

  # ── React frontend (Vite dev server with Hot Module Replacement) ──────────
  client:
    build:
      context: ./client
      dockerfile: ../docker/client.Dockerfile
      target: dev                          # Multi-stage: dev stage only
    container_name: feasibility_client_local
    ports:
      - "5173:5173"                        # Vite default port
    volumes:
      - ./client:/app                      # Live code sync for HMR
      - /app/node_modules                  # Prevent host node_modules override
    environment:
      - NODE_ENV=development
      - VITE_SUPABASE_URL=http://localhost:54321   # Local Supabase Kong gateway
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_LOCAL_ANON_KEY}
      - VITE_API_BASE_URL=http://localhost:3001
    depends_on:
      - server
    networks:
      - app-network

  # ── Node.js / Express backend (nodemon for live reload) ──────────────────
  server:
    build:
      context: ./server
      dockerfile: ../docker/server.Dockerfile
      target: dev                          # Multi-stage: dev stage only
    container_name: feasibility_server_local
    ports:
      - "3001:3001"
    volumes:
      - ./server:/app                      # Live code sync for nodemon
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - PORT=3001
      - SUPABASE_URL=http://supabase-kong:8000   # Internal Docker network
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_LOCAL_SERVICE_ROLE_KEY}
      - CLIENT_URL=http://localhost:5173
    depends_on:
      supabase-db:
        condition: service_healthy
    networks:
      - app-network

  # ── Supabase local stack ──────────────────────────────────────────────────
  # Supabase CLI manages this; docker-compose references the CLI-started containers.
  # Run: supabase start   (before docker compose up)
  # This exposes the Supabase Studio at http://localhost:54323
  #
  # The following are the key Supabase services started by `supabase start`:
  supabase-db:
    image: supabase/postgres:15.1.0.147
    container_name: feasibility_supabase_db
    ports:
      - "54322:5432"                       # Direct Postgres access for migrations
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_DB=postgres
    volumes:
      - supabase_db_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d  # Auto-run migrations on init
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - app-network

  supabase-kong:                           # API gateway (PostgREST, Auth, Realtime, Storage)
    image: kong:2.8.1
    container_name: feasibility_supabase_kong
    ports:
      - "54321:8000"                       # http://localhost:54321 — Supabase API
    environment:
      - KONG_DATABASE=off
      - KONG_DECLARATIVE_CONFIG=/var/lib/kong/kong.yml
    networks:
      - app-network

  supabase-studio:                         # Supabase Studio UI (table editor, logs, SQL)
    image: supabase/studio:latest
    container_name: feasibility_supabase_studio
    ports:
      - "54323:3000"                       # http://localhost:54323
    environment:
      - SUPABASE_URL=http://supabase-kong:8000
      - SUPABASE_ANON_KEY=${SUPABASE_LOCAL_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_LOCAL_SERVICE_ROLE_KEY}
    networks:
      - app-network

volumes:
  supabase_db_data:
```

**Local Development Quick Start:**
```bash
cp .env.example .env.local
supabase start                          # Start local Supabase (get keys from output)
docker compose up --build               # Start client + server
# Client:          http://localhost:5173
# Server API:      http://localhost:3001
# Supabase Studio: http://localhost:54323
# Supabase API:    http://localhost:54321
```

---

### 14.3 `docker-compose.staging.yml` — Staging Overrides

```yaml
# docker-compose.staging.yml
# Usage: docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
# Connects to remote Supabase staging project; serves built assets via Nginx

version: "3.9"

services:

  client:
    build:
      context: ./client
      dockerfile: ../docker/client.Dockerfile
      target: production                   # Build SPA, serve via Nginx
    container_name: feasibility_client_staging
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl/staging:/etc/ssl/certs:ro    # Self-signed or Let's Encrypt staging cert
    environment:
      - NODE_ENV=staging
      - VITE_SUPABASE_URL=${STAGING_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${STAGING_SUPABASE_ANON_KEY}
      - VITE_API_BASE_URL=https://staging.yourdomain.com/api

  server:
    build:
      context: ./server
      dockerfile: ../docker/server.Dockerfile
      target: production                   # Compiled Node, no nodemon
    container_name: feasibility_server_staging
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=staging
      - PORT=3001
      - SUPABASE_URL=${STAGING_SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${STAGING_SUPABASE_SERVICE_ROLE_KEY}
      - CLIENT_URL=https://staging.yourdomain.com
    restart: unless-stopped

  # No supabase-db / supabase-kong / supabase-studio services
  # Staging uses remote Supabase project at ${STAGING_SUPABASE_URL}
```

**Staging Deployment:**
```bash
# On staging server (VPS / EC2 / droplet):
export $(cat .env.staging | xargs)
supabase db push --db-url $STAGING_SUPABASE_DB_URL   # Apply migrations to staging DB
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
```

---

### 14.4 `docker-compose.prod.yml` — Production Overrides

```yaml
# docker-compose.prod.yml
# Usage: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
# Identical pattern to staging but with production Supabase keys, real SSL, and restart policies

version: "3.9"

services:

  client:
    build:
      context: ./client
      dockerfile: ../docker/client.Dockerfile
      target: production
    container_name: feasibility_client_prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro    # Certbot-managed Let's Encrypt certs
    environment:
      - NODE_ENV=production
      - VITE_SUPABASE_URL=${PROD_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${PROD_SUPABASE_ANON_KEY}
      - VITE_API_BASE_URL=https://yourdomain.com/api
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  server:
    build:
      context: ./server
      dockerfile: ../docker/server.Dockerfile
      target: production
    container_name: feasibility_server_prod
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SUPABASE_URL=${PROD_SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${PROD_SUPABASE_SERVICE_ROLE_KEY}
      - CLIENT_URL=https://yourdomain.com
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
    deploy:
      resources:
        limits:
          memory: 1g                       # Puppeteer requires ~400MB; cap at 1GB
        reservations:
          memory: 256m

  # No local Supabase services in production
  # Production uses remote Supabase project at ${PROD_SUPABASE_URL}
```

**Production Deployment:**
```bash
# On production server:
export $(cat .env.prod | xargs)
supabase db push --db-url $PROD_SUPABASE_DB_URL   # Apply any new migrations
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker system prune -f                             # Clean up old images
```

---

### 14.5 Dockerfiles

**`docker/client.Dockerfile`** — Multi-stage (dev + production):
```dockerfile
# Stage 1: Development (Vite HMR)
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 3: Production (Nginx serving built SPA)
FROM nginx:1.25-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx/prod.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
```

**`docker/server.Dockerfile`** — Multi-stage (dev + production):
```dockerfile
# Stage 1: Development (nodemon live reload)
FROM node:20-alpine AS dev
WORKDIR /app
RUN apk add --no-cache \
    chromium \
    nss freetype harfbuzz ca-certificates ttf-freefont   # Puppeteer dependencies
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]                # nodemon src/app.js

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache \
    chromium \
    nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 3001
CMD ["node", "src/app.js"]
```

> **Why Chromium in Alpine?** Puppeteer requires a real browser binary. Alpine's `chromium` package provides a lightweight Chromium build. `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` prevents Puppeteer from downloading its own bundled Chromium (which would bloat the image). The `PUPPETEER_EXECUTABLE_PATH` env var points Puppeteer to the Alpine-installed binary instead.

**`docker/nginx/prod.conf`** — Nginx config for SPA + API reverse proxy:
```nginx
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;   # Force HTTPS
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Serve React SPA
    root /usr/share/nginx/html;
    index index.html;

    # All React Router routes → index.html (client-side routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy Express API
    location /api/ {
        proxy_pass         http://server:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;            # Allow time for PDF generation (Puppeteer)
    }
}
```

---

### 14.6 Environment Variables Reference

**`.env.example`** (committed to repo as documentation):
```bash
# ── Supabase Local (filled automatically by `supabase start`) ──────────────
SUPABASE_LOCAL_ANON_KEY=
SUPABASE_LOCAL_SERVICE_ROLE_KEY=
POSTGRES_PASSWORD=postgres

# ── Supabase Staging ───────────────────────────────────────────────────────
STAGING_SUPABASE_URL=https://<ref>.supabase.co
STAGING_SUPABASE_ANON_KEY=
STAGING_SUPABASE_SERVICE_ROLE_KEY=
STAGING_SUPABASE_DB_URL=postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres

# ── Supabase Production ────────────────────────────────────────────────────
PROD_SUPABASE_URL=https://<ref>.supabase.co
PROD_SUPABASE_ANON_KEY=
PROD_SUPABASE_SERVICE_ROLE_KEY=
PROD_SUPABASE_DB_URL=postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres
```

**Never commit `.env.local`, `.env.staging`, or `.env.prod`** — these contain secret keys. Use GitHub Actions secrets or a secrets manager (AWS SSM / Doppler) to inject them at deploy time.

---

### 14.7 Environment Summary Table

| Variable | Local | Staging | Production |
|----------|-------|---------|-----------|
| `SUPABASE_URL` | `http://localhost:54321` | `https://<staging-ref>.supabase.co` | `https://<prod-ref>.supabase.co` |
| `NODE_ENV` | `development` | `staging` | `production` |
| `CLIENT_URL` | `http://localhost:5173` | `https://staging.yourdomain.com` | `https://yourdomain.com` |
| Supabase DB | Local Docker container | Supabase cloud (staging project) | Supabase cloud (prod project) |
| Nginx | Not used (Vite serves) | Nginx (prod.conf) | Nginx (prod.conf) |
| SSL | Not used | Self-signed / staging cert | Let's Encrypt |
| Puppeteer | System Chromium (Alpine) | System Chromium (Alpine) | System Chromium (Alpine) |
| Hot reload | Yes (Vite HMR + nodemon) | No | No |
| Supabase Studio | `http://localhost:54323` | Not exposed | Not exposed |

---

## 15. Future Enhancements (Post-Launch)

### Priority 1 — User Login & Role-Based Access Control
Currently all users have full edit access with no authentication (internal trusted network). When the team grows or external stakeholders need controlled access, the following should be implemented:

- **Authentication:** Microsoft Azure AD SSO via Supabase OAuth provider (`azure`). Login page with "Sign in with Microsoft" button. On first login, backend creates a `user_roles` row with role `consultant` by default. An admin promotes users to the correct role via Settings → User Management.
- **User roles table:** `user_roles` — maps `auth.users.id` to `role ENUM (admin / project_manager / finance / senior_management / consultant)`
- **Role permissions:**

| Action | admin | project_manager | finance | senior_management | consultant |
|--------|-------|----------------|---------|------------------|------------|
| Create / delete project | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit phases & inputs | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create / edit scenarios | ✅ | ✅ | ✅ | ❌ | ❌ |
| Promote scenario to Base Case | ✅ | ✅ | ❌ | ❌ | ❌ |
| View study editor (read-only) | ✅ | ✅ | ✅ | ❌ | ✅ |
| View dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export Excel / PDF | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage app settings (logo, hurdle rate) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Manage user roles | ✅ | ❌ | ❌ | ❌ | ❌ |

- **RLS policies:** Update Supabase Row Level Security policies on all tables to read `user_roles` instead of current permissive setting
- **Route guards:** Hide edit controls in Study Editor and Scenario Manager for Senior Management and Consultant roles
- **Implementation effort:** ~1 week. Migrations: add `user_roles` table, update RLS policies. Frontend: add `Login.jsx`, `useAuth` hook, role-aware component rendering

### Priority 2 — Audit Log
Track who changed what and when, with full scenario and input history. Useful for compliance and board presentation traceability.

### Priority 3 — Version Snapshots
Manual "Save Version" at any time to capture a complete named snapshot of a project (all phases, inputs, results). Supports compare-to-current diff view and restore. Useful for preserving board-approved states.

### Priority 4 — Notifications
Alert when NDP margin on any phase drops below the hurdle rate after a recalculation. In-app toast + optional email digest.

### Priority 5 — Monte Carlo Simulation
Statistical scenario modelling with probability distributions on key variables (selling price PSF, construction cost PSF) to produce P10/P50/P90 outcome ranges.

### Priority 6 — Mobile App
React Native companion for on-site access, scenario review, and KPI monitoring.

---

*Plan prepared for Wai Property Feasibility Study. Based on full analysis of `Feasibility_Study_Template.xlsx` (193 rows × 56 columns, 18 phases, 20+ financial line items) and stakeholder requirements. Includes Scenario Comparison & Sensitivity Analysis as a core module — not post-launch.*
