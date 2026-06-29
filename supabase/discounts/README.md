# Discounts module — Supabase SQL

Run these files in order in the Supabase SQL Editor (**New query → paste → Run**):

1. `01_schema.sql` — creates tables: `discounts_dashboard`, `discounts_active`, `discount_promos`, `discount_campaigns`, `discount_seasonal`, `discount_usage`
2. `02_seed.sql` — inserts demo rows matching the mock UI
3. `03_rls.sql` — enables Row Level Security with demo-grade read/write policies

See [`supabase.md`](../../supabase.md) in the repo root for full setup instructions and the module reference table.
