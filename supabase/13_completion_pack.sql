-- HOMIQLO — Completion pack: everything the "fully functional portal" work needs.
-- Run ONCE in the Supabase SQL editor, after 01…12 (safe to re-run — everything
-- is IF NOT EXISTS / drop-then-create).
--
-- Covers:
--   1. customers table (same as billing/07_customers.sql, if you skipped it)
--   2. app_settings key-value store (Company / Tally / Preferences /
--      Notification-rule settings pages persist here)
--   3. Write policies for tables that were read-only: roles, billing_reports,
--      inventory_reports, reports, notifications, employee_reports,
--      billing_tally_log
--   4. refund_date column on billing_refunds (Refunds page date filter)
--   5. bill_date/pay_date/amount_num/refund_date on the billing *_branches
--      junction tables — 08_billing_branches.sql predates 04_computed.sql
--      and billing/07's refund_date addition, so branch-scoped billing
--      queries (Dashboard branch view, Sales Bills/Payments/Refunds pages
--      filtered to a branch, branch-scoped Reports) throw "column does not
--      exist" the moment they run, since the hooks select these columns
--      unconditionally from whichever table (global or branch) is active.
--   7. delete policy on pos_transactions (POS checkout only had insert/read;
--      cleans up a leaked test row from verifying the checkout flow)
--   8. delete policy on billing_sales_bills / billing_payments / customers
--      (only had insert/update; cleans up test rows from verifying the
--      Create Invoice flow end-to-end)
--
-- ⚠️ DEMO-GRADE POLICIES (anon can write) — consistent with the rest of the
-- project. Tighten to authenticated admins before production.

-- 1. customers ---------------------------------------------------------------
create table if not exists customers (
  mobile     text primary key,
  name       text not null,
  gst        text,
  dob        date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customers enable row level security;

drop policy if exists customers_read on customers;
create policy customers_read
  on customers for select to anon, authenticated using (true);

drop policy if exists customers_insert on customers;
create policy customers_insert
  on customers for insert to anon, authenticated with check (true);

drop policy if exists customers_update on customers;
create policy customers_update
  on customers for update to anon, authenticated using (true) with check (true);

-- 2. app_settings ------------------------------------------------------------
create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

drop policy if exists app_settings_read on app_settings;
create policy app_settings_read
  on app_settings for select to anon, authenticated using (true);

drop policy if exists app_settings_write on app_settings;
create policy app_settings_write
  on app_settings for insert to anon, authenticated with check (true);

drop policy if exists app_settings_update on app_settings;
create policy app_settings_update
  on app_settings for update to anon, authenticated using (true) with check (true);

-- 3. Write policies for previously read-only tables ---------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'roles','billing_reports','inventory_reports','reports','notifications',
    'employee_reports','billing_tally_log'
  ]
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

-- 4. Refunds date column -------------------------------------------------------
alter table billing_refunds add column if not exists refund_date date default current_date;
update billing_refunds set refund_date = current_date where refund_date is null;

-- 5. Missing computed columns on billing branch-junction tables ---------------
alter table billing_sales_bills_branches add column if not exists bill_date date;
alter table billing_sales_bills_branches add column if not exists amount_num numeric not null default 0;

alter table billing_payments_branches add column if not exists pay_date date;
alter table billing_payments_branches add column if not exists amount_num numeric not null default 0;

alter table billing_refunds_branches add column if not exists refund_date date default current_date;
alter table billing_refunds_branches add column if not exists amount_num numeric not null default 0;

-- 6. Remove leftover write-permission probe rows --------------------------------
delete from billing_sales_bills  where invoice = '__PROBE__';
delete from billing_payments     where receipt = '__PROBE__';
delete from billing_refunds      where refund  = '__PROBE__';
delete from billing_tax_invoices where invoice = '__PROBE__';
delete from absent_records       where employee_id = '__probe__';
delete from attendance_reports   where report_name = '__probe__';
delete from pos_transactions     where cashier = 'Verify Script';
delete from billing_sales_bills  where customer = '__E2E_Verify__';
delete from billing_payments     where customer = '__E2E_Verify__';
delete from customers            where name = '__E2E_Verify__';

-- 7. pos_transactions delete policy --------------------------------------------
drop policy if exists pos_transactions_delete on pos_transactions;
create policy pos_transactions_delete
  on pos_transactions for delete to anon, authenticated using (true);

-- 8. billing_sales_bills / billing_payments / customers delete policies -------
drop policy if exists billing_sales_bills_delete on billing_sales_bills;
create policy billing_sales_bills_delete
  on billing_sales_bills for delete to anon, authenticated using (true);

drop policy if exists billing_payments_delete on billing_payments;
create policy billing_payments_delete
  on billing_payments for delete to anon, authenticated using (true);

drop policy if exists customers_delete on customers;
create policy customers_delete
  on customers for delete to anon, authenticated using (true);
