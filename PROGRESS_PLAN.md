# Wai Property Feasibility Study — Progress Plan

**App:** Wai Property Feasibility Study
**Stack:** React 18 + Node.js/Express + Supabase (PostgreSQL)
**Total Duration:** 11 Weeks (6 Phases)
**Last Updated:** March 2026

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| ⏳ | Not Started |
| 🚫 | Blocked |

---

## Overall Progress

| Phase | Module | Status | Week |
|-------|--------|--------|------|
| 1 | Foundation & Infrastructure | 🔄 | 1–2 |
| 2 | Study Editor | ✅ | 3–4 |
| 3 | Scenario Comparison & Sensitivity | 🔄 | 5–6 |
| 4 | Management Dashboard | 🔄 | 7–8 |
| 5 | Export, Import & Polish | 🔄 | 9–10 |
| 6 | Testing & Deployment | ⏳ | 11 |

---

## Phase 1 — Foundation & Infrastructure
**Weeks 1–2 · Status: 🔄 In Progress**

### M1.1 — Project Scaffold
- [x] Initialise Vite + React 18 frontend
- [x] Initialise Node.js + Express backend
- [x] Set up monorepo structure (`/client`, `/server`, `/supabase`)
- [x] Configure ESLint + Prettier
- [x] Configure Tailwind CSS v3
- [x] Install shadcn/ui component library
- [x] Set up React Router v6 with base routes
- [x] Set up React Query (TanStack) v5
- [x] Set up Axios API client (`client/src/api/`)
- [x] Set up minimal `animations/index.js` (countUp + opacity fade only)

### M1.2 — Supabase & Database
- [x] `supabase init` — configure local Supabase stack
- [x] Migration `0001_create_projects.sql` — `projects` table with `status` ENUM
- [x] Migration `0002_create_phases.sql` — `phases` table with `sort_order`, `is_active`
- [x] Migration `0003_create_unit_types.sql`
- [x] Migration `0004_create_cost_assumptions.sql` — all PSF, lump sum, pct fields
- [x] Migration `0005_create_scenarios.sql`
- [x] Migration `0006_create_construction_cost_pools.sql`
- [x] Migration `0007_create_app_settings.sql`
- [x] Migration `0008_enable_rls.sql` — permissive RLS (no auth)
- [x] Migration `0009_updated_at_triggers.sql`
- [x] `seed.sql` — app_settings singleton, sample project with 3 phases, construction cost pools, unit types
- [x] Supabase CLI installed via Homebrew
- [ ] `supabase start` — 🚫 Blocked: Docker Desktop not installed
- [ ] Verify `supabase db push` applies all migrations cleanly on fresh instance — 🚫 Blocked: Docker Desktop not installed

### M1.3 — Docker Compose
- [x] `client.Dockerfile` — multi-stage: `dev` (Vite HMR) + `production` (Nginx)
- [x] `server.Dockerfile` — multi-stage: `dev` (nodemon + Alpine Chromium) + `production` (Node alpine)
- [x] `docker/nginx/local.conf` — SPA routing + `/api/` proxy
- [x] `docker/nginx/prod.conf` — HTTP→HTTPS redirect, SPA routing, `/api/` proxy, 120s read timeout
- [x] `docker-compose.yml` — local dev (client:5173, server:3001, supabase:54321–54323)
- [x] `docker-compose.staging.yml` — staging overrides (Nginx built SPA, remote Supabase)
- [x] `docker-compose.prod.yml` — production overrides (SSL, `restart: always`, 1GB memory limit)
- [x] `.env.example` — all required env vars documented
- [ ] Verify `docker compose up --build` starts all services locally — 🚫 Blocked: Docker Desktop not installed

### M1.4 — Calculation Engine
- [x] `server/src/lib/calculations.js` — pure JS function, zero hardcoded constants
- [x] **Revenue:** GDV = Σ(unit_count × avg_size × selling_psf)
- [x] **GDV deductions:** Bumi, Legal Fees, Early Bird → NDV
- [x] **Building Work:** Residential / Affordable / Commercial (unit NFA × PSF per type)
- [x] **Infrastructure:** allocated from pools (pool_total × allocation_pct / 100)
- [x] **GCC:** Building Work + pools + Preliminary + Contingency + SST
- [x] **Land Cost:** land_area_acres × land_cost_psf × 43,560
- [x] **Statutory fees:** Strata Title (per unit), Planning Fees (per unit)
- [x] **Authority contributions:** Dev Charges, SYABAS, IWK & JPS, TNB, TM Fibre, Road & Drainage, School, ISF
- [x] **Professional fees, Site Admin, Marketing**
- [x] **Land Interest + Construction Interest**
- [x] **Overheads:** Project Dept + HQ + Marketing Dept + Corporate
- [x] **NDP:** NDV − GDC − Overheads
- [x] **Profit Margin:** NDP / NDV × 100%
- [x] **Construction Cost PSF (phase):** GCC / Total GFA
- [x] **Project-level totals:** Σ GDV, Σ NDV, Σ GCC, Σ NDP, Overall Margin
- [x] Unit tests for all formulas against Excel reference values (Jest)
- [x] Allocation % validation: reject if Σ allocations for any pool ≠ 100%

