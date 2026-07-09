# supabase/billing — Billing module SQL

Run these files in the Supabase SQL Editor **in order**:

1. `01_schema.sql` — creates all 9 billing tables
2. `02_seed.sql` — inserts demo data (stat cards, 12 chart points, 5 bills, 4 payments, 3 refunds, 3 tax invoices, 5 tally log rows, 4 gateway txns, 4 reports)
3. `03_rls.sql` — enables Row Level Security with demo-grade policies

See [`supabase.md`](../../supabase.md) at the repo root for the full Supabase
setup walkthrough (env vars, project creation, etc.).
