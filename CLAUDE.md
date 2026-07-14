# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HOMIQLO Super Admin Portal — an enterprise admin dashboard for managing attendance, employees, inventory, POS, billing, discounts, reports, notifications, and settings across multiple branches. Built with Lovable (lovable.dev); commits pushed here sync back to the Lovable editor. **Never force-push, amend, or rebase already-pushed commits.**

The app is now fully Supabase-backed — every module (attendance, billing, customers, dashboard, discounts, employees, inventory, notifications, POS, reports, settings) reads/writes through Supabase via TanStack Query hooks. There is no mock-data module left to migrate; `signIn`'s mock-user fallback (`src/mocks/users.json`) is the only remaining non-Supabase data source (see Auth section).

## Tech Stack

| Layer           | Tool                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Framework       | React 19 + TanStack Start (Vite SSR)                                                                       |
| Routing         | TanStack Router v1 (file-based, auto-generated `routeTree.gen.ts`)                                         |
| Data fetching   | TanStack Query v5 (`@tanstack/react-query`)                                                                |
| Styling         | Tailwind CSS v4 (no config file — uses CSS-first config)                                                   |
| UI components   | shadcn/ui (Radix UI primitives, in `src/components/ui/`)                                                   |
| Icons           | lucide-react                                                                                                |
| Forms           | react-hook-form v7 + zod v3                                                                                 |
| Toasts          | sonner                                                                                                       |
| Charts          | recharts                                                                                                     |
| Database        | Supabase (`@supabase/supabase-js`) — live across every module; client in `src/lib/supabase.ts`              |
| Package manager | Bun (`bun.lock` present; use `bun`, not `npm`/`pnpm`). A `package-lock.json` also exists — see `claude.local.md` for the npm-on-Windows fallback used on this machine. |

## Commands

```bash
bun run dev        # start dev server (Vite)
bun run build      # production build
bun run build:dev  # development-mode build
bun run preview    # preview a production build
bun run lint       # ESLint
bun run format     # Prettier
bun test:db        # scripts/test-supabase.ts — sanity-checks the Supabase connection using .env
```

No test suite exists — verify features manually with `bun run dev`.

## Project Structure

```
src/
  components/
    auth/          # AuthProvider (session/role context)
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
  mocks/
    users.json     # fallback login users for signIn() when no matching Supabase employee exists
  hooks/           # one `use-<module>.ts` per module, all Supabase-backed via TanStack Query
    use-attendance.ts, use-billing.ts, use-customers.ts, use-dashboard.ts,
    use-discounts.ts, use-employees.ts, use-inventory.ts, use-notifications.ts,
    use-pos.ts, use-reports.ts, use-settings.ts
    use-mobile.tsx, use-pagination.ts  # non-data utility hooks
  lib/
    auth.ts        # signIn/getSession/signOut — cookie session + Supabase employee lookup
    roles.ts        # Role type, ROLE_ACCESS map, canAccessPath/canSeeSection, branch-scoping helpers
    supabase.ts     # Supabase client (reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
    nav.ts          # NAV array — sidebar navigation definition (source of truth for section labels)
    export-utils.ts / import-utils.ts  # CSV export/import (products, billing)
    inventory-utils.ts
    error-capture.ts / error-page.ts / lovable-error-reporting.ts  # Lovable error sync
    utils.ts        # cn() helper
  routes/          # TanStack Router file-based routes (directory-based) — see src/routes/README.md
    __root.tsx     # root layout (QueryClientProvider lives here)
    login.tsx      # login page
    _app.tsx       # AppShell layout + route guard (redirects unauthenticated/unauthorized requests)
    _app/
      index.tsx              # dashboard
      attendance.tsx          # layout
      attendance/             # index, absent, employee-checkin, history, late, live, logs, reports, settings
      billing.tsx             # layout
      billing/                # index, create-invoice, gateway, payments, refunds, reports, sales-bills, tally-sync, tax-invoices
      discounts.tsx            # layout
      discounts/               # index, campaigns, categories, flat, percentage, products, seasonal, usage-reports
      employees.tsx            # layout
      employees/               # index, activity, add, location, login-monitoring, profile, profile-detail, reports
      inventory.tsx            # layout
      inventory/               # index, alerts, categories, history, products, reports, stock-adjustment, stock-inward, stock-outward
      notifications.tsx        # layout
      notifications/           # index, attendance, low-stock, payment, system
      pos.tsx                  # layout
      pos/                     # index, barcode, qr, scanner, search, settings, transactions
      reports/                 # attendance, discount, employee, export, financial, inventory, sales (no layout)
      settings/                # attendance, company, notifications, payment-gateway, preferences, roles, tally (no layout)
  types/           # one file per module: attendance, billing, customer, discounts, employees, inventory, notifications, pos, reports, settings
  router.tsx       # createRouter + QueryClient setup
  styles.css       # global CSS + Tailwind v4 theme tokens

supabase/          # SQL run by hand in the Supabase dashboard SQL editor
  01_schema.sql … 12_branch_authority.sql, 99_clear_mock_data.sql  # cross-cutting/inventory migrations, in numeric order
  README.md        # run-order + setup steps (create project, set .env, run 01→N)
  attendance/ billing/ discounts/ employees/ notifications/ pos/ reports/ settings/
    01_schema.sql → 03_rls.sql, then optional numbered files (seed backfills, branch support,
    CRUD policies, computed columns). Each folder has its own README.md with the exact run order.
```

