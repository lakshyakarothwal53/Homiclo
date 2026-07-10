# supabase/pos — POS module SQL

Run these files in the Supabase SQL Editor **in order**:

1. `01_schema.sql` — creates `pos_products` and `pos_transactions` tables
2. `02_seed.sql` — inserts the 12 demo products and 5 demo transactions
3. `03_rls.sql` — enables Row Level Security with demo-grade policies
4. `04_branches.sql` — per-branch POS catalogue + transactions
5. `05_barcode.sql` — adds the auto-generated `barcode` column to the POS catalogue
   (run **after** `../14_product_barcode.sql`, which defines the generator)
6. `06_transaction_items.sql` — itemized `pos_transaction_items` + money-breakdown
   columns on `pos_transactions` (needed for printed / reprinted bills)

See [`supabase.md`](../../supabase.md) at the repo root for the full Supabase
setup walkthrough (env vars, project creation, etc.).
