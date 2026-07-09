-- HOMIQLO — Billing: allow inserting payment receipts
-- Run AFTER 04_computed.sql in the Supabase SQL editor.
--
-- Needed so "Generate Invoice" can record a matching receipt in
-- billing_payments (03_rls.sql only granted insert on billing_sales_bills).
-- DEMO-GRADE: tighten to staff/admin roles before production.

create policy billing_payments_insert
  on billing_payments for insert
  to anon, authenticated
  with check (true);
