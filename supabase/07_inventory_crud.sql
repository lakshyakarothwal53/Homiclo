-- HOMIQLO — write policies for the inventory list pages (Add / Edit / Delete)
-- Run this SEVENTH, after 01_schema.sql … 06_inventory_branches.sql.
--
-- Mirrors 04_categories_crud.sql but for the global base tables behind the
-- Products, Stock Inward, Stock Outward and Low Stock Alerts pages. CRUD is
-- "global only" (writes hit the base table; the per-branch *_branches tables are
-- read-only and re-seeded, not edited from the UI).
--
-- RLS is already enabled on these tables (03_rls.sql). `products` already has an
-- update policy (from the stock-adjustment flow) — re-created here harmlessly.
-- Safe to re-run (drop-if-exists guarded).
--
-- ⚠️ DEMO-GRADE: anyone with the anon key can write. Scope to authenticated
-- admins before production.

do $$
declare t text;
begin
  foreach t in array array['products', 'stock_inward', 'stock_outward', 'low_stock_alerts']
  loop
    execute format('drop policy if exists %I on %I;', t || '_insert', t);
    execute format(
      'create policy %I on %I for insert to anon, authenticated with check (true);',
      t || '_insert', t
    );

    execute format('drop policy if exists %I on %I;', t || '_update', t);
    execute format(
      'create policy %I on %I for update to anon, authenticated using (true) with check (true);',
      t || '_update', t
    );

    execute format('drop policy if exists %I on %I;', t || '_delete', t);
    execute format(
      'create policy %I on %I for delete to anon, authenticated using (true);',
      t || '_delete', t
    );
  end loop;
end $$;
