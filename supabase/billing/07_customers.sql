-- HOMIQLO — Billing: customer master data
-- Run AFTER 06_backfill_payments.sql in the Supabase SQL editor.
--
-- Stores customer details (name, mobile, GST, date of birth) so Create
-- Invoice can look up a returning customer by name/mobile and autofill the
-- rest instead of asking every time. Mobile is the natural unique key,
-- matching the text-primary-key convention used by the other billing tables.

create table if not exists customers (
  mobile     text primary key,
  name       text not null,
  gst        text,
  dob        date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customers enable row level security;

create policy customers_read
  on customers for select to anon, authenticated using (true);

create policy customers_insert
  on customers for insert to anon, authenticated with check (true);

create policy customers_update
  on customers for update to anon, authenticated using (true) with check (true);
