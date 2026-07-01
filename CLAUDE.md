# HOMIQLO Admin Hub — Claude Guide

## Project Overview

HOMIQLO Super Admin Portal — an enterprise admin dashboard for managing attendance, employees, inventory, POS, billing, discounts, reports, notifications, and settings. Built with Lovable (lovable.dev); commits pushed here sync back to the Lovable editor. **Never force-push, amend, or rebase already-pushed commits.**

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 19 + TanStack Start (Vite SSR) |
| Routing | TanStack Router v1 (file-based, auto-generated `routeTree.gen.ts`) |
| Data fetching | TanStack Query v5 (`@tanstack/react-query`) |
| Styling | Tailwind CSS v4 (no config file — uses CSS-first config) |
| UI components | shadcn/ui (Radix UI primitives, in `src/components/ui/`) |
| Icons | lucide-react |
| Forms | react-hook-form v7 + zod v3 |
| Toasts | sonner |
| Charts | recharts |
| Database | Supabase (`@supabase/supabase-js`) — installed and live; client in `src/lib/supabase.ts`, inventory reads from it. Some modules still use mock JSON pending migration. |
| Package manager | Bun (`bun.lock` present; use `bun` not `npm/pnpm`) |

## Commands

```bash
bun run dev        # start dev server (Vite)
bun run build      # production build
bun run lint       # ESLint
bun run format     # Prettier
```

## Project Structure

```
src/
  components/
    common/        # PageHeader, PlaceholderPage, StatCard
    layout/        # AppShell, Sidebar, Topbar
    ui/            # shadcn/ui primitives (never edit directly)
    inventory/     # FilterBar, DataTableCard, InventoryStatusBadge, CategoryDialog
    billing/       # FilterBar, DataTable, StatusBadge, EntriesFooter
    discounts/     # PromoDiscountsPage, AddDiscountDialog, StatusBadge, DiscountToolbar, types.ts, sample-data.ts
    pos/           # ScannerView, products.ts
    reports/       # ReportListPage, data.ts
    notifications/ # alerts.tsx (AlertList + alert data)
  data/
    inventory/     # legacy mock JSON fixtures (superseded by Supabase; kept for reference/seed parity)
  hooks/           # custom React hooks (add new ones here)
    use-inventory.ts  # TanStack Query hooks for inventory — read from Supabase + category CRUD mutations
  lib/             # utils, nav config, error helpers
    nav.ts         # NAV array — sidebar navigation definition
    utils.ts       # cn() helper
  routes/          # TanStack Router file-based routes (directory-based)
    __root.tsx     # root layout (QueryClientProvider lives here)
    login.tsx      # login page
    _app.tsx       # AppShell layout (auth guard, sidebar + topbar)
    _app/
      index.tsx              # dashboard
      attendance.tsx         # layout
      attendance/            # absent, history, late, live, logs, reports, settings
      billing.tsx            # layout
      billing/               # index, create-invoice, gateway, payments, refunds, reports, sales-bills, tally-sync, tax-invoices
      discounts.tsx          # layout
      discounts/             # index, campaigns, categories, flat, percentage, products, seasonal, usage-reports
      employees.tsx          # layout
      employees/             # activity, add, location, login-monitoring, profile, reports
      inventory.tsx          # layout
      inventory/             # index, alerts, categories, history, products, reports, stock-adjustment, stock-inward, stock-outward
      notifications.tsx      # layout
      notifications/         # index, attendance, low-stock, payment, system
      pos.tsx                # layout
      pos/                   # index, barcode, qr, scanner, search, settings, transactions
      reports/               # attendance, discount, employee, export, financial, inventory, sales (no layout)
      settings/              # attendance, company, notifications, payment-gateway, preferences, roles, tally (no layout)
  types/
    inventory.ts   # TypeScript domain types for inventory module
  router.tsx       # createRouter + QueryClient setup
  styles.css       # global CSS + Tailwind v4 theme tokens

supabase/          # SQL run by hand in the Supabase dashboard (numbered, in order)
  01_schema.sql … 04_categories_crud.sql  # inventory: schema, seed, RLS, category write policies
  README.md        # run-order notes
  billing/ discounts/ notifications/ pos/ reports/  # per-module SQL (01_schema → 03_rls, optional 04_*)
```

## Routing Conventions

- Routes are auto-generated — **never edit `routeTree.gen.ts` manually**.
- All app pages live inside `src/routes/_app/` and render inside `AppShell` (sidebar + topbar).
- Directory structure mirrors URL: `_app/pos/barcode.tsx` → `/pos/barcode`.
- Module layout file (`billing.tsx`) coexists with its child folder (`billing/`) at the same level.
- `reports/` and `settings/` have no layout file — their children report directly to the app shell.
- Navigation links live in `src/lib/nav.ts` — add new sections there.

## Component Patterns

**StatCard** — use for dashboard KPI tiles:
```tsx
<StatCard label="Today's Sales" value="₹12,400" delta="+8%" trend="up" icon={Receipt} />
```

**PlaceholderPage** — temporary stub for unimplemented pages. Replace with real content when implementing.

**PageHeader** — consistent page title + optional action button.

**shadcn/ui** — import from `@/components/ui/<name>`. Use `cn()` from `@/lib/utils` for conditional classes.

**DataTableCard** (inventory) / **DataTable** (billing) — reusable table shells with column definitions:
```tsx
// inventory variant (wraps shadcn Table)
<DataTableCard columns={COLUMNS} count={rows.length}>
  {rows.map(r => <TableRow>…</TableRow>)}
</DataTableCard>

// billing variant (generic column renderer)
<DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
```

