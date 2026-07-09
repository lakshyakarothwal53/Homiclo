-- HOMIQLO — Billing: allow tax invoice inserts, refund inserts, and marking
-- a sales bill as refunded.
-- Run AFTER 07_customers.sql in the Supabase SQL editor.
--
-- Needed so:
--   - Create Invoice can record a GST breakdown in billing_tax_invoices
--     whenever the customer supplies a GST number.
--   - Sales Bills' new "Refund" action can insert a billing_refunds row
--     and flip the originating invoice's status to "Refunded".

create policy billing_tax_invoices_insert
  on billing_tax_invoices for insert
  to anon, authenticated
  with check (true);

create policy billing_refunds_insert
  on billing_refunds for insert
  to anon, authenticated
  with check (true);

create policy billing_sales_bills_update
  on billing_sales_bills for update
  to anon, authenticated
  using (true)
  with check (true);