### M1.5 — Portfolio Dashboard Page (`/`)
- [x] Project cards grid — name, status badge, GDV, NDP, margin %, phase count, last updated
- [x] Status filter tabs: All / Active / On Hold / Completed / Archived
- [x] KPI summary row: Total GDV, Total NDP, Blended Margin % across all active projects
- [x] NDP Margin Comparison chart (bar, one bar per project)
- [x] "New Project" button → create blank project modal
- [x] Sort options: Last Updated / Name A–Z / NDP high→low / Margin % high→low
- [x] Launch Date Timeline (Gantt-style across all projects)
- [x] "Import from Excel" button → file upload flow

### M1.6 — Project Overview Page (`/project/:id`)
- [x] Project header: name (editable inline), status badge dropdown, description, last updated
- [x] Phase cards — name, dev type, unit count, NDV, NDP, margin %
- [x] Drag-to-reorder phases (updates `sort_order`)
- [x] Add Phase button → modal (name input)
- [x] Duplicate phase (clone unit types + cost assumptions to new phase)
- [x] Delete phase → confirmation dialog
- [x] "Manage Cost Allocation" button → `/project/:id/cost-allocation`
- [x] "View Dashboard" CTA button
- [x] Edit phase name inline
- [x] Toggle phase active/inactive
- [x] Clone Project → creates "[Name] — Copy"

> **🏁 Milestone:** Core data model working, all formulas verified against Excel, portfolio + project overview pages navigable

---

## Phase 2 — Study Editor
**Weeks 3–4 · Status: ✅ Done**

### M2.1 — Phase Tab Navigation
- [x] Render dynamic phase list in sidebar in `sort_order`
- [x] TOTAL tab (always last, shows when ≥2 phases)
- [x] Active tab highlight

### M2.2 — Sub-section A: Phase Header
- [x] Phase name display
- [x] Development type display
- [x] Launch date picker
- [x] Land area (acres) input in header

### M2.3 — Sub-section B: Unit Types Grid
- [x] Editable grid: Unit Type Name / Category / Size sqft / Units / Selling PSF / GDV contribution
- [x] Category selector per row: Residential / Affordable / Commercial
- [x] Add row button
- [x] Remove row button
- [x] GDV running total (auto-computed)

### M2.4 — Sub-section C: GDV & Deductions
- [x] Bumiputera Discount — discount % + quota % inputs
- [x] Legal Fees — % input
- [x] Early Bird Discount — % input
- [x] All shown as inputs in Costs tab

### M2.5 — Sub-section D: Construction Cost Inputs
- [x] Building Work PSF inputs — Residential / Affordable / Commercial
- [x] Preliminary % input
- [x] Contingency % input
- [x] SST % input (commercial only)
- [x] Read-only infrastructure summary with "Edit allocation →" link

### M2.6 — Sub-section E: Other Development Costs
- [x] Land Cost PSF, Land Area, Conversion Premium, Quit Rent, Assessment
- [x] Strata Title, Planning Fees (per unit)
- [x] Dev Charges, SYABAS, IWK & JPS, TNB, TM Fibre, Road & Drainage, School, ISF
- [x] Professional Fees, Site Admin, Marketing Fees

### M2.7 — Sub-section F: Financial Charges
- [x] Finance Rate %, Land Loan %, Land Loan Years, Construction Loan %, Construction Loan Years

### M2.8 — Sub-section G: Overheads
- [x] Project Dept %, Head Office %, Marketing Dept %, Corporate %

### M2.9 — Sub-section H: Financial Summary Panel (read-only)
- [x] 6 KPI cards: NDV, NDP, Margin, Const PSF, Units, Net PSF
- [x] Waterfall table: GDV → deductions → NDV → costs → NDP
- [x] Margin colour-coded vs hurdle rate

