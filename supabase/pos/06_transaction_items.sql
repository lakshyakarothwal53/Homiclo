-- HOMIQLO — POS: itemized transaction lines + money breakdown
-- Run this SIXTH (after 05_barcode.sql).
--
-- Why: checkout previously saved only a summary row (invoice, item COUNT, amount
-- string) — the cart's line items were discarded, so bills could not be reprinted
-- and reports had no product-level detail. This adds:
--   * a per-line child table keyed to the transaction invoice, and
--   * numeric money columns on pos_transactions (the legacy `amount` TEXT stays for
--     backward compatibility with existing reads).
--
-- Safe to re-run.

create table if not exists pos_transaction_items (
  id          uuid        primary key default gen_random_uuid(),
  invoice     text        not null references pos_transactions(invoice) on delete cascade,
  barcode     text,
  sku         text        not null,
  name        text        not null,
  qty         integer     not null,
  unit_price  integer     not null,
  line_total  integer     not null,
  created_at  timestamptz not null default now()
);

create index if not exists pos_transaction_items_invoice_idx
  on pos_transaction_items (invoice);

-- Numeric money breakdown on the summary row (nullable; UI populates on new sales).
alter table pos_transactions add column if not exists subtotal    integer;
alter table pos_transactions add column if not exists discount    integer;
alter table pos_transactions add column if not exists gst         integer;
alter table pos_transactions add column if not exists total       integer;
alter table pos_transactions add column if not exists upi_ref     text;
alter table pos_transactions add column if not exists branch      text;

alter table pos_transaction_items enable row level security;

-- DEMO-GRADE policies (match the rest of the POS module). Scope before production.
drop policy if exists pos_transaction_items_read on pos_transaction_items;
create policy pos_transaction_items_read on pos_transaction_items
  for select to anon, authenticated using (true);

drop policy if exists pos_transaction_items_write on pos_transaction_items;
create policy pos_transaction_items_write on pos_transaction_items
  for insert to anon, authenticated with check (true);