## Routing Conventions

- Routes are auto-generated — **never edit `routeTree.gen.ts` manually**.
- File-based routing (TanStack Start): no `src/pages/`, no `app/layout.tsx` — see `src/routes/README.md` for the full convention table (`$id` dynamic segments, `{-$category}` optional, `$` splat, `_layout` layout routes).
- All app pages live inside `src/routes/_app/` and render inside `AppShell` (sidebar + topbar), gated by the `beforeLoad` guard in `src/routes/_app.tsx`.
- Directory structure mirrors URL: `_app/pos/barcode.tsx` → `/pos/barcode`.
- Module layout file (`billing.tsx`) coexists with its child folder (`billing/`) at the same level.
- `reports/` and `settings/` have no layout file — their children report directly to the app shell.
- Navigation links live in `src/lib/nav.ts` — add new sections there. `NAV` section labels are the same strings used as keys in `ROLE_ACCESS` (`src/lib/roles.ts`), so a new top-level section needs an entry in both places.

## Auth & Roles (RBAC)

- Session is a signed-free cookie (`homiqlo_session`) holding a JSON `SessionUser` (id, email, name, role, branch), read isomorphically (`document.cookie` client-side, request header server-side) via `getSession()` in `src/lib/auth.ts`.
- `signIn(email, password)` hashes the password (SHA-256) and checks two sources in order: `src/mocks/users.json` (seed/admin accounts), then a live Supabase lookup against `employees` (`role` is hardcoded to `"employee"` for that path). Swap points for real Supabase Auth are marked `SUPABASE-SWAP` in `auth.ts`.
- `AuthProvider`/`useAuth()` (`src/components/auth/AuthProvider.tsx`) wraps the app and exposes `{ user, role, signIn, signOut }`, seeded from `getSession()` so SSR and hydrated client state agree.
- `src/lib/roles.ts` is the single source of truth for access:
  - `Role` = `super_admin | branch_admin | store_manager | inventory | cashier | employee | hr`.
  - `ROLE_ACCESS` maps each role to the `NAV` section labels it may see (`["*"]` = everything, only `super_admin`).
  - `canAccessPath(role, pathname)` backs the route guard in `src/routes/_app.tsx` (`beforeLoad`), so a forbidden section is unreachable by typing its URL, not just hidden from the sidebar.
  - `roleHome(role)` decides the post-login/redirect destination — employees land on `/attendance/employee-checkin`, everyone else on `/`.
