# Supabase SQL — Reports module

Run these in the Supabase dashboard **SQL Editor**, in order:

| Order | File | Purpose |
|---|---|---|
| 1 | `01_schema.sql` | `reports` table (one row per report, keyed by `category`) |
| 2 | `02_seed.sql` | Demo rows mirroring `src/components/reports/data.ts` |
| 3 | `03_rls.sql` | Read-only RLS policy (demo-grade) |

The six report pages read live via `useReports(category)` in
`src/hooks/use-reports.ts`. See the repo-root **`supabase.md`** for the full
walkthrough and the table→hook→type reference.
