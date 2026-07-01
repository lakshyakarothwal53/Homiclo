-- HOMIQLO — Per-branch tables for the Billing module
-- Run this EIGHTH, after 01_schema.sql … 07_inventory_crud.sql (needs `branches`
-- from 05_branches.sql, and needs supabase/billing/01_schema.sql … 04_computed.sql
-- already run so the global billing_* tables exist).
--
-- Extends the branch-filter pattern (see supabase/05_branches.sql and
-- supabase/06_inventory_branches.sql) to the billing list pages:
--   sales-bills, payments, gateway, refunds, tax-invoices, reports.
--
-- Read model (same as inventory): "All Branches" reads the global billing_* table;
-- a specific branch reads the matching billing_*_branches table.
--
-- Seed semantics: each billing row (an invoice, receipt, refund, etc.) is an event
-- that belongs to ONE branch, so rows are round-robin assigned across branches
-- (row_number % branch_count) — same approach as the inventory event tables.
--
-- Safe to re-run (truncate before insert). ⚠️ DEMO-GRADE read-only RLS.

create table if not exists billing_sales_bills_branches (
  invoice  text not null,
  branch   text not null references branches(name) on delete cascade,
  date     text,
  customer text,
  amount   text,
  payment  text,
  status   text,
  primary key (invoice, branch)
);

create table if not exists billing_payments_branches (
  receipt  text not null,
  branch   text not null references branches(name) on delete cascade,
  date     text,
  customer text,
  invoice  text,
  amount   text,
  mode     text,
  status   text,
  primary key (receipt, branch)
);

create table if not exists billing_refunds_branches (
  refund   text not null,
  branch   text not null references branches(name) on delete cascade,
  invoice  text,
  customer text,
  amount   text,
  reason   text,
  status   text,
  primary key (refund, branch)
);

create table if not exists billing_tax_invoices_branches (
  invoice text not null,
  branch  text not null references branches(name) on delete cascade,
  date    text,
  gstin   text,
  taxable text,
  cgst    text,
  sgst    text,
  total   text,
  primary key (invoice, branch)
);

create table if not exists billing_gateway_txns_branches (
  txn      text not null,
  branch   text not null references branches(name) on delete cascade,
  date     text,
  customer text,
  amount   text,
  gateway  text,
  status   text,
  primary key (txn, branch)
);

create table if not exists billing_reports_branches (
  report    text not null,
  branch    text not null references branches(name) on delete cascade,
  period    text,
  generated text,
  format    text,
  primary key (report, branch)
);

-- Round-robin seed: branches numbered 0..n-1 in name order, each global row
-- assigned to branch (row_number % branch_count).

truncate table billing_sales_bills_branches;
insert into billing_sales_bills_branches (invoice, branch, date, customer, amount, payment, status)
select s.invoice, b.name, s.date, s.customer, s.amount, s.payment, s.status
from (select *, row_number() over (order by invoice) - 1 as rn from billing_sales_bills) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

truncate table billing_payments_branches;
insert into billing_payments_branches (receipt, branch, date, customer, invoice, amount, mode, status)
select s.receipt, b.name, s.date, s.customer, s.invoice, s.amount, s.mode, s.status
from (select *, row_number() over (order by receipt) - 1 as rn from billing_payments) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

truncate table billing_refunds_branches;
insert into billing_refunds_branches (refund, branch, invoice, customer, amount, reason, status)
select s.refund, b.name, s.invoice, s.customer, s.amount, s.reason, s.status
from (select *, row_number() over (order by refund) - 1 as rn from billing_refunds) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

truncate table billing_tax_invoices_branches;
insert into billing_tax_invoices_branches (invoice, branch, date, gstin, taxable, cgst, sgst, total)
select s.invoice, b.name, s.date, s.gstin, s.taxable, s.cgst, s.sgst, s.total
from (select *, row_number() over (order by invoice) - 1 as rn from billing_tax_invoices) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

truncate table billing_gateway_txns_branches;
insert into billing_gateway_txns_branches (txn, branch, date, customer, amount, gateway, status)
select s.txn, b.name, s.date, s.customer, s.amount, s.gateway, s.status
from (select *, row_number() over (order by txn) - 1 as rn from billing_gateway_txns) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

truncate table billing_reports_branches;
insert into billing_reports_branches (report, branch, period, generated, format)
select s.report, b.name, s.period, s.generated, s.format
from (select *, row_number() over (order by report) - 1 as rn from billing_reports) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

-- RLS: read-only for anon + authenticated on every new table.
do $$
declare t text;
begin
  foreach t in array array[
    'billing_sales_bills_branches','billing_payments_branches','billing_refunds_branches',
    'billing_tax_invoices_branches','billing_gateway_txns_branches','billing_reports_branches'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', t || '_read', t);
    execute format(
      'create policy %I on %I for select to anon, authenticated using (true);',
      t || '_read', t
    );
  end loop;
end $$;
