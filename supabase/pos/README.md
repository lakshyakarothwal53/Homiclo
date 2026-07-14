# supabase/pos — POS module SQL

Run these files in the Supabase SQL Editor **in order**:

1. `01_schema.sql` — creates `pos_products` and `pos_transactions` tables
2. `02_seed.sql` — inserts the 12 demo products and 5 demo transactions
3. `03_rls.sql` — enables Row Level Security with demo-grade policies
4. `04_branches.sql` — per-branch POS catalogue + transactions
5. `05_barcode.sql` — **optional, not required.** The app uses `sku` directly as
   the scannable barcode (one identifier); skip this unless you want a separate
   DB-generated code for a future integration.
6. `06_transaction_items.sql` — **recommended.** Itemized `pos_transaction_items`
   + money-breakdown columns on `pos_transactions`, used for printed/reprinted
   bills. Checkout works without it (the app falls back to the base columns),
   but reprints and per-item reports need it.

See [`supabase.md`](../../supabase.md) at the repo root for the full Supabase
setup walkthrough (env vars, project creation, etc.).
