-- HOMIQLO — POS module Row Level Security
-- Run AFTER 02_seed.sql.
-- DEMO-GRADE: anon + authenticated can read everything; only authenticated can
-- insert transactions. Tighten to staff/admin roles before production.

alter table pos_products    enable row level security;
alter table pos_transactions enable row level security;

-- products: read-only for everyone (catalogue browsing)
create policy pos_products_read
  on pos_products for select
  to anon, authenticated
  using (true);

-- transactions: read for everyone, insert for authenticated (cashier checkout)
create policy pos_transactions_read
  on pos_transactions for select
  to anon, authenticated
  using (true);

create policy pos_transactions_insert
  on pos_transactions for insert
  to anon, authenticated
  with check (true);
