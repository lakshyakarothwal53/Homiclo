---
name: price-filter
description: >-
  Add a numeric sort + range-bucket filter (low→high / high→low, plus value
  ranges) to a HOMIQLO admin table, following the price filter proven on the
  inventory Products page. Use this whenever the user wants to sort or filter a
  list by a money/number column — price, amount, cost, total, salary, quantity —
  e.g. "sort by price", "cheapest first", "high to low", "only show products
  between ₹2k and ₹4k", "filter by amount range", "add price ranges" — even if
  they don't say "filter". Also use to replace a dead date filter with a value
  filter. Reach for it before hand-rolling sort/range state so the FilterBar
  opt-in props + bucket helper are reused.
---

# Price / Numeric Range Filter (HOMIQLO)

## What this is

The inventory **Products** page sorts and range-filters by price. The logic lives in a
tiny shared module and plugs into the shared toolbar via **opt-in props** (same style as
the branch select), so pages without a numeric column are unaffected. Canonical files:

- `src/components/inventory/price-filter.ts` — types + buckets + `priceInRange` helper.
- `src/components/inventory/FilterBar.tsx` — opt-in `priceSort` / `priceRange` controls.
- `src/routes/_app/inventory/products.tsx` — page wiring (client-side derive).

Read those before extending.

## The bucket + sort model

`price-filter.ts` defines:
- `PriceSort = "none" | "low" | "high"`.
- `PriceRange` = `"all"` + six **₹2k buckets**: `0-2000, 2000-4000, 4000-6000,
  6000-8000, 8000-10000, 10000+`.
- `PRICE_RANGES` — `{ value, label }[]` for the dropdown (`₹0 – ₹2k`, … `₹10k+`).
- `priceInRange(price, range)` — upper bound **exclusive**, `10000+` open-ended.

## The UI pattern (FilterBar, opt-in)

When `onPriceSortChange` is passed, `FilterBar` renders **in place of the date input** two
selects — Sort (Default / Low→High / High→Low) and Price range (from `PRICE_RANGES`). When
the props are absent, the date input stays, so the other pages are untouched. Never remove
that fallback.

## The read pattern (client-side, page-owned)

The page holds `priceSort` / `priceRange` state and derives the rendered rows from the
hook data — **filter by bucket, then sort** (stable; return `0` for "none"):

```tsx
const rows = data
  .filter((p) => priceInRange(p.price, priceRange))
  .sort((a, b) =>
    priceSort === "low" ? a.price - b.price : priceSort === "high" ? b.price - a.price : 0,
  );
```

Feed `rows` into `DataTableCard` (which then paginates — see [table-pagination]) and into
the [excel-export] `handleExport` so the export reflects the filter.

## Adapting to another numeric column / module

The buckets are price-shaped but the mechanism is generic. **This has already been done for
billing/POS — copy that, don't reinvent it:**

- **Reference implementation**: `src/components/billing/amount-filter.ts` is the exact sibling
  of `price-filter.ts` for money columns — `AmountSort` / `AmountRange`, invoice-scale
  `AMOUNT_RANGES` (`< ₹1k … ₹50k+`), and a **`parseAmount("₹4,616")` → number** helper for the
  common case where the value is a display string, not a number. `amountInRange` keeps the same
  "exclusive upper / open-ended top" convention. Use a distinct bucket set per domain rather
  than stretching one.
- **Different toolbar**: billing/POS use a separate `src/components/billing/FilterBar` which now
  has opt-in `amountSort` / `amountRange` props mirroring the inventory ones.
- **Shared filtering hook**: `src/components/billing/use-table-query.ts` (`useTableQuery(rows,
  searchKeys, amountKey?)`) bundles search + amount sort/range into one call and returns the
  filtered rows + control state — the lowest-boilerplate way to wire a page. Reuse it (or model
  a new numeric filter on it) instead of hand-rolling per page.
- Keep derivation **client-side** unless the list is huge; then sort/range via Supabase
  `.order()` / `.gte().lt()` instead.

## Conventions
- Bun; `@/` alias; ₹ currency; verify with `bunx prettier --write` + `bunx eslint` +
  `bunx tsc --noEmit`. Don't edit `routeTree.gen.ts` or `src/components/ui/*`.
- Keep the helper/types in their **own module** (not in the FilterBar component file) so
  fast-refresh stays happy and the skill's helper is importable anywhere.
