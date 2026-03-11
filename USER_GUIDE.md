# Wai Property Feasibility Study — User Guide

A step-by-step guide for property analysts using the feasibility tool day-to-day.

---

## Overview

The tool models **Gross Development Value (GDV), Net Development Value (NDV), construction costs, and Net Development Profit (NDP)** for property development projects. Each project can have multiple phases; each phase can have multiple unit types and cost scenarios.

**Navigation flow:**

```
Portfolio (/)
  └── Project Overview  (/project/:id)
        ├── Study Editor  — enter unit types & costs
        ├── Management Dashboard  — view charts & KPIs
        ├── Export Centre  — download Excel / CSV
        ├── Cost Allocation  — split infrastructure pools across phases
        └── Scenarios  — what-if analysis
              └── Sensitivity  — single and two-variable sweeps
```

---

## 1. Portfolio Dashboard (`/`)

The home screen lists all projects with status, GDV, NDP, and margin.

### Create a new project
1. Click **New Project**.
2. Enter a project name, select a status, and click **Create**.
3. You are taken straight to the project overview.

### Import a project from Excel
1. Click **Import**.
2. Click **Download Import Template** and fill it in (one row per phase on the *Phases* sheet, one row per unit type on the *Unit Types* sheet).
3. Drag and drop the completed file back into the upload zone.
4. Review the parsed summary — phases found, total unit types, total units.
5. Enter a project name, set a status, and click **Import Project**.

### Filter and sort
- Use the status tabs (**All / Active / On Hold / Completed / Archived**) to filter the list.
- Use the **Sort** dropdown to order by last updated, name, NDP, or margin %.

---

## 2. Study Editor (`/project/:id/study`)

The study editor is where you enter all inputs. Data auto-saves 2 seconds after you stop typing.

> **Mobile:** The editor is read-only on screens narrower than 768 px. Use a desktop or laptop to enter data.

### Phases

A project is divided into phases (e.g. Phase 1A, Phase 1B, Tower A). Each phase is calculated independently.

| Action | How |
|--------|-----|
| Add a phase | Click **+ Add Phase** at the top |
| Rename / set launch date / land area | Click the phase tab → edit the fields in the phase header |
| Reorder phases | Drag the phase tabs left or right |
| Duplicate a phase | Click the **⋮** menu on the phase tab → **Duplicate** |
| Delete a phase | Click the **⋮** menu → **Delete** (cannot be undone) |
| Activate / deactivate | Toggle the **Active** switch; inactive phases are excluded from totals and exports |

### GDV Tab — Unit Types

Each row is a unit type (e.g. "Type A 3-bed", "Retail Unit").

| Column | Notes |
|--------|-------|
| Name | Free text label |
| Category | Residential / Affordable / Commercial — determines which building PSF rate applies |
| Units | Number of units |
| Size (sqft) | Average net saleable area per unit |
| Selling PSF | Selling price per sqft |
| GDV | Computed automatically: Units × Size × Selling PSF |

Click **+ Add Row** to add a unit type. Click the **×** at the end of a row to remove it.

### Costs Tab — Assumptions

All cost inputs are on the Costs tab. They are organised into sections:

| Section | What it controls |
|---------|-----------------|
| **Sales Deductions** | Bumi discount %, Bumi quota %, Legal fees %, Early-bird rebate % |
| **Construction** | Building PSF by category (Residential / Affordable / Commercial), Preliminary %, Contingency %, SST % |
| **Land** | Land area (acres), Land cost PSF, Conversion premium %, Quit rent, Assessment rates |
| **Statutory & Authority** | Strata title, Planning fees, Dev charges, SYABAS, IWK/JPS, TNB, TM Fibre, Road & drainage, School/ISF contributions |
| **Professional Fees** | Consultancy %, Site admin % |
| **Marketing** | Marketing budget % of NDV |
| **Finance Charges** | Finance rate %, Land loan %, Construction loan %, Loan periods |
| **Overheads** | Project dept %, HQ %, Marketing dept %, Corporate % (all % of NDV) |

### Total Tab

Shows the aggregated GDV, NDV, GCC, GDC, NDP, and margin % across all active phases in a single summary table.

---

## 3. Cost Allocation (`/project/:id/cost-allocation`)

Infrastructure cost pools (roads, utilities, etc.) that are shared across phases are entered here and allocated as a percentage split.

