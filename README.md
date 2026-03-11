# Wai Property Feasibility Study

Internal property development feasibility analysis tool. Replaces Excel-based workflows with a structured web application for modelling GDV, costs, NDP, and profit margin across multiple phases and scenarios.

**Stack:** React 18 + Vite · Node.js/Express · Supabase (PostgreSQL)
**Access:** No authentication — internal trusted network only

---

## Quick Start (Development)

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | LTS recommended |
| npm | 9+ | Bundled with Node |
| Docker Desktop | Latest | Required for local Supabase |
| Supabase CLI | Latest | `brew install supabase/tap/supabase` |

### 1. Clone and install

```bash
git clone <repo-url>
cd Project-feasibility-study

cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example server/.env
# Edit server/.env — fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

> **Local Supabase:** defaults in `.env.example` work with `supabase start`.
> **Cloud Supabase:** replace with your project URL + service role key from the Supabase dashboard.

### 3. Start local Supabase (requires Docker Desktop)

```bash
supabase start
# Outputs API URL, anon key, service role key — copy into server/.env
```

Apply migrations and seed:

```bash
supabase db push
supabase db seed
```

### 4. Start the servers

**Terminal 1 — Backend:**
```bash
cd server && npm run dev
# Listening on :3001
```

**Terminal 2 — Frontend:**
```bash
cd client && npm run dev
# Available at http://localhost:5173
```

---

## Docker Setup

### Local dev (hot reload)
```bash
docker compose up --build
```

Services started:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Supabase Studio: http://localhost:54323

### Production
```bash
cp .env.example .env.prod
# Fill in production SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLIENT_URL

docker compose -f docker-compose.prod.yml up -d --build
```

---

## Environment Variables

See `.env.example` for the full list.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express server port |
| `NODE_ENV` | `development` | Set to `production` on servers |
| `CLIENT_URL` | `http://localhost:5173` | CORS allowed origin |
| `SUPABASE_URL` | `http://127.0.0.1:54321` | Supabase API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | *(local default)* | Supabase service role key |
| `VITE_API_BASE_URL` | `http://localhost:3001/api` | Client-side API base (Vite prefix required) |

---

## Project Structure

```
Project-feasibility-study/
├── client/                  # React 18 + Vite frontend
│   └── src/
│       ├── api/             # Axios API wrappers (projects, phases, scenarios…)
│       ├── components/      # Shared UI (Button, Modal, Badge, ImportModal…)
│       ├── lib/             # Utilities: formatRM, cn, animations, useIsMobile
│       └── pages/           # Route-level pages
├── server/                  # Node.js + Express backend
│   └── src/
│       ├── lib/
│       │   ├── calculations.js   # Pure JS financial engine
│       │   └── supabase.js       # Supabase client
│       ├── routes/               # Express route handlers
│       └── services/             # excelExport, excelImport, csvExport
├── supabase/
│   ├── migrations/          # 9 SQL migration files (apply in order)
│   └── seed.sql             # Sample project + settings
├── .env.example             # Environment variable template
├── PROGRESS_PLAN.md         # Feature checklist + decisions log
└── README.md                # This file
```

---

## Key URLs

| URL | Page |
|-----|------|
| `/` | Portfolio dashboard |
| `/project/:id` | Project overview |
| `/project/:id/study` | Study editor (phases, unit types, costs) |
| `/project/:id/dashboard` | Management dashboard (charts + KPIs) |
| `/project/:id/export` | Export centre (Excel / CSV) |
| `/project/:id/cost-allocation` | Infrastructure cost allocation matrix |
| `/project/:id/phase/:phaseId/scenarios` | Scenario manager |
| `/project/:id/phase/:phaseId/sensitivity` | Sensitivity analysis |
| `/settings` | Company name, logo, hurdle rate |

---

## Database

### Migrations

All schema lives in `supabase/migrations/`. Applied automatically by `supabase db push`.

| File | Description |
|------|-------------|
| `0001_create_projects.sql` | Projects table with status ENUM |
| `0002_create_phases.sql` | Phases with sort_order, is_active |
| `0003_create_unit_types.sql` | Unit types per phase |
| `0004_create_cost_assumptions.sql` | All PSF / % / lump sum cost fields |
| `0005_create_scenarios.sql` | Scenarios with override fields |
| `0006_create_construction_cost_pools.sql` | Infrastructure cost pools + allocations |
| `0007_create_app_settings.sql` | Singleton settings row |
| `0008_enable_rls.sql` | Permissive RLS (no auth in v1) |
| `0009_updated_at_triggers.sql` | Auto `updated_at` triggers |

### Seed data

`supabase/seed.sql` provides:
- `app_settings` singleton (company name, hurdle rate 15%, default logo)
- One sample project with 3 phases, unit types, and construction cost pools

### Reset the database

```bash
supabase db reset        # Drops all data, re-runs migrations + seed
```

---

## Calculation Engine

`server/src/lib/calculations.js` — pure JavaScript, no side effects.

```
calcPhase(unitTypes, costAssumptions, poolsTotal)
  → { gdv, ndv, gcc, ndp, profitMarginPct, totalUnits, constPsf, netSellingPsf, … }
```

