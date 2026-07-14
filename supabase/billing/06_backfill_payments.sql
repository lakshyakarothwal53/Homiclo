-- HOMIQLO — Billing: backfill missing payment receipts
-- Run AFTER 05_payments_insert.sql in the Supabase SQL editor.
--
-- billing_sales_bills has 16 seeded invoices (04_computed.sql added 11 extra
-- rows for the revenue trend chart) but billing_payments only ever had 4
-- receipts from 02_seed.sql, so Sales Bills and Payments were out of sync.
-- This creates a receipt for every "Paid" invoice that doesn't already have
-- a matching billing_payments row, so Payment Collection reflects all sales.

do $$
declare
  next_num integer;
begin
  select coalesce(max(substring(receipt from 5)::integer), 4521) + 1
  into next_num
  from billing_payments;

  insert into billing_payments
    (receipt, date, customer, invoice, amount, mode, status, pay_date, amount_num)
  select
    'REC-' || (next_num + row_number() over (order by s.invoice) - 1)::text,
    s.date,
    s.customer,
    s.invoice,
    s.amount,
    s.payment,
    'Received',
    s.bill_date,
    s.amount_num
  from billing_sales_bills s
  where s.status = 'Paid'
    and not exists (
      select 1 from billing_payments p where p.invoice = s.invoice
    );
end $$;
