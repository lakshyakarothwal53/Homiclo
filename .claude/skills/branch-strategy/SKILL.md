---
name: branch-strategy
description: >-
  Manage multi-branch (store / outlet / location) data in the HOMIQLO admin app:
  the normalized `branches` + `<entity>_branches` junction model, adding or
  removing a branch, wiring a working branch dropdown into a module's FilterBar,
  per-branch metrics and branch-aware CRUD, the read/write RLS policies, and the
  two-vocabulary reconciliation problem (store branches vs user-account branches).
  Use this whenever the user mentions branches, outlets, stores, locations, the
  "All Branches" dropdown, per-branch numbers, filtering a page "by branch",
  making the branch selector actually work, or adding/renaming a branch — even if
  they don't say the word "branch" explicitly (e.g. "show this per store",
  "filter categories by location"). Reach for it before hand-rolling any
  branch-scoped table, query, or selector so the existing pattern is reused.
---

# Branch Strategy (HOMIQLO)

## What this is

HOMIQLO is a multi-store retail admin portal. A **branch** = one physical store /
outlet / location (e.g. Bandra, Andheri, Powai, Worli). Admins view data either
globally ("All Branches") or scoped to one branch via the FilterBar dropdown.

The branch model was first built for the **inventory Categories** page. This skill
captures that pattern so every future branch feature is consistent. The canonical,
working reference is:

- `supabase/05_branches.sql` — the `branches` + `category_branches` tables, seed, RLS.
- `src/hooks/use-inventory.ts` — `useCategories(search, branch)` and `useBranches()`.
- `src/components/inventory/FilterBar.tsx` — the opt-in controlled branch select.
- `src/routes/_app/inventory/categories.tsx` — page wiring.

Read those files before changing anything; this skill explains the *why* and how to
extend it.

## The data model: normalized junction (the chosen strategy)

This project deliberately uses a **normalized junction**, not a `branch` column on
each entity. Two reasons: the global entity table stays the untouched "All Branches"
view, and per-branch metrics live in their own table so adding branches never
touches the entity schema.

```
branches (name text primary key)

<entity>_branches (
  <entity>      text references <entity>(name) on delete cascade,
  branch        text references branches(name) on delete cascade,
  <metric cols…>,                       -- per-branch copies of the entity's metrics
  primary key (<entity>, branch)
)
```

For categories specifically, `categories` keeps `product_count / stock_value /
last_updated` as the global rollup, and `category_branches` holds the same three
columns per branch. `on delete cascade` means deleting a global entity (the normal
delete flow) cleans up its branch rows automatically.

**"All Branches" reads the global entity table; a specific branch reads the junction.**
That split is the heart of the design — keep it.

## The read pattern (hooks)

Branch is just another query parameter, folded into the TanStack Query key exactly
like `search`. No new context, no localStorage — the project's only app-wide context
is `AuthProvider`, and branch filtering must not add a second one.

```ts
export function use<Entity>(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["<module>", "<entity>", search ?? "", branch ?? "all"],
    queryFn: async () => {
      if (allBranches) {
        // global table — unchanged existing behavior
        let q = supabase.from("<entity>").select("<aliased cols>");
        if (search) q = q.ilike("<name col>", `%${search}%`);
        ...
      }
      // junction table — note the alias "name:<entity>" to keep the SAME return shape
      let q = supabase
        .from("<entity>_branches")
        .select("name:<entity>, <metric>:<metric_col>, …")
        .eq("branch", branch);
      if (search) q = q.ilike("<entity>", `%${search}%`);
      ...
    },
  });
}
```

The golden rule (shared with `supabase-module-migration`): **the branch query must
return the exact same TypeScript shape as the global query**, achieved with `select()`
aliases, so the page renderer is identical for both. The component never knows which
table it came from.

Always pair this with a tiny `useBranches()` that reads `select("name").order("name")`
from `branches` and returns `string[]` to populate the dropdown — so the list is
data-driven, never re-hardcoded.

## The UI pattern (FilterBar must stay backward-compatible)

`src/components/inventory/FilterBar.tsx` is shared by ~7 inventory pages. Only some
should actually filter by branch, so the branch select is **opt-in**:

- Props: `branches?: string[]`, `branch?: string`, `onBranchChange?: (v) => void`.
- When `onBranchChange` is provided → render a **controlled** `Select`
  (`value={branch ?? "all"}`, options = "All Branches" + `branches`).
- When omitted → keep the existing static dropdown untouched.

This is why the change is safe to make without breaking the other pages — never
remove the static fallback. On the page, branch is local `useState("all")` passed to
both the FilterBar and the hook: `use<Entity>(search, branch)`.