1. Click **+ Add Pool** and enter a pool name and total cost (RM).
2. For each pool, enter the percentage allocated to each phase. **Percentages must sum to exactly 100%.**
3. Click **Save**. The allocated amounts feed into each phase's GCC.

---

## 4. Management Dashboard (`/project/:id/dashboard`)

Read-only view of charts and KPIs for the active project.

| Panel | What it shows |
|-------|---------------|
| KPI row | Total GDV, NDV, GCC, NDP, Margin % vs hurdle rate |
| GDV vs NDV vs NDP | Grouped bar chart per phase |
| Cost breakdown | Stacked bar: land / construction / professional / finance / overheads |
| Margin gauge | Speedometer showing blended margin vs hurdle rate |
| Unit mix | Pie chart of unit count by category |
| Construction PSF trend | Line chart across phases |

**Print / save as PDF:** Add `?print=true` to the dashboard URL to get a print-ready layout, then use your browser's **Print → Save as PDF**.

---

## 5. Scenarios (`/project/:id/phase/:phaseId/scenarios`)

Scenarios let you model "what if" variations for a single phase without changing the base inputs.

### Create a scenario
1. Open a phase and click **Manage Scenarios**.
2. Click **New Scenario**, give it a name (e.g. "Optimistic — higher PSF").
3. Click **Edit** on the scenario card and change any cost assumption overrides.
4. The scenario recalculates instantly. NDP and margin are shown on the card.

### Compare scenarios
The comparison table at the bottom shows GDV, NDV, GCC, NDP, and margin side-by-side for all scenarios in the phase.

### Set a base case
Click **Set as Base** on any scenario to promote it to the baseline (shown with a blue badge). The base case feeds into the Management Dashboard and Export.

### Clone a scenario
Click **Clone** to copy all overrides to a new scenario — useful for incremental what-if analysis.

---

## 6. Sensitivity Analysis (`/project/:id/phase/:phaseId/sensitivity`)

### Single-variable sweep
1. Select a **variable** (e.g. Selling PSF, Preliminary %, Marketing %).
2. Set **min**, **max**, and **step** values.
3. Click **Run**. A line chart shows NDP and margin across the range.
4. The tornado chart shows which variables have the largest impact on margin.

### Two-variable heat map
1. Select a **row variable** and a **column variable** with their ranges.
2. Click **Run**. A colour-coded matrix shows the resulting margin % for every combination.
3. Click **Export PNG** to save the heat map as an image.

---

## 7. Export Centre (`/project/:id/export`)

| Export | Contents |
|--------|----------|
| **Excel (.xlsx)** | One sheet with all active phases: GDV, NDV, GCC, NDP, margin, and per-unit-type breakdown |
| **CSV (.csv)** | Flat summary: one row per phase with key financial totals |

Click the download button; the file saves to your browser's Downloads folder.

---

## 8. Settings (`/settings`)

| Setting | Notes |
|---------|-------|
| Company Name | Appears in the Excel export header |
| Logo | URL to a PNG/JPEG image; appears in the Excel export header |
| Hurdle Rate % | Target margin; colour-coded indicators across all pages turn red below this threshold |

Click **Save** after making changes.

---

## Key Formulas (reference)

```
GDV    = Σ (Units × Size sqft × Selling PSF)

NDV    = GDV − Bumi deduction − Legal fees − Early-bird rebate

GCC    = Building work + Infrastructure pools + Preliminary % + Contingency % + SST (commercial)

GDC    = GCC + Land + Statutory + Authority + Professional fees
         + Site admin + Marketing + Finance charges + Land interest + Construction interest

NDP    = NDV − GDC − Overheads

Margin = NDP ÷ NDV × 100%
```

Hurdle rate default: **15%** — change in Settings.

---

## Tips

- **Auto-save indicator** in the top bar shows *Saving…* → *Saved* so you know when data has been written.
- Clicking a project's name on the Portfolio page goes to the **Project Overview**, not the Study Editor — use the **Study** tab to edit inputs.
- The **Inactive** toggle on a phase hides it from the dashboard and all exports without deleting its data.
- If margin is red, hover over the KPI card to see the raw NDP and the hurdle rate gap.
- Use **Clone Project** (from the project overview ⋮ menu) to duplicate an entire project including all phases and costs — useful for testing alternative land prices.

---

*Wai Property Feasibility Study · Internal use only · March 2026*
