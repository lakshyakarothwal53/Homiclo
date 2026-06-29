-- HOMIQLO — Billing module schema
-- Run this FIRST in the Supabase SQL editor.
--
-- Tables:
--   billing_dashboard       — single JSONB row: stat-card values for the billing
--                             index page AND the tally-sync stat cards.
--   billing_revenue_trend   — bar-chart data for the billing index page.
--   billing_sales_bills     — sales bill register.
--   billing_payments        — payment receipt log.
--   billing_refunds         — refund requests.
--   billing_tax_invoices    — GST tax invoice records.
--   billing_tally_log       — Tally ERP sync log.
--   billing_gateway_txns    — online payment gateway transactions.
--   billing_reports         — downloadable billing report list.
--
-- NOTE: amount/taxable/cgst/sgst/total are display strings ("₹4,616") — TEXT for
-- parity with the mock. Normalise to numeric later if the UI computes formatting.

create table if not exists billing_dashboard (
  id   integer primary key default 1,
  data jsonb   not null,
  constraint billing_dashboard_singleton check (id = 1)
);

create table if not exists billing_revenue_trend (
  d          text    primary key,
  revenue    integer not null,
  sort_order integer not null
);

create table if not exists billing_sales_bills (
  invoice  text primary key,
  date     text not null,
  customer text not null,
  amount   text not null,
  payment  text not null,
  status   text not null
);

create table if not exists billing_payments (
  receipt  text primary key,
  date     text not null,
  customer text not null,
  invoice  text not null,
  amount   text not null,
  mode     text not null,
  status   text not null
);

create table if not exists billing_refunds (
  refund   text primary key,
  invoice  text not null,
  customer text not null,
  amount   text not null,
  reason   text not null,
  status   text not null
);

create table if not exists billing_tax_invoices (
  invoice text primary key,
  date    text not null,
  gstin   text not null,
  taxable text not null,
  cgst    text not null,
  sgst    text not null,
  total   text not null
);

create table if not exists billing_tally_log (
  id         uuid        primary key default gen_random_uuid(),
  time       text        not null,
  voucher    text        not null,
  reference  text        not null,
  amount     text        not null,
  status     text        not null,
  created_at timestamptz not null default now()
);

create index if not exists billing_tally_log_created_at_idx on billing_tally_log (created_at desc);

create table if not exists billing_gateway_txns (
  txn      text primary key,
  date     text not null,
  customer text not null,
  amount   text not null,
  gateway  text not null,
  status   text not null
);

create table if not exists billing_reports (
  report    text primary key,
  period    text not null,
  generated text not null,
  format    text not null
);
