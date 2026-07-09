-- HOMIQLO — Per-branch tables for the remaining inventory pages
-- Run this SIXTH, after 01_schema.sql … 05_branches.sql (needs `branches`).
--
-- Extends the branch-filter pattern (see supabase/05_branches.sql) to:
--   products, stock_inward, stock_outward, stock_history, low_stock_alerts,
--   inventory_reports.
--
-- Read model (same as categories): "All Branches" reads the global base table;
-- a specific branch reads the matching *_branches table. Each junction is
-- self-contained (copies the displayed columns) so it works even for the base
-- tables whose primary key is a volatile uuid (stock_history, inventory_reports).
--
-- Seed semantics:
--   • products  — a SKU exists in every branch with its own weighted stock
--                 (cross product), status recomputed from per-branch stock.
--   • everything else — each base row is an event/alert that belongs to ONE
--                 branch, so rows are round-robin assigned across branches
--                 (row_number % branch_count). Filtering a branch shows its slice.
--
-- Safe to re-run (truncate before insert). ⚠️ DEMO-GRADE read-only RLS.

create table if not exists products_branches (
  sku      text not null,
  branch   text not null references branches(name) on delete cascade,
  name     text not null,
  category text not null,
  price    integer not null default 0,
  stock    integer not null default 0,
  status   text not null,
  primary key (sku, branch)
);

create table if not exists stock_inward_branches (
  grn         text not null,
  branch      text not null references branches(name) on delete cascade,
  date        text,
  product     text not null,
  supplier    text,
  qty         integer not null default 0,
  cost        text,
  received_by text,
  primary key (grn, branch)
);

create table if not exists stock_outward_branches (
  ref       text not null,
  branch    text not null references branches(name) on delete cascade,
  date      text,
  product   text not null,
  type      text not null,
  qty       integer not null default 0,
  reference text,
  by        text,
  primary key (ref, branch)
);

create table if not exists stock_history_branches (
  id       uuid primary key default gen_random_uuid(),
  branch   text not null references branches(name) on delete cascade,
  datetime text,
  product  text not null,
  change   integer not null default 0,
  type     text not null,
  balance  integer not null default 0,
  by       text
);

create table if not exists low_stock_alerts_branches (
  sku           text not null,
  branch        text not null references branches(name) on delete cascade,
  product       text not null,
  current_stock integer not null default 0,
  min_level     integer not null default 0,
  status        text not null,
  primary key (sku, branch)
);

create table if not exists inventory_reports_branches (
  id        uuid primary key default gen_random_uuid(),
  branch    text not null references branches(name) on delete cascade,
  report    text not null,
  period    text,
  generated text,
  format    text
);

-- Branch weights (for the products cross product) and an indexed branch list
-- (for round-robin assignment of event rows).
-- products: a SKU in every branch with its own share of the global stock.
truncate table products_branches;
insert into products_branches (sku, branch, name, category, price, stock, status)
select
  p.sku,
  b.branch,
  p.name,
  p.category,
  p.price,
  round(p.stock * b.weight)::int,
  case
    when round(p.stock * b.weight)::int = 0 then 'Out of Stock'
    when round(p.stock * b.weight)::int < 10 then 'Low Stock'
    else 'In Stock'
  end
from products p
cross join (values
  ('Bandra'::text,  0.35::numeric),
  ('Andheri',       0.30),
  ('Powai',         0.20),
  ('Worli',         0.15)
) as b(branch, weight);

-- Round-robin helper: branches numbered 0..n-1 in name order.
-- Reused by every event/alert table below via `idx = rn % n`.

truncate table stock_inward_branches;
insert into stock_inward_branches (grn, branch, date, product, supplier, qty, cost, received_by)
select s.grn, b.name, s.date, s.product, s.supplier, s.qty, s.cost, s.received_by
from (select *, row_number() over (order by grn) - 1 as rn from stock_inward) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

truncate table stock_outward_branches;
insert into stock_outward_branches (ref, branch, date, product, type, qty, reference, by)
select s.ref, b.name, s.date, s.product, s.type, s.qty, s.reference, s.by
from (select *, row_number() over (order by ref) - 1 as rn from stock_outward) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

truncate table stock_history_branches;
insert into stock_history_branches (branch, datetime, product, change, type, balance, by)
select b.name, s.datetime, s.product, s.change, s.type, s.balance, s.by
from (select *, row_number() over (order by datetime, id) - 1 as rn from stock_history) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

truncate table low_stock_alerts_branches;
insert into low_stock_alerts_branches (sku, branch, product, current_stock, min_level, status)
select s.sku, b.name, s.product, s.current_stock, s.min_level, s.status
from (select *, row_number() over (order by sku) - 1 as rn from low_stock_alerts) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

truncate table inventory_reports_branches;
insert into inventory_reports_branches (branch, report, period, generated, format)
select b.name, s.report, s.period, s.generated, s.format
from (select *, row_number() over (order by report, id) - 1 as rn from inventory_reports) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

-- RLS: read-only for anon + authenticated on every new table.
do $$
declare t text;
begin
  foreach t in array array[
    'products_branches','stock_inward_branches','stock_outward_branches',
    'stock_history_branches','low_stock_alerts_branches','inventory_reports_branches'
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
