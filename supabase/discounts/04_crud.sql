-- HOMIQLO — write policies for the Discounts module (Add / Edit / Delete)
-- Run this FOURTH, after 01_schema.sql, 02_seed.sql and 03_rls.sql.
--
-- RLS is already enabled on every discount_* table (03_rls.sql) with only read
-- policies, so INSERT/UPDATE/DELETE are denied by default. These policies open up
-- writes for the CRUD hooks in src/hooks/use-discounts.ts (Add / Edit / Delete on
-- promos, campaigns, seasonal offers and usage records).
--
-- Writes always target the GLOBAL discount_* tables (source of truth). The
-- per-branch discount_*_branches tables (09_discounts_branches.sql) stay read-only
-- seeded snapshots — the "All Branches" view reflects writes immediately.
--
-- ⚠️ DEMO-GRADE POLICIES: they let the public anon key write. Scope these to
-- authenticated admin users before production. Safe to re-run (drop-if-exists).

-- discount_promos — 03_rls.sql created an `authenticated`-only insert policy;
-- drop it and recreate all three verbs for anon + authenticated (the app uses the
-- anon key without a Supabase auth session, matching supabase/04_categories_crud.sql).
drop policy if exists "auth insert discount_promos" on discount_promos;
drop policy if exists discount_promos_insert on discount_promos;
drop policy if exists discount_promos_update on discount_promos;
drop policy if exists discount_promos_delete on discount_promos;
create policy discount_promos_insert on discount_promos
  for insert to anon, authenticated with check (true);
create policy discount_promos_update on discount_promos
  for update to anon, authenticated using (true) with check (true);
create policy discount_promos_delete on discount_promos
  for delete to anon, authenticated using (true);

-- discount_campaigns
drop policy if exists discount_campaigns_insert on discount_campaigns;
drop policy if exists discount_campaigns_update on discount_campaigns;
drop policy if exists discount_campaigns_delete on discount_campaigns;
create policy discount_campaigns_insert on discount_campaigns
  for insert to anon, authenticated with check (true);
create policy discount_campaigns_update on discount_campaigns
  for update to anon, authenticated using (true) with check (true);
create policy discount_campaigns_delete on discount_campaigns
  for delete to anon, authenticated using (true);

-- discount_seasonal
drop policy if exists discount_seasonal_insert on discount_seasonal;
drop policy if exists discount_seasonal_update on discount_seasonal;
drop policy if exists discount_seasonal_delete on discount_seasonal;
create policy discount_seasonal_insert on discount_seasonal
  for insert to anon, authenticated with check (true);
create policy discount_seasonal_update on discount_seasonal
  for update to anon, authenticated using (true) with check (true);
create policy discount_seasonal_delete on discount_seasonal
  for delete to anon, authenticated using (true);

-- discount_usage
drop policy if exists discount_usage_insert on discount_usage;
drop policy if exists discount_usage_update on discount_usage;
drop policy if exists discount_usage_delete on discount_usage;
create policy discount_usage_insert on discount_usage
  for insert to anon, authenticated with check (true);
create policy discount_usage_update on discount_usage
  for update to anon, authenticated using (true) with check (true);
create policy discount_usage_delete on discount_usage
  for delete to anon, authenticated using (true);
