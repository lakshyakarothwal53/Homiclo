# Supabase SQL — Inventory module

Run these in the Supabase dashboard **SQL Editor**, in order:

| Order | File                            | Purpose                                                   |
| ----- | ------------------------------- | --------------------------------------------------------- |
| 1     | `01_schema.sql`                 | Tables for every inventory hook                           |
| 2     | `02_seed.sql`                   | Demo data mirroring `src/data/inventory/*.json`           |
| 3     | `03_rls.sql`                    | Row Level Security policies (demo-grade)                  |
| 4     | `04_categories_crud.sql`        | Category write policies (add/edit/delete)                 |
| 5     | `05_branches.sql`               | Branch support infrastructure                             |
| 6     | `06_inventory_branches.sql`     | Per-branch inventory views and tables                     |
| 7     | `07_inventory_crud.sql`         | Global inventory write policies (products, stock, alerts) |
| 8     | `08_billing_branches.sql`       | Billing per-branch support                                |
| 9     | `09_discounts_branches.sql`     | Discounts per-branch support                              |
| 10    | `10_compute_product_counts.sql` | Triggers to auto-compute category product counts          |
| 11    | `11_add_minimum_stock.sql`      | Adds `min_stock` to products                              |
| 12    | `12_branch_authority.sql`       | Branch authority infra                                    |
| 13    | `13_completion_pack.sql`        | `app_settings` + remaining CRUD policies                 |
| 14    | `14_product_barcode.sql`        | **Optional, not required** — see the file header          |
| 15    | `15_redundancy_cleanup.sql`     | Part 1 safe now; Part 2 (DROPs) later — see file header   |
| 16    | `16_branch_management.sql`      | Branch CRUD write policies + junction writes + reports FK |

## Steps

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
3. Paste them into `.env` at the repo root:
   ```
   VITE_SUPABASE_URL=https://<your-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-public-key>
   ```
4. **SQL Editor → New query**: paste & run all files in order (01 through 10) listed in the table above.
5. Restart the dev server so Vite reloads env vars: `bun run dev` or `npm run dev`.

The inventory pages now read live from Supabase via the hooks in
`src/hooks/use-inventory.ts`. No component changes are needed — the hooks alias
snake_case columns back to the camelCase shape in `src/types/inventory.ts`.

See the repo-root **`supabase.md`** for the full walkthrough and table reference.