### M2.10 — TOTAL Tab
- [x] Σ all active phases: GDV, NDV, GCC, NDP
- [x] Total Units
- [x] Overall Profit Margin = Total NDP / Total NDV
- [x] Hurdle rate colour coding on overall margin
- [x] Per-phase breakdown table

### M2.11 — Auto-save
- [x] Debounce all field changes (2s)
- [x] "Last saved [time]" indicator in toolbar
- [x] Spinner while save in flight
- [x] "Unsaved" indicator when dirty

### M2.12 — Real-time Recalculation
- [x] Every save triggers backend recalculation
- [x] Updated results returned in API response and displayed immediately

### M2.13 — Construction Cost Allocation Manager (`/project/:id/cost-allocation`)
- [x] Matrix table: cost items as rows, phases as columns
- [x] Each cell: % input + computed RM amount below
- [x] "Total Alloc'd" column with ✅ 100% / ⚠️ / ❌ validation
- [x] "Distribute Evenly" button per row
- [x] Add custom pool item
- [x] Delete pool item
- [x] "Distribute by Land Area" button per row
- [x] "Distribute by Unit Count" button per row
- [x] Sticky "Cost Item" + "Total" columns on horizontal scroll

> **🏁 Milestone:** Full parity with Excel — any data entry produces identical outputs; auto-save reliable

---

## Phase 3 — Scenario Comparison & Sensitivity Analysis
**Weeks 5–6 · Status: 🔄 In Progress**

### M3.1 — Scenario Data Model
- [x] `scenarios` table in Supabase
- [x] API: GET/POST `/api/phases/:id/scenarios`
- [x] API: GET/PUT/DELETE `/api/scenarios/:id`

### M3.2 — Scenario Manager Page
- [x] Scenario cards: name, is_base badge, NDP, margin %
- [x] "New Scenario" button — modal
- [x] Clone scenario
- [x] Delete scenario (cannot delete base case)
- [x] "Set as Base Case" button
- [x] Rename scenario inline
- [x] Colour tag picker per scenario card
- [x] Notes field per scenario

### M3.3 — Scenario Input Form
- [x] Override inputs panel: 6 primary variables
- [x] All remaining cost assumption overrides

### M3.4 — Live Results Panel
- [x] Scenario comparison table: NDP, Margin, GDV, GCC per scenario

### M3.5 — Scenario Comparison View
- [x] Separate `/scenarios/compare` page
- [x] Grouped bar chart (NDV / GCC / NDP per scenario)
- [x] Radar/spider chart (assumption profile)
- [x] Tornado chart (sensitivity ranking)

### M3.6 — Sensitivity Analysis (`/project/:id/phase/:phaseId/sensitivity`)
- [x] Variable selector: selling PSF / construction PSF / land cost PSF / professional fees / marketing fees / bumi discount / bumi quota
- [x] Range inputs: min / max / step
- [x] Single-variable output table: variable value → NDP, Margin %
- [x] Line chart
- [x] Two-variable selector (row variable + column variable)
- [x] Heat map table: cells colour-coded (green ≥ hurdle / amber near / red below)
- [x] API: `POST /api/scenarios/:id/sensitivity`
- [x] API: `POST /api/scenarios/:id/sensitivity/two-variable`
- [x] Break-even marker on line chart (where Margin % = 0)
- [x] Export heat map as PNG

> **🏁 Milestone:** Finance team can fully model Base / Optimistic / Conservative / Offer scenarios and present comparison to management

---

## Phase 4 — Management Dashboard
**Weeks 7–8 · Status: 🔄 In Progress**

### M4.1 — Per-Project KPI Cards (`/project/:id/dashboard`)
- [x] 6 KPI cards: GDV / NDV / Total GCC / Construction Cost PSF / NDP / Profit Margin %
- [x] Hurdle rate colour coding on Profit Margin KPI card

### M4.2 — Dashboard Charts
- [x] GDV vs NDV grouped bar chart (per phase)
- [x] NDP + Margin combo chart (bar NDP + line Margin %)
- [x] Phase Summary table
- [x] Cost waterfall chart (NDV → GCC → Other Costs → NDP, project total)
- [x] Construction PSF bar chart (per phase + project average)
- [x] Phase Timeline (Gantt — launch dates)
- [x] Hurdle rate dashed reference line on charts
- [x] countUp animation on KPI numbers

### M4.3 — Dashboard Responsiveness
- [x] Charts resize with ResponsiveContainer
- [x] KPI cards stack to 2×3 grid on tablet
- [x] `?print=true` CSS mode for PDF export

