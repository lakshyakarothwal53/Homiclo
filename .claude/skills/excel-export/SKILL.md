---
name: excel-export
description: >-
  Wire a working "Export" button that downloads a table's rows as a real Excel
  (.xlsx) file in the HOMIQLO admin app, following the pattern proven on the
  inventory pages. Use this whenever the user wants to export, download, or "save
  as Excel/xlsx/spreadsheet/CSV" any list or table — "add an export button",
  "let me download this as Excel", "export the filtered results", "download the
  report" — or when an existing Export button does nothing. Reach for it before
  hand-rolling a download so the shared exportToExcel helper (SheetJS) is reused.
---

# Excel Export (HOMIQLO)

## What this is

The inventory list pages export to a true `.xlsx` via SheetJS. One shared helper does the
file generation; each page supplies its own columns. Canonical files:

- `src/lib/export.ts` — `exportToExcel(filename, headers, rows)` (SheetJS `xlsx`).
- Any inventory list page (e.g. `src/routes/_app/inventory/products.tsx`) — a `handleExport`
  wired to `FilterBar`'s `onExport` prop.
- `src/components/discounts/types.ts` `downloadCsv` — the CSV fallback (no dependency).

## The helper

`xlsx` (SheetJS) is installed (`bun add xlsx`). `src/lib/export.ts`:

```ts
import * as XLSX from "xlsx";
export function exportToExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);   // triggers the download; no extension in filename
}
```

The signature intentionally mirrors `downloadCsv(filename, headers, rows)` so the two are
interchangeable.

## Wiring a page

Add a `handleExport` that maps the page's data to `headers` + `rows`, and pass it to the
toolbar's `onExport`:

```tsx
function handleExport() {
  exportToExcel(
    "products",                                        // becomes products.xlsx
    ["SKU", "Product", "Category", "Price", "Stock", "Status"],
    rows.map((p) => [p.sku, p.name, p.category, p.price, p.stock, p.status]),
  );
}
// <FilterBar … onExport={handleExport} />
```

### The one rule that matters: export the filtered set, not the page
Map from the **filtered/sorted** array the page renders (what [price-filter] / search / branch
produced), **not** the current pagination window. The user expects the export to match the
query they're looking at, across all pages of results. (Pagination lives in the table shell;
the page still holds the full filtered list — use that.)

## Choosing xlsx vs CSV
- **`.xlsx`** (`exportToExcel`) — default; a real Excel workbook. Costs the `xlsx` dependency
  (already installed). **This is now the app-wide standard** — inventory, billing, POS,
  discounts, and reports all export via `exportToExcel`.
- **CSV** (`downloadCsv` from `@/components/discounts/types`) — zero dependency, opens in
  Excel, but it's CSV. The discounts module used to use it; it was migrated to `exportToExcel`.
  Only reach for `downloadCsv` if a module must avoid the dependency.

## Adapting to other modules (already done — copy these)
- **Billing/POS**: `src/components/billing/FilterBar` now has a wired `onExport` prop; pages
  (e.g. `src/routes/_app/billing/payments.tsx`, `src/routes/_app/pos/transactions.tsx`) define a
  `handleExport` mapping the **filtered** `rows` (from `useTableQuery`) to `exportToExcel`.
- **Discounts**: `PromoDiscountsPage.tsx`, `seasonal.tsx`, `usage-reports.tsx` export their
  `filtered` list; **filename has no extension** (`exportToExcel` appends `.xlsx`) — a former
  bug source when migrating from `downloadCsv`'s `"name.csv"` argument.
- **Reports**: `src/components/reports/ReportListPage.tsx` `handleExport` exports `filtered`.
- Reuse `exportToExcel` everywhere; don't reintroduce per-module download code.
- For a multi-sheet export, extend the helper to accept several `{ name, headers, rows }`
  and `book_append_sheet` each — keep the simple 3-arg form as the common case.

## Conventions
- Bun (`bun add` for deps); `@/` alias; ₹ currency stays as display strings in cells.
- Verify with `bunx prettier --write` + `bunx eslint` + `bunx tsc --noEmit`; a production
  `bun run build` confirms the `xlsx` chunk bundles.
- Don't edit `routeTree.gen.ts` or `src/components/ui/*`. Pairs with [table-pagination] and
  [price-filter].