Key formula chain:

```
GDV      = Σ (unit_count × avg_size_sqft × selling_psf)
NDV      = GDV − Bumi discount − Legal fees − Early bird
GCC      = Building work + Infrastructure pools + Preliminary + Contingency + SST
GDC      = GCC + Land + Statutory + Authority + Professional + Site admin + Marketing
           + Finance charges + Land interest + Construction interest
NDP      = NDV − GDC − Overheads
Margin % = NDP / NDV × 100
```

Hurdle rate default: **15%** (configurable in Settings).

---

## API Reference

All endpoints prefixed `/api/`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List all projects |
| POST | `/projects` | Create project |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| POST | `/projects/:id/clone` | Clone project (deep copy) |
| GET | `/projects/:id/phases` | List phases |
| POST | `/projects/:id/phases` | Create phase |
| PATCH | `/projects/:id/phases/reorder` | Reorder phases |
| GET | `/projects/:id/cost-allocation` | Get infrastructure pools |
| PUT | `/projects/:id/cost-allocation` | Save pools + allocations |
| GET | `/projects/:id/export/excel` | Download Excel workbook |
| GET | `/projects/:id/export/csv` | Download CSV |
| GET | `/projects/import/template` | Download blank import template |
| POST | `/projects/import/preview` | Parse uploaded xlsx (dry run) |
| POST | `/projects/import` | Create project from parsed data |
| GET | `/phases/:id/unit-types` | List unit types |
| PUT | `/phases/:id/unit-types` | Upsert unit types |
| GET | `/phases/:id/cost-assumptions` | Get cost assumptions |
| PATCH | `/phases/:id/cost-assumptions` | Update cost assumptions |
| POST | `/phases/:id/calculate` | Recalculate and cache phase results |
| GET | `/phases/:id/scenarios` | List scenarios |
| POST | `/phases/:id/scenarios` | Create scenario |
| PUT | `/scenarios/:id` | Update scenario |
| DELETE | `/scenarios/:id` | Delete scenario |
| POST | `/scenarios/:id/sensitivity` | Single-variable sensitivity analysis |
| POST | `/scenarios/:id/sensitivity/two-variable` | Two-variable heat map |
| GET | `/settings` | Get app settings |
| PATCH | `/settings` | Update app settings |
| GET | `/health` | Health check (`{ status: "ok" }`) |

---

## Common Operations

### Health check
```bash
curl http://localhost:3001/health
```

### View server logs (Docker)
```bash
docker compose logs -f server
```

### Restart a service
```bash
docker compose restart server
docker compose restart client
```

### Database backup (Supabase cloud)
```bash
supabase db dump -f backup_$(date +%Y%m%d).sql
```

### Add a new project phase
1. Open project → **Add Phase** → enter name
2. Navigate to **Study Editor** → fill in unit types (GDV tab) and costs (Costs tab)
3. Data auto-saves after 2 seconds of inactivity

### Export to Excel
Navigate to **Export Centre** (`/project/:id/export`) → **Download Excel**.

### Import from Excel
1. Portfolio page → **Import**
2. Download the template, fill it in, re-upload
3. Review parsed phases and unit types → set project name → **Import Project**

### Change the hurdle rate
**Settings** (gear icon) → **Hurdle Rate %** → Save.
All colour-coded margins across the app update on next load.

### Reset local database
```bash
supabase db reset
```

---

## Running Tests

```bash
cd server && npm test

# With coverage
npm test -- --coverage
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `ECONNREFUSED` on all API calls | Supabase not running | `supabase start` (requires Docker Desktop) |
| Server won't start | Missing `.env` or wrong keys | Copy `.env.example` → `server/.env`, fill in keys |
| Blank project cards / no data | DB not seeded | `supabase db push && supabase db seed` |
| Excel export is empty | No active phases | Activate at least one phase in the project |
| "Allocation must sum to 100%" | Pool allocations incomplete | Fix percentages in Cost Allocation page |
| Calculations show 0 / NaN | Missing unit types or PSF = 0 | Add unit types in Study Editor → GDV tab |
| PDF export button missing | Puppeteer requires Docker | Use Excel export or `?print=true` dashboard URL |
| Container won't start | Stale volumes | `docker compose down -v && docker compose up --build` |

---

## Known Limitations (v1)

- **No authentication** — all users have full edit access (internal trusted network)
- **No audit trail** — changes are not versioned (planned for v2)
- **Puppeteer PDF export** — requires Docker with Alpine Chromium; not configured locally
- **Mobile editing disabled** — Study Editor shows read-only banner on screens < 768px

---

## Post-Launch Roadmap

| Priority | Feature |
|----------|---------|
| P1 | Azure AD SSO + role-based access (`user_roles` table) |
| P2 | Audit log (who changed what, full input history) |
| P3 | Version snapshots + compare-to-current diff |
| P4 | NDP margin alert notifications |
| P5 | Monte Carlo simulation (P10/P50/P90 outcome ranges) |
| P6 | React Native mobile companion |

---

*Wai Property Feasibility Study · Internal use only · March 2026*
