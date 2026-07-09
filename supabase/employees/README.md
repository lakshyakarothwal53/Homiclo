# HOMIQLO Employees Module — SQL Setup

Run these files **in order** in the Supabase SQL editor:

1. **01_schema.sql** — Creates `employees`, `employee_logins`, `employee_activity`, `employee_locations`, `employee_reports` tables with indexes.
2. **02_seed.sql** — Truncates and re-inserts demo data (realistic employee records).
3. **03_rls.sql** — Enables RLS and adds demo-grade read/write policies.

After running these, the employees module queries (`useEmployees`, `useEmployeeLogins`, etc.) will fetch live data from Supabase. The component wiring remains unchanged; only the data source swaps from static arrays to hooks.

Ref: [Main Supabase walkthrough](../../supabase.md)
