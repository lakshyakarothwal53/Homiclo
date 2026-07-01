-- HOMIQLO — write policies for the categories table (Add / Edit / Delete)
-- Run this FOURTH, after 01_schema.sql, 02_seed.sql and 03_rls.sql.
--
-- RLS is already enabled on `categories` (03_rls.sql) with only a read policy, so
-- INSERT/UPDATE/DELETE are denied by default. These policies open up writes.
--
-- ⚠️ DEMO-GRADE POLICIES. They let the public anon key write the categories table.
-- Before going to production, scope these to authenticated admin users
-- (e.g. using auth.uid() / a roles table). Safe to re-run (drop-if-exists guarded).

drop policy if exists categories_insert on categories;
create policy categories_insert on categories
  for insert to anon, authenticated with check (true);

drop policy if exists categories_update on categories;
create policy categories_update on categories
  for update to anon, authenticated using (true) with check (true);

drop policy if exists categories_delete on categories;
create policy categories_delete on categories
  for delete to anon, authenticated using (true);
