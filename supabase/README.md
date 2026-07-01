# Supabase SQL — Inventory module

Run these in the Supabase dashboard **SQL Editor**, in order:

| Order | File | Purpose |
|---|---|---|
| 1 | `01_schema.sql` | Tables for every inventory hook |
| 2 | `02_seed.sql` | Demo data mirroring `src/data/inventory/*.json` |
| 3 | `03_rls.sql` | Row Level Security policies (demo-grade) |

## Steps

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
3. Paste them into `.env` at the repo root:
   ```
   VITE_SUPABASE_URL=https://<your-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-public-key>
   ```
4. **SQL Editor → New query**: paste & run `01_schema.sql`, then `02_seed.sql`, then `03_rls.sql`.
5. Restart the dev server so Vite reloads env vars: `bun run dev`.

The inventory pages now read live from Supabase via the hooks in
`src/hooks/use-inventory.ts`. No component changes are needed — the hooks alias
snake_case columns back to the camelCase shape in `src/types/inventory.ts`.

See the repo-root **`supabase.md`** for the full walkthrough and table reference.