**FilterBar** — search + export + primary-action toolbar. Two variants:
- `@/components/inventory/FilterBar` — `{ search, onSearchChange, primaryLabel, onPrimary, onExport }`
- `@/components/billing/FilterBar` — `{ searchPlaceholder, addLabel, onAdd }`

**EntriesFooter** (billing) — "Showing X of Y entries" footer row.

**StatusBadge** — colour-coded status pill. Two variants:
- `@/components/billing/StatusBadge` — handles Paid / Pending / Refunded etc.
- `@/components/discounts/StatusBadge` — handles Active / Inactive / Expired etc.

**ScannerView** (POS) — reusable camera-scan widget used by barcode and QR pages:
```tsx
<ScannerView icon={Barcode} label="Barcode" instruction="Point at a barcode" />
```

**PromoDiscountsPage** (discounts) — shared list page for flat / percentage / category / product / campaign / seasonal tabs. Accepts `initialRows`, `lockType`, `addLabel`.

**ReportListPage** (reports) — uniform report listing across all report sub-pages. Pass `rows` from `@/components/reports/data`.

**AlertList** (notifications) — renders a list of `AlertItem` objects. Alert data (STOCK_ALERTS, ATTENDANCE_ALERTS, etc.) lives in `@/components/notifications/alerts.tsx`.

**CategoryDialog** (inventory) — shared add/edit form dialog for categories (modelled on discounts' `AddDiscountDialog`). Works controlled (pass `open`/`onOpenChange`, e.g. wired to `FilterBar.onPrimary`) or self-managed via a `trigger` element. Pair with the `useCreateCategory` / `useUpdateCategory` / `useDeleteCategory` hooks; delete uses shadcn `alert-dialog` for confirmation. Reference for adding CRUD to other inventory tables.

## Data Layer (TanStack Query)

- `QueryClient` is created in `router.tsx` and provided in `__root.tsx`.
- New hooks go in `src/hooks/use-<feature>.ts`.
- Follow the pattern: `useQuery({ queryKey: ['resource', params], queryFn })` and `useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries(...) })`.
- The inventory module reads from Supabase directly in `use-inventory.ts` (snake_case columns aliased to camelCase). Category writes use `useCreateCategory` / `useUpdateCategory` / `useDeleteCategory`, all invalidating the `["inventory"]` query key on success. The old `src/data/inventory/*.json` fixtures are legacy and no longer the live source.
- Most other modules (billing, discounts, POS, reports, notifications) still use inline static arrays in the route file — migrate to Supabase hooks (see the Supabase Integration section) when the module goes live.

## Supabase Integration

Supabase is **installed and live**: `@supabase/supabase-js` is a dependency, the client lives
in `src/lib/supabase.ts`, and credentials (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) are
in `.env`. The **inventory** module reads (and writes, via mutations) through it. Other modules
still use mock/static data and migrate one at a time using the established pattern:

1. Add SQL to a per-module folder under `supabase/` — `01_schema.sql`, `02_seed.sql`,
   `03_rls.sql`, then optional `04_*.sql` for extra policies/computed columns. Run each in the
   Supabase dashboard SQL editor.
2. Add hooks in `src/hooks/use-<module>.ts`: `useQuery` for reads, `useMutation`
   (+ `queryClient.invalidateQueries`) for writes. DB columns are snake_case and aliased back
   to the camelCase shape in `src/types/`.
3. Replace inline static data in route files with the hook calls.

RLS is enabled on every table. Tables ship with a demo-grade read policy for `anon` +
`authenticated`; add per-verb write policies (`insert` / `update` / `delete`) when a module
needs writes (see `supabase/04_categories_crud.sql`). These are demo-grade (`using/with check
(true)`) and should be scoped to authenticated admins before production.

## Modules & Status

| Module | Status |
|---|---|
| **Dashboard** | **Implemented** — area chart, attendance bar chart, inventory pie, recent transactions, stock alerts, employee logins |
| Attendance (8 pages) | Placeholder |
| Employees (7 pages) | Placeholder |
| **Inventory (9 pages)** | **Implemented** — Supabase-backed via TanStack Query hooks; dashboard, products, categories, stock-inward, stock-outward, stock-history, low-stock-alerts, reports, stock-adjustment. **Categories has full CRUD** (add/edit/delete) persisted to Supabase. |
| **POS (6 pages)** | **Implemented** — cart/checkout UI, barcode scanner, QR scanner, transactions table, search, settings |
| **Billing (9 pages)** | **Implemented** — dashboard with revenue chart, sales bills, payments, gateway, refunds, tax invoices, tally sync, reports, create invoice |
| **Discounts (8 pages)** | **Implemented** — dashboard, flat, percentage, categories, products, campaigns, seasonal, usage-reports |
| **Reports (7 pages)** | **Implemented** — sales, attendance, employee, inventory, discount, financial, export (all via ReportListPage) |
| **Notifications (5 pages)** | **Implemented** — tabbed alerts dashboard, low-stock, attendance, payment, system sub-pages |
| **Settings (7 pages)** | **Partially implemented** — company (form), roles (table); payment-gateway, tally, attendance, preferences, notifications need work |

## Key Rules

- Use **Bun**, not npm or pnpm.
- Do **not** add comments unless the WHY is non-obvious.
- Do **not** create `*.md` docs unless asked.
- Do **not** force-push or amend published commits (Lovable constraint).
- Import paths use `@/` alias (maps to `src/`).
- No test files exist — verify features manually with `bun run dev`.
- Tailwind v4: utility classes work as normal; theme tokens are CSS custom properties in `styles.css`.
- Currency is Indian Rupees (₹).
- Brand colour is `--brand` (`#FE0000` red). Use `bg-brand text-brand-foreground` for primary CTAs.
