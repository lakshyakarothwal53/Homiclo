-- HOMIQLO — Billing: per-line refund detail.
-- Run AFTER 08_tax_invoices_and_refunds.sql in the Supabase SQL editor.
--
-- billing_refunds only ever recorded one row per refund with a lump-sum
-- amount — which SKUs (and how many units of each) were actually returned
-- was never persisted, so the New Refund dialog had no way to tell that a
-- product on an invoice had already been refunded and would let the same
-- line be refunded again. This table records the line items chosen in the
-- New Refund dialog so a later refund against the same invoice can see
-- what's already been returned.

create table if not exists billing_refund_items (
  id         uuid primary key default gen_random_uuid(),
  refund     text not null references billing_refunds (refund) on delete cascade,
  invoice    text not null,
  sku        text not null,
  qty        integer not null,
  created_at timestamptz not null default now()
);

create index if not exists billing_refund_items_invoice_idx on billing_refund_items (invoice);

alter table billing_refund_items enable row level security;

create policy billing_refund_items_read
  on billing_refund_items for select
  to anon, authenticated
  using (true);

create policy billing_refund_items_insert
  on billing_refund_items for insert
  to anon, authenticated
  with check (true);
