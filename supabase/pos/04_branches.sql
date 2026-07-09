-- HOMIQLO — POS module: per-branch tables (Product Search / Transactions branch filter)
-- Run this FOURTH, after 01_schema.sql … 03_rls.sql, and after supabase/05_branches.sql
-- (needs the shared `branches` table — Bandra/Andheri/Powai/Worli).
--
-- Extends the branch-filter pattern to POS:
--   pos_products      — a SKU exists in every branch with its own weighted stock
--                       (cross join, same weights as supabase/06_inventory_branches.sql).
--   pos_transactions  — each sale happened at ONE branch, so rows are round-robin
--                       assigned across branches (row_number % branch_count), same
--                       approach as supabase/08_billing_branches.sql.
--
-- Read model (same as elsewhere): "All Branches" reads the global table; a
-- specific branch reads the matching *_branches table.
--
-- Safe to re-run (truncate before insert). ⚠️ DEMO-GRADE read-only RLS.

create table if not exists pos_products_branches (
  sku      text    not null,
  branch   text    not null references branches(name) on delete cascade,
  name     text    not null,
  category text    not null,
  price    integer not null,
  stock    integer not null,
  primary key (sku, branch)
);

create table if not exists pos_transactions_branches (
  invoice text not null,
  branch  text not null references branches(name) on delete cascade,
  time    text not null,
  items   integer not null,
  amount  text not null,
  payment text not null,
  cashier text not null,
  status  text not null,
  primary key (invoice, branch)
);

-- pos_products: a SKU in every branch with its own share of the global stock.
truncate table pos_products_branches;
insert into pos_products_branches (sku, branch, name, category, price, stock)
select
  p.sku,
  b.branch,
  p.name,
  p.category,
  p.price,
  round(p.stock * b.weight)::int
from pos_products p
cross join (values
  ('Bandra'::text,  0.35::numeric),
  ('Andheri',       0.30),
  ('Powai',         0.20),
  ('Worli',         0.15)
) as b(branch, weight);

-- pos_transactions: round-robin — each sale belongs to one branch.
truncate table pos_transactions_branches;
insert into pos_transactions_branches (invoice, branch, time, items, amount, payment, cashier, status)
select t.invoice, b.name, t.time, t.items, t.amount, t.payment, t.cashier, t.status
from (select *, row_number() over (order by invoice) - 1 as rn from pos_transactions) t
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = t.rn % b.n;

-- RLS: read-only for anon + authenticated.
alter table pos_products_branches     enable row level security;
alter table pos_transactions_branches enable row level security;

drop policy if exists pos_products_branches_read on pos_products_branches;
create policy pos_products_branches_read on pos_products_branches
  for select to anon, authenticated using (true);

drop policy if exists pos_transactions_branches_read on pos_transactions_branches;
create policy pos_transactions_branches_read on pos_transactions_branches
  for select to anon, authenticated using (true);