### M4.4 — Portfolio KPIs (at `/`)
- [x] Total GDV across all active projects
- [x] Total NDP across all active projects
- [x] Blended profit margin (Total NDP ÷ Total NDV)
- [x] Project count badges by status
- [x] NDP Margin Comparison chart
- [x] Launch Date Timeline (cross-project Gantt)

> **🏁 Milestone:** Dashboard ready for senior management presentation

---

## Phase 5 — Export, Import & Polish
**Weeks 9–10 · Status: 🔄 In Progress**

### M5.1 — Excel Export (exceljs)
- [x] `server/src/services/excelExport.js` — all phases side-by-side
- [x] API: `GET /api/projects/:id/export/excel`
- [x] Exact column widths / row heights matching original template
- [x] Fonts, fills, borders, section header colours per spec
- [x] All number formats (RM #,##0 / % / dates)
- [x] Company name in row 1 header (fetched from app_settings)
- [x] Page setup: A3 landscape, margins ~6mm
- [x] Logo image in row 1 header (requires binary image fetch)

### M5.2 — Dashboard PDF (Puppeteer)
- [x] `server/src/services/pdfExport.js` — puppeteer-core + system Chromium, graceful 501 when no Docker
- [x] API: `GET /api/projects/:id/export/pdf/dashboard` — returns PDF or 501 JSON
- Note: functional in Docker (PUPPETEER_EXECUTABLE_PATH set via ENV); 501 locally

### M5.3 — Feasibility Study PDF (Puppeteer)
- [x] API: `GET /api/projects/:id/export/pdf/feasibility` — returns PDF or 501 JSON
- Note: functional in Docker; 501 locally

### M5.4 — CSV Export
- [x] `server/src/services/csvExport.js` — all active phases + TOTAL row
- [x] BOM prefix for Excel compatibility
- [x] API: `GET /api/projects/:id/export/csv`

### M5.5 — Export Centre Page (`/project/:id/export`)
- [x] Download buttons: Excel / CSV
- [x] Loading spinner during generation
- [x] File download triggered on completion
- [x] Dashboard PDF button (shows error message if Docker not available)
- [x] Feasibility PDF button (shows error message if Docker not available)
- [x] Auto-filename with project name + date

### M5.6 — Excel Import
- [x] `server/src/services/excelImport.js` — flexible parser using ExcelJS
- [x] `GET /api/projects/import/template` — download template
- [x] `POST /api/projects/import/preview` — dry-run preview
- [x] `ImportModal` — upload → preview (phases/unit count summary) → project name/status → confirm
- [x] `POST /api/projects/import` — saves reviewed data to DB

### M5.7 — Settings Page
- [x] Company name input (updates `app_settings`)
- [x] Logo upload: drag-and-drop zone
- [x] Logo preview (160×48px)
- [x] Hurdle rate % input (default 15.0)
- [x] Changes reflected in navbar logo

### M5.8 — Hurdle Rate Indicators
- [x] Green / amber / red colour coding on NDP margin % throughout app
- [x] Amber band = within 3 percentage points below hurdle rate
- [x] Dashed reference line at hurdle rate on charts

### M5.9 — Polish & UX
- [x] RM formatting (formatRM, formatPct, formatPSF utilities)
- [x] Loading states on async operations (Spinner)
- [x] Empty states: blank project, no phases, no scenarios
- [x] Error handling: API errors surface as toast notifications
- [x] Company logo in navbar
- [x] RM millions shorthand on dashboard (RM 12.5M)
- [x] Project switcher in navbar
- [x] Responsive mobile read-only for editor
- [ ] Cross-browser testing — 🚫 Blocked: requires running Supabase instance

> **🏁 Milestone:** All three exports pixel-accurate and production-ready

---

## Phase 6 — Testing & Deployment
**Week 11 · Status: ⏳ Not Started**

### M6.1 — Unit Tests (Jest)
- [x] Calculation engine: all 20+ formulas vs Excel reference values
- [x] Scenario engine: verify scenario isolation
- [x] Sensitivity engine: single-variable and two-variable outputs
- [x] Allocation validation: Σ ≠ 100% correctly blocked
- [x] Edge cases: zero unit count, zero land area, zero PSF, single phase

### M6.2 — Integration Tests
- [ ] All CRUD endpoints: projects, phases, unit types, cost assumptions — 🚫 Blocked: requires running Supabase
- [ ] Cost allocation endpoints — 🚫 Blocked: requires running Supabase
- [ ] Scenario endpoints — 🚫 Blocked: requires running Supabase
- [ ] Sensitivity endpoints — 🚫 Blocked: requires running Supabase
- [ ] Export endpoints — 🚫 Blocked: requires running Supabase

### M6.3 — End-to-End Tests (Playwright)
- [ ] Create project → add phases → enter unit types → verify NDV calculation — 🚫 Blocked: requires running Supabase
- [ ] Enter all cost assumptions → verify GDC and NDP — 🚫 Blocked: requires running Supabase
- [ ] Create scenario → clone → modify → compare → set as base case — 🚫 Blocked: requires running Supabase
- [ ] Run sensitivity analysis: single-variable and two-variable heat map — 🚫 Blocked: requires running Supabase
- [ ] Export Excel → verify file downloads — 🚫 Blocked: requires running Supabase

### M6.4 — Docker & Infrastructure
- [ ] `docker-compose.yml` — local dev stack fully verified — 🚫 Blocked: Docker Desktop not installed
- [ ] `docker-compose.staging.yml` — staging VPS — 🚫 Blocked: Docker Desktop not installed
- [ ] `docker-compose.prod.yml` — production — 🚫 Blocked: Docker Desktop not installed
- [ ] Supabase production: enable automated backups — 🚫 Blocked: requires production Supabase project
- [ ] All migrations run cleanly on fresh Supabase production project — 🚫 Blocked: requires production Supabase project
- [ ] Puppeteer PDF generation verified inside Docker container — 🚫 Blocked: Docker Desktop not installed

### M6.5 — CI/CD (GitHub Actions)
- [x] Lint pipeline: ESLint on every push (`.github/workflows/ci.yml`)
- [x] Test pipeline: Jest unit tests on every PR (`.github/workflows/ci.yml`)
- [x] Build pipeline: Docker image build for client + server (`.github/workflows/ci.yml`)
- [x] Deploy to staging on merge to `main` (`.github/workflows/deploy.yml`)
- [ ] Playwright smoke test on staging — 🚫 Blocked: requires running Supabase instance
- [x] Promote to production on manual approval (GitHub Environment approval gate)

### M6.6 — Documentation
- [x] `README.md` Ops Runbook (IT-maintainable) — quick start, env vars, DB schema, API reference, troubleshooting table
- [x] Quick-start user guide (`USER_GUIDE.md`)

> **🏁 Milestone:** All tests passing; local / staging / production deployed and verified

---

## Post-Launch Roadmap

> These are **out of scope** for the initial 11-week build. Prioritised for future sprints.

| Priority | Feature | Notes |
|----------|---------|-------|
| P1 | **User Login & Role-Based Access** | Azure AD SSO, `user_roles` table, RLS policies, role-aware UI. ~1 week effort. |
| P2 | **Audit Log** | Track who changed what and when; full input + scenario history |
| P3 | **Version Snapshots** | Manual "Save Version", compare-to-current diff, restore |
| P4 | **Notifications** | Alert when NDP margin drops below hurdle rate |
| P5 | **Monte Carlo Simulation** | P10/P50/P90 outcome ranges on key variables |
| P6 | **Mobile App** | React Native companion for on-site access |

---

## Notes & Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Mar 2026 | No authentication in v1 | Internal trusted network; all users full edit access |
| Mar 2026 | Animations minimal — countUp + opacity fade only | Performance over polish |
| Mar 2026 | Excel export: single sheet, all phases side-by-side | Matches original template exactly |
| Mar 2026 | Excel import: flexible parser (not strict) | Accommodate minor format variations |
| Mar 2026 | Infrastructure costs (Earthworks/Landscaping/Clubhouse) moved to pool/allocation model | Enables cross-phase budgeting |
| Mar 2026 | Building Work PSF stays per-phase | Depends on each phase's own unit mix and NFA |
| Mar 2026 | NDV-first revenue model; GDV back-calculated | Matches original Excel logic — must not be changed |
| Mar 2026 | No audit trail in v1 | Deferred to P2 post-launch |
| Mar 2026 | Company: Wai Property Feasibility Study; WAI logo bundled as default | Confirmed by stakeholder |
| Mar 2026 | 10+ projects; portfolio summary dashboard at `/` | Replaces simple project list |
| Mar 2026 | Project status: Active / On Hold / Completed / Archived | Added to `projects` table |
| Mar 2026 | Docker Desktop not installed locally — Supabase can't run | Use cloud Supabase project for dev/test |

---

*Generated from `plan.md` — Wai Property Feasibility Study, March 2026*
