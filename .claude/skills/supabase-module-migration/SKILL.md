---
name: supabase-module-migration
description: >-
  Migrate a HOMIQLO admin module from mock data to a live Supabase backend,
  following the exact pattern already established for the inventory module.
  Use this whenever the user wants to "connect <module> to Supabase", "move
  <module> off mock data", "wire up the database for <module>", "create tables
  for <module>", or migrate any of the billing, discounts, notifications, pos,
  reports, employees, attendance, or settings modules — even if they don't say
  the word "Supabase". This skill produces the SQL (schema + seed + RLS) in a
  per-module folder, a TanStack Query hook file, and the component wiring, so
  reach for it any time mock/static arrays in this app need to become real
  database reads.
---

# Supabase Module Migration (HOMIQLO)

## What this does

The inventory module was migrated from mock data to Supabase. This skill repeats
that exact migration for any other module (billing, discounts, notifications,
pos, reports, employees, attendance, settings). The infrastructure is already in
place and is **shared** — do not recreate it:

- `src/lib/supabase.ts` — the client (import-safe with empty env).
- `.env` / `.env.example` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `supabase.md` (repo root) — the human walkthrough; update its reference table.

The full, working reference is the inventory implementation. Before doing a new
module, read **`references/inventory-pattern.md`** for the canonical code/SQL
templates, and look at the live files it points to (`src/hooks/use-inventory.ts`,
`src/types/inventory.ts`, `supabase/01_schema.sql`).

## The golden rule

**Components and types must not change behavior.** The whole point of the hook
seam is that route files keep calling a hook and rendering the same shape. So the
data a hook returns must match the TypeScript interface the components already
expect, field-for-field. Achieve this with Supabase `select()` column aliases
(`received_by:receivedBy`) rather than by editing components.

## Project conventions (do not deviate)

- **Bun**, not npm/pnpm. Verify with `bun run lint` and `bun run build`.
- Import alias `@/` maps to `src/`. Currency is ₹ (Indian Rupees).
- Hooks follow TanStack Query v5: `useQuery({ queryKey, queryFn })` and
  `useMutation({ mutationFn, onSuccess })`. Query keys are namespaced by module:
  `["<module>", "<resource>", ...params]`.
- Tables use **snake_case** columns; hooks alias them back to the camelCase the
  types use. Store display-formatted strings (`"₹4.8L"`, `"12 Nov"`,
  `"2 hours ago"`) as `text` to preserve exact visual parity — note them as
  interim/denormalized, don't try to compute them.
- RLS policies are **demo-grade** (anon + authenticated read; write only on the
  tables a mutation touches). Always flag them as needing tightening.

## Where the mock data lives (varies by module)

Unlike inventory (which used JSON fixtures in `src/data/inventory/`), other
modules keep mock data in one of two places — find it first:

1. **Shared component data file** — e.g. `src/components/discounts/sample-data.ts`,
   `src/components/reports/data.ts`, `src/components/pos/products.ts`,
   `src/components/notifications/alerts.tsx`. These export typed arrays/builders.
2. **Inline static arrays inside the route file** — e.g. several
   `src/routes/_app/billing/*.tsx` declare a `const ROWS = [...]` at module scope.

Grep for the module to locate every dataset:
`rg -n "const .*=\s*\[|: ?\w+\[\] ?=" src/routes/_app/<module> src/components/<module>`

## Procedure

Work one module at a time. Each numbered step has a concrete analogue in the
inventory implementation — consult `references/inventory-pattern.md` for the
matching template.

### 1. Inventory the module's data
List every distinct dataset the module renders (each becomes a table). For each,
capture: the source location, the TypeScript type (or infer one), the fields, and
which fields are display strings vs real numbers/dates. Note any **writes**
(forms, toasts that "save") — those become mutations.

### 2. Define/confirm types in `src/types/<module>.ts`
If the module already has types (e.g. `src/components/discounts/types.ts`,
`ReportRow` in `reports/data.ts`), reuse them — re-export from
`src/types/<module>.ts` or leave them where they are and import. Don't rename
fields; the types are the contract.

### 3. Write the SQL in `supabase/<module>/`
Create the folder named after the module with three files (mirrors
`supabase/01_schema.sql` etc., but scoped to the module):
- `01_schema.sql` — one `create table if not exists` per dataset. snake_case
  columns; pick a natural primary key (an existing id/code field) or add
  `id uuid primary key default gen_random_uuid()`. Aggregate/dashboard payloads
  → a single-row `<module>_dashboard (id int pk default 1, data jsonb)` table.
- `02_seed.sql` — `truncate` the module's tables, then `insert` rows transcribed
  verbatim from the mock data (same values the UI showed). For JSONB dashboard
  rows, paste the object with `::jsonb`.
- `03_rls.sql` — `enable row level security` on each table; add the read policies
  for `anon, authenticated`, plus write policies only where a mutation needs them.

Add a short `README.md` in the folder pointing back to `supabase.md` and listing
the run order (1 → 2 → 3).

### 4. Create `src/hooks/use-<module>.ts`
One hook per dataset, plus one per write. Pattern (see inventory for full code):
```ts
import { supabase } from "@/lib/supabase";
// query:
const { data, error } = await supabase.from("<table>").select("<aliased cols>");
if (error) throw error;
return data as unknown as <Type>[];
// search filter: query.ilike("col", `%${search}%`) or .or("a.ilike.%s%,b.ilike.%s%")
// mutation: insert/update, then queryClient.invalidateQueries({ queryKey: ["<module>"] })
```
Use `select()` aliases to remap snake_case → the camelCase the type needs.

### 5. Wire components to the hooks
Replace the inline arrays / data-file imports in the route (or shared component)
with the hook call: `const { data = [], isLoading } = use<Resource>(search)`. Keep
the rendering identical. If a shared data file (e.g. `pos/products.ts`) is now
unused, you may leave it or delete it — say which.

### 6. Verify
- Run `bunx prettier --write` on the files you created/changed, then
  `bunx eslint <those files>` — the repo has pre-existing lint debt elsewhere, so
  lint only your files, not the whole tree.
- Run `bun run build` — it must pass even with empty `.env` (the client has
  placeholder fallbacks; queries just fail at network time until keys are set).

### 7. Update `supabase.md`
Add the module's tables to the table→hook→type reference, and note its old mock
file is now unused. Tell the user the run order for the new SQL folder.

## Output to give the user
A short summary listing: the new `supabase/<module>/` SQL files (with run order),
the new `src/hooks/use-<module>.ts`, which components were rewired, the
build/lint result, and any display-string/JSONB parity caveats — exactly the
shape of the inventory hand-off.
