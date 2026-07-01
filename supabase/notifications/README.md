# Notifications module — Supabase SQL

Run these files in order in the Supabase SQL Editor (**New query → paste → Run**):

1. `01_schema.sql` — creates table: `notifications` (one row per alert, keyed by `category`)
2. `02_seed.sql` — inserts 14 demo alert rows (5 "all", 3 stock, 3 attendance, 3 payment, 3 system)
3. `03_rls.sql` — enables Row Level Security with a demo-grade read policy

See [`supabase.md`](../../supabase.md) in the repo root for full setup instructions and the module reference table.