- **Branch scoping**: every role except `super_admin` is branch-scoped (`isBranchScoped()`). Non-super-admin queries filter by `useAuth().user.branch`. Many Supabase tables ship in pairs — a global table and a `<table>_branches` variant (e.g. `billing_sales_bills` / `billing_sales_bills_branches`, `reports` / `reports_branches`) — hooks pick the branch-scoped table when a branch filter is active. Follow this pattern when adding queries to a new module. **Exception — product data is not branch-scoped**: `products` is the single source of truth and has no branch dimension, so `useProducts` / `usePosProducts` read `products` for every branch (their old `products_branches` / `pos_products_branches` twins are retired — see the Product data model note below).

## Component Patterns

**StatCard** — use for dashboard KPI tiles:

```tsx
<StatCard label="Today's Sales" value="₹12,400" delta="+8%" trend="up" icon={Receipt} />
```

**PlaceholderPage** — temporary stub for unimplemented pages. All current routes have real content; reach for this only when scaffolding a genuinely new page.

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

**ReportListPage** (reports) — uniform report listing across all report sub-pages. Pass `rows` from the module's `useReports(category, branch)` hook.

**AlertList** (notifications) — renders a list of `AlertItem` objects. Alert data (STOCK_ALERTS, ATTENDANCE_ALERTS, etc.) lives in `@/components/notifications/alerts.tsx`.

