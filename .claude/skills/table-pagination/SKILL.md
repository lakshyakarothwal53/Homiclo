---
name: table-pagination
description: >-
  Add real, working pagination to a data table/list in the HOMIQLO admin app —
  numbered page buttons, prev/next, and an accurate "Showing A–B of N entries"
  footer — following the pattern proven on the inventory tables. Use this
  whenever the user mentions pagination, paging, page numbers, "Showing X of Y",
  a table that should break into pages, "load more / next page", too many rows on
  one screen, or a static/non-working pager that needs to actually change pages —
  even if they just say "the table is too long" or "split this into pages". Reach
  for it before hand-rolling page state so the shared DataTableCard pattern is reused.
---

# Table Pagination (HOMIQLO)

## What this is

The inventory tables paginate **inside** the shared table shell
`src/components/inventory/DataTableCard.tsx`, so every page that renders through it
gets working pagination with **zero per-page code**. That is the canonical reference —
read it before changing anything.

## The pattern (why it works)

`DataTableCard` receives already-rendered rows as `children`. Instead of the page
slicing data, the shell slices the **rendered children**:

```tsx
const items = Children.toArray(children);      // React, not lodash
const total = items.length;
const pageCount = Math.max(1, Math.ceil(total / pageSize));
const [page, setPage] = useState(1);
useEffect(() => setPage((p) => Math.min(Math.max(1, p), pageCount)), [pageCount]);
const pageItems = items.slice((page - 1) * pageSize, page * pageSize);
```

Key points:
- **`pageSize` is an optional prop** (default `8`, matching the visual row count). A page
  can override it, but most don't need to.
- **The footer is derived, not hardcoded**: "Showing `{firstShown}`–`{lastShown}` of
  `{total}`", numbered buttons from `pageCount` (brand-highlight the active page),
  prev/next disabled at the ends.
- **Snap-back effect**: when a filter/search narrows the row set, `pageCount` shrinks;
  the `useEffect` clamps `page` back into range so you never get stuck on an empty page.
- The existing `isLoading` skeleton and `count === 0` empty-state branches are untouched.

Because the shell owns this, **new tables get pagination for free** just by rendering
their rows as `children` of `DataTableCard` and passing the true row `count`.

## Adding pagination to a new table

1. Render rows through `DataTableCard columns={…} count={rows.length}`. That's it —
   pagination already works.
2. Only touch `DataTableCard` if you need a different default `pageSize` (pass the prop)
   or a genuinely different pager UI.
3. If the module uses a **different** table shell, port the same three pieces into it:
   `Children.toArray`/data slice, the `page` state + clamp effect, and the derived footer.
   This is already done in two more places — reuse them as reference:
   - **billing/POS**: `src/components/billing/DataTable.tsx` paginates its `rows` internally
     (data slice, not `Children`) and renders `src/components/billing/EntriesFooter.tsx`, which
     is now a fully controlled pager (`page` / `pageCount` / `onPageChange` props). Every
     billing + POS page gets pagination just by rendering `<DataTable rows={…} />`.
   - **discounts**: bespoke inline `<table>`s (`src/components/discounts/PromoDiscountsPage.tsx`,
     `src/routes/_app/discounts/seasonal.tsx`, `usage-reports.tsx`) slice `filtered` with a
     local `page` + clamp effect and reuse that same billing `EntriesFooter`.
   `EntriesFooter` is the closest thing to a shared pager component — prefer reusing it over a
   new footer when you're outside `DataTableCard`.

## Client vs server pagination

The inventory tables paginate **client-side** — the dataset is small and already fully
fetched (search is server-side via Supabase `ilike`, but the returned set is modest). Keep
client-side pagination unless a table can return thousands of rows; only then switch to
Supabase `.range(from, to)` with a server `count`, and drive `DataTableCard` from a
page/pageCount the query returns rather than from `Children`.

## Conventions
- Bun; `@/` alias; verify changed files with `bunx prettier --write` + `bunx eslint`,
  then `bunx tsc --noEmit`. Don't edit `routeTree.gen.ts` or `src/components/ui/*`.
- Pairs naturally with [price-filter] (filter first, paginate the result) and
  [excel-export] (export the full filtered set, not just the current page).
