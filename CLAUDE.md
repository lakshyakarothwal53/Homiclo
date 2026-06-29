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
| Database | Supabase — not yet installed; mock JSON used in the interim |
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
    inventory/     # FilterBar, DataTableCard, InventoryStatusBadge
    billing/       # FilterBar, DataTable, StatusBadge, EntriesFooter
    discounts/     # PromoDiscountsPage, AddDiscountDialog, StatusBadge, DiscountToolbar, types.ts, sample-data.ts
    pos/           # ScannerView, products.ts
    reports/       # ReportListPage, data.ts
    notifications/ # alerts.tsx (AlertList + alert data)
  data/
    inventory/     # mock JSON fixtures (8 files: products, categories, stock-*, etc.)
  hooks/           # custom React hooks (add new ones here)
    use-inventory.ts  # TanStack Query hooks for inventory (SUPABASE-SWAP markers inside)
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

## Data Layer (TanStack Query)

- `QueryClient` is created in `router.tsx` and provided in `__root.tsx`.
- New hooks go in `src/hooks/use-<feature>.ts`.
- Follow the pattern: `useQuery({ queryKey: ['resource', params], queryFn })` and `useMutation({ mutationFn, onSuccess })`.
- Mock data for the inventory module lives in `src/data/inventory/*.json`. Each `queryFn` in `use-inventory.ts` is marked with a `// SUPABASE-SWAP:` comment showing the exact Supabase call to drop in when the backend is ready.
- Most other modules (billing, discounts, POS, reports, notifications) use inline static arrays in the route file — migrate to hooks + JSON/Supabase when the module goes live.

## Supabase Integration (future)

Supabase is **not yet installed**. The inventory module established the migration pattern to follow:

1. `bun add @supabase/supabase-js`
2. Create `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Create `src/lib/supabase.ts` (typed client)
4. Run SQL schema in Supabase dashboard
5. Add hooks in `src/hooks/use-<module>.ts` with `// SUPABASE-SWAP` comments until live
6. Replace inline static data in route files with hook calls

## Modules & Status

| Module | Status |
|---|---|
| **Dashboard** | **Implemented** — area chart, attendance bar chart, inventory pie, recent transactions, stock alerts, employee logins |
| Attendance (8 pages) | Placeholder |
| Employees (7 pages) | Placeholder |
| **Inventory (9 pages)** | **Implemented** — mock JSON + TanStack Query hooks; dashboard, products, categories, stock-inward, stock-outward, stock-history, low-stock-alerts, reports, stock-adjustment |
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
