-- HOMIQLO — POS module schema
-- Run this FIRST in the Supabase SQL editor.
--
-- Two tables:
--   pos_products   — product catalogue used by the POS dashboard and search page.
--   pos_transactions — completed/pending/refunded sale records.
--
-- NOTE: `amount` is a display string ("₹4,616") — stored as TEXT to mirror the
-- mock fixture verbatim. Normalise to numeric + compute formatting in the UI later.

create table if not exists pos_products (
  sku      text    primary key,
  name     text    not null,
  category text    not null,
  price    integer not null,
  stock    integer not null
);

create table if not exists pos_transactions (
  invoice    text        primary key,
  time       text        not null,
  items      integer     not null,
  amount     text        not null,
  payment    text        not null,
  cashier    text        not null,
  status     text        not null,
  created_at timestamptz not null default now()
);

create index if not exists pos_transactions_created_at_idx on pos_transactions (created_at desc);
