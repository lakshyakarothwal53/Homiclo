-- HOMIQLO — POS module: allow creating products from Product Search
-- Run this FIFTH, after 01_schema.sql … 04_branches.sql.
--
-- pos_products was read-only (03_rls.sql). The Product Search "Add New" flow
-- now creates products directly in pos_products (sku auto-generated client-side
-- and used as the printable barcode value), so it needs an insert policy.
--
-- ⚠️ DEMO-GRADE: any anon/authenticated caller can insert. Tighten to staff/admin
-- roles before production.

create policy pos_products_insert
  on pos_products for insert
  to anon, authenticated
  with check (true);