**CategoryDialog** (inventory) — shared add/edit form dialog for categories (modelled on discounts' `AddDiscountDialog`). Works controlled (pass `open`/`onOpenChange`, e.g. wired to `FilterBar.onPrimary`) or self-managed via a `trigger` element. Pair with the `useCreateCategory` / `useUpdateCategory` / `useDeleteCategory` hooks; delete uses shadcn `alert-dialog` for confirmation. Reference for adding CRUD to other module tables.

## Data Layer (TanStack Query + Supabase)

- `QueryClient` is created in `router.tsx` and provided in `__root.tsx`.
- Every module has exactly one hooks file: `src/hooks/use-<module>.ts`. All of them query Supabase directly — there is no more inline static data or JSON-fixture module to migrate.
- Pattern: `useQuery({ queryKey: ['resource', ...params], queryFn })` for reads, `useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries(['resource']) })` for writes.
- Supabase columns are snake_case; hooks alias them back to the camelCase shape defined in `src/types/<module>.ts` (e.g. `select("...", "joinDate:join_date", ...)`).
- Branch-aware hooks accept an optional `branch` param and switch between the global table and its `_branches` counterpart — see the Branch scoping note above. A `like(value)` helper (`%value%`) is duplicated per hook file for `ilike` search filters.
- There are **no mock fallbacks left anywhere** — dashboard widgets, notification alerts, and attendance overview all compute from live tables and render loading/empty states instead of canned rows. Notifications are *derived* per category from module tables (products for low-stock, late_arrivals/absent_records/employee_checkins, billing_payments/refunds, billing_tally_log/discount_promos) in `use-notifications.ts`, not read from the seeded `notifications` table.
- Cross-module report/export tooling lives in `src/lib/`: `pdf-utils.ts` (jsPDF table PDFs + CSV download), `report-data.ts` (live dataset per report category + date parsing/filter helpers), `barcode-utils.ts` (JsBarcode CODE128 print sheets), `tally.ts` (Tally XML voucher push over the HTTP gateway, config in `app_settings` key `tally`).
- Settings pages (Company / Tally / Preferences / Notification rules) persist JSONB blobs to the `app_settings` key-value table; roles/report "Add New" writes need the policies from `supabase/13_completion_pack.sql`.

### Product data model (canonical — read product facts only from `products`)

`products` (PK `sku`) is the **single source of truth** for every product fact (name, price, stock, min level, status, barcode). Never read product data from a second table or re-store name/price/stock elsewhere — link to it by `sku` instead. Full write-up + diagrams in `model.md` and `product-data-model.md` (repo root).

- **Low-stock alerts are derived, not stored.** Use `fetchLowStockAlerts()` / `deriveLowStockStatus()` in `src/lib/inventory-utils.ts` (products where `stock < min_stock`; `Critical` when `stock ≤ floor(min_stock/2)`, else `Low`). It backs `useLowStockAlerts`, the dashboard alert widgets, `use-notifications` `stockAlerts()`, and `report-data.ts` `fetchLowStockSummary()`. The Inventory → Alerts page is **read-only** (no create/edit/delete) — alerts appear/clear automatically.
- **Retired-but-not-yet-dropped tables** (still in Supabase, no longer read by the app): `pos_products`, `pos_products_branches`, `products_branches`, `low_stock_alerts`, `low_stock_alerts_branches`, `discounts_active`. `supabase/15_redundancy_cleanup.sql` Part 1 (additive `product_sku` FKs) is safe to run now; **Part 2 (the DROPs) runs later, only after this refactor is verified in production.** Don't reintroduce reads of these tables.

## Supabase Integration

Supabase is fully live: `@supabase/supabase-js` is a dependency, the client lives in `src/lib/supabase.ts`, credentials (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) are in `.env`. SQL lives under `supabase/`:

- Root-level numbered files (`01_schema.sql` … `12_branch_authority.sql`, `99_clear_mock_data.sql`) cover the original inventory schema plus cross-cutting migrations (branch infra, billing/discounts branch support, computed triggers). Run in numeric order — see `supabase/README.md`.
- Each module has its own folder (`attendance/`, `billing/`, `discounts/`, `employees/`, `notifications/`, `pos/`, `reports/`, `settings/`) with `01_schema.sql` → `03_rls.sql` as the baseline, then optional numbered files for seeds, branch support, extra CRUD policies, or computed columns. Each folder's `README.md` documents its exact run order — check it before adding a new migration.
- RLS is enabled on every table. Baseline policies are demo-grade (`using/with check (true)` for `anon` + `authenticated`); write policies are added per-module as features need them (see `04_categories_crud.sql`, `discounts/04_crud.sql`). Scope these to authenticated admins before production.
- When adding a new table/column: add the SQL file to the right module folder (next available number), add/extend a hook in `src/hooks/use-<module>.ts`, and keep DB snake_case aliased to camelCase in `src/types/`.

## Modules & Status

All modules are implemented and Supabase-backed:

| Module                      | Notes                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Dashboard**                | Area chart, attendance bar chart, inventory pie, recent transactions, stock alerts, employee logins       |
| **Attendance (9 pages)**     | Includes geofenced employee check-in (`supabase/attendance/04-06_employee_geofence*`)                     |
| **Employees (8 pages)**      | Includes login monitoring, activity/location tracking, personal profile-detail page                       |
| **Inventory (9 pages)**      | Full CRUD (products, categories, stock in/out/adjustment); categories CRUD is the reference implementation |
| **POS (7 pages)**            | Cart/checkout, barcode + QR scanners, transactions, branch-aware product search                            |
| **Billing (9 pages)**        | Revenue dashboard, sales bills, payments, gateway, refunds, tax invoices, tally sync, reports              |
| **Discounts (8 pages)**      | Flat, percentage, category, product, campaign, seasonal, usage reports                                    |
| **Reports (7 pages)**        | Sales, attendance, employee, inventory, discount, financial, export — all via `ReportListPage`             |
| **Notifications (5 pages)**  | Tabbed alerts dashboard, low-stock, attendance, payment, system sub-pages                                  |
| **Settings (7 pages)**       | Company, roles & permissions, payment gateway, tally, attendance, notifications, preferences               |

## Key Rules

- Use **Bun**, not npm or pnpm (see `claude.local.md` for the npm exception on this Windows dev machine).
- Do **not** add comments unless the WHY is non-obvious.
- Do **not** create `*.md` docs unless asked.
- Do **not** force-push or amend published commits (Lovable constraint).
- Import paths use `@/` alias (maps to `src/`).
- No test files exist — verify features manually with `bun run dev`.
- Tailwind v4: utility classes work as normal; theme tokens are CSS custom properties in `styles.css`.
- Currency is Indian Rupees (₹).
- Brand colour is `--brand` (`#FE0000` red). Use `bg-brand text-brand-foreground` for primary CTAs.
- New top-level nav sections need entries in both `src/lib/nav.ts` (`NAV`) and `src/lib/roles.ts` (`ROLE_ACCESS`) — a section invisible to `ROLE_ACCESS` is unreachable even for `super_admin` if its label doesn't match.
