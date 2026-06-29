# Connecting Supabase to the Inventory module

This walkthrough takes the inventory pages from mock JSON to a live Supabase
backend. The app code is already wired — you only need to create the project,
fill in two env vars, and run three SQL files.

## What's already done in the repo

- `@supabase/supabase-js` is installed.
- `src/lib/supabase.ts` exports a `supabase` client built from env vars (with
  placeholder fallbacks so the app boots even while `.env` is empty).
- `src/hooks/use-inventory.ts` reads from Supabase (no component changes needed).
- `.env` exists with **empty** values; `.env` is gitignored, `.env.example` is the
  committed template.
- SQL lives in [`supabase/`](supabase/): `01_schema.sql`, `02_seed.sql`, `03_rls.sql`.

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a name, a strong database password, and a region close to you.
3. Wait for provisioning to finish (~2 minutes).

## Step 2 — Copy your keys into `.env`

1. In the project, open **Project Settings → API**.
2. Copy these two values into the repo-root `.env`:

   ```
   VITE_SUPABASE_URL=https://<your-ref>.supabase.co     # "Project URL"
   VITE_SUPABASE_ANON_KEY=<anon-public-key>             # "Project API keys → anon public"
   ```

   > The **anon public** key is safe for the browser — Row Level Security (Step 3)
   > is what actually protects your data. Never put the **service_role** key here.

## Step 3 — Create the tables and data

Open **SQL Editor → New query** and run these files **in order** (copy-paste each,
then Run):

1. **`supabase/01_schema.sql`** — creates the tables:
   `products`, `categories`, `stock_inward`, `stock_outward`, `stock_history`,
   `low_stock_alerts`, `inventory_reports`, `stock_adjustments`, `inventory_dashboard`.
2. **`supabase/02_seed.sql`** — inserts the demo rows (same data the mock UI showed).
3. **`supabase/03_rls.sql`** — enables Row Level Security with demo-grade read/write
   policies.

You can confirm under **Table Editor** that each table now has rows.

## Step 4 — Run the app

```bash
bun run dev
```

Restart it if it was already running, so Vite picks up the new env vars. Then visit:

- `/inventory` — dashboard stats + charts
- `/inventory/products` — product list + search
- `/inventory/stock-adjustment` — submit an adjustment; it updates `products.stock`
  and writes a `stock_history` row

## Table → hook → type reference

| Supabase table | Hook (`src/hooks/use-inventory.ts`) | Type (`src/types/inventory.ts`) |
|---|---|---|
| `products` | `useProducts` | `Product` |
| `categories` | `useCategories` | `Category` |
| `stock_inward` | `useStockInward` | `StockInwardEntry` |
| `stock_outward` | `useStockOutward` | `StockOutwardEntry` |
| `stock_history` | `useStockHistory` | `StockHistoryEntry` |
| `low_stock_alerts` | `useLowStockAlerts` | `LowStockAlert` |
| `inventory_reports` | `useInventoryReports` | `InventoryReport` |
| `inventory_dashboard` | `useInventoryDashboard` | `InventoryDashboard` |
| `stock_adjustments` (+ `products`, `stock_history`) | `useSubmitStockAdjustment` | `StockAdjustmentInput` |

Columns are stored snake_case; the hooks alias them back to the camelCase the
types expect (e.g. `received_by → receivedBy`).

## Other modules

Modules beyond inventory are migrated with the same pattern using the
**`supabase-module-migration`** skill (`.claude/skills/`). Each lives in its own
`supabase/<module>/` folder; run its `01_schema.sql → 02_seed.sql → 03_rls.sql`
in order, just like inventory.

| Module | SQL folder | Table(s) | Hook | Type |
|---|---|---|---|---|
| Reports | `supabase/reports/` | `reports` (keyed by `category`) | `useReports(category)` (`src/hooks/use-reports.ts`) | `ReportRow` (`src/types/reports.ts`) |

## Notes & next steps

- **Display strings are stored as TEXT** for now (`cost: "₹35,000"`,
  `stockValue: "₹4.8L"`, `date: "12 Nov"`, `lastUpdated: "2 hours ago"`) to match
  the original mock exactly. Normalize them to `numeric` / `timestamptz` later if
  the UI computes its own formatting.
- **`inventory_dashboard`** is a single JSONB row for parity. Swap it for a
  computed `get_inventory_dashboard()` RPC / views once the data is fully live.
- **`low_stock_alerts`** is a standalone table; it can become a VIEW over
  `products` once a `min_level` column is added (see the comment in `01_schema.sql`).
- **RLS policies are demo-grade** — tighten them to authenticated admins before
  production.
- The old `src/data/inventory/*.json` fixtures are now unused and can be deleted.
