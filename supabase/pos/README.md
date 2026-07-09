# supabase/pos — POS module SQL

Run these files in the Supabase SQL Editor **in order**:

1. `01_schema.sql` — creates `pos_products` and `pos_transactions` tables
2. `02_seed.sql` — inserts the 12 demo products and 5 demo transactions
3. `03_rls.sql` — enables Row Level Security with demo-grade policies

See [`supabase.md`](../../supabase.md) at the repo root for the full Supabase
setup walkthrough (env vars, project creation, etc.).