## RLS

Branch tables follow the repo's demo-grade convention: enable RLS, add **read**
policies for `anon, authenticated` (`using (true)`), drop-if-exists guarded so the
file re-runs. Writes stay on the global entity table unless you're doing branch-aware
CRUD (below). Always flag these as demo-grade — to be scoped to authenticated admins
before production. See `supabase/05_branches.sql` for the exact statements.

## Common tasks

### Add or remove a branch
Branches are data, not code. To add one: `insert into branches (name) values ('X')`
and add its `<entity>_branches` rows (or re-run the weighted seed). To remove one:
`delete from branches where name = 'X'` — the `on delete cascade` clears its junction
rows. The dropdown updates automatically via `useBranches()`; nothing in the UI is
hardcoded. (If you find a hardcoded branch list — e.g. the legacy
`["All Branches","Bandra","Andheri","Powai","Worli"]` in
`src/components/discounts/types.ts` and `src/components/reports/data.ts` — prefer
migrating it to read from the `branches` table.)

### Seed per-branch metrics from global totals
When you don't have real per-branch numbers, derive them by weighting the global
totals across branches (see the `cross join (values …) as b(branch, weight)` block in
`supabase/05_branches.sql`). Display-string metrics like `"₹4.8L"` are parsed with
`replace(replace(stock_value,'₹',''),'L','')::numeric * weight` and reformatted with
`to_char(…, 'FM990.0')`. These are approximate and won't sum exactly to the global
figure — say so; it's fine for demo data. If exact summing is required, give the last
branch the remainder instead of its own rounded weight.

### Extend branch filtering to another module
Repeat the four pieces for the new entity: junction table + seed + RLS (new
`supabase/NN_<entity>_branches.sql`), `use<Entity>(search, branch)` + `useBranches`
(reuse the existing `useBranches` if the module shares the same client), the
FilterBar opt-in props (already present on the inventory FilterBar; the billing
FilterBar is a separate component and would need the same treatment), and the page
`useState("all")` wiring.

### Make CRUD branch-aware (per-branch add/edit/delete)
By default Add/Edit/Delete act on the **global** entity regardless of the selected
branch. To make them edit the *selected branch's* row instead:
- Add INSERT/UPDATE/DELETE RLS policies on the junction table (mirror
  `supabase/04_categories_crud.sql`, but `to anon, authenticated`, on
  `category_branches`).
- Branch the mutations: when a real branch is selected, write to
  `<entity>_branches` keyed on `(<entity>, branch)`; when "All Branches", keep writing
  the global entity. Invalidate the same `["<module>"]` query key.
- Decide and state the semantics clearly: does "delete in branch view" remove the
  category from that one branch (delete the junction row) or globally (delete the
  entity)? Confirm with the user — these are genuinely different and easy to get wrong.

## The two-vocabulary reconciliation problem (know this before "default to my branch")

There are currently **two unrelated branch vocabularies** in the app:

| Source | Values |
|---|---|
| Store/outlet list (`branches` table, discounts, reports) | Bandra, Andheri, Powai, Worli |
| User accounts (`src/lib/auth.ts` mock users, `SessionUser.branch`) | Mumbai HQ, Warehouse, Worli |

Only `Worli` overlaps. So any feature that **defaults the dropdown to the logged-in
user's branch** (`useAuth().user.branch`) will, for a `Mumbai HQ` super admin, select
a branch with no store data → an empty table. Before building "default to my branch"
or any cross-link between users and stores, reconcile these into **one authoritative
`branches` table** that both the store data and user accounts reference. Surface this
to the user rather than silently picking one list.

## Conventions (inherited, do not deviate)

- **Bun**; verify changed files with `bunx prettier --write` then `bunx eslint <files>`
  (lint only your files — the repo has pre-existing lint debt). Typecheck with
  `bunx tsc --noEmit`.
- Import alias `@/` → `src/`. Currency ₹. Primary CTAs `bg-brand text-brand-foreground`.
- snake_case columns aliased to camelCase in hooks. Display strings stored as `text`.
- New branch SQL files are numbered, re-runnable (drop-if-exists / truncate / on
  conflict), and run **after** the module's base schema. Never edit `routeTree.gen.ts`
  or `src/components/ui/*`. Don't force-push/amend published commits (Lovable).

## Output to give the user
Summarize: the SQL file(s) and their run order, the hook changes, the page/FilterBar
wiring, lint/typecheck result, and any caveats (display-string approximation, global
vs per-branch CRUD semantics, the vocabulary mismatch if relevant).
