-- HOMIQLO — Per-branch tables for the Discounts module
-- Run this NINTH, after 01_schema.sql … 08_billing_branches.sql (needs `branches`
-- from 05_branches.sql, and needs supabase/discounts/01_schema.sql … 03_rls.sql
-- already run so the global discount_* tables exist).
--
-- Extends the branch-filter pattern (see supabase/05_branches.sql,
-- supabase/06_inventory_branches.sql, supabase/08_billing_branches.sql) to:
--   discount_promos  (backs the Products / Categories / Flat / Percentage pages,
--                     filtered further by discount_type client-side),
--   discount_seasonal, discount_usage.
--
-- Read model (same as billing): "All Branches" reads the global discount_* table;
-- a specific branch reads the matching discount_*_branches table.
--
-- Seed semantics: each row (a promo, a seasonal offer, a usage record) belongs to
-- ONE branch, so rows are round-robin assigned across branches (row_number %
-- branch_count) — same approach as the billing/inventory event tables. Campaigns
-- and the dashboard's Active Discounts table are NOT branch-filtered (no branch
-- dropdown on those pages), so they're left untouched.
--
-- Safe to re-run (truncate before insert). ⚠️ DEMO-GRADE read-only RLS.

create table if not exists discount_promos_branches (
  id            text not null,
  branch        text not null references branches(name) on delete cascade,
  discount_type text not null,
  name          text not null,
  code          text not null,
  value_type    text not null,
  value         integer not null,
  min_order     integer not null,
  valid_from    text not null,
  valid_to      text not null,
  used          integer not null,
  cap           integer,
  status        text not null,
  primary key (id, branch)
);

create table if not exists discount_seasonal_branches (
  season     text not null,
  branch     text not null references branches(name) on delete cascade,
  offer      text not null,
  discount   text not null,
  valid_from text not null,
  valid_to   text not null,
  status     text not null,
  primary key (season, branch)
);

create table if not exists discount_usage_branches (
  code           text not null,
  branch         text not null references branches(name) on delete cascade,
  discount       text not null,
  times_used     integer not null,
  discount_given integer not null,
  avg_order      integer not null,
  conversion     integer not null,
  primary key (code, branch)
);

-- Round-robin seed: branches numbered 0..n-1 in name order, each global row
-- assigned to branch (row_number % branch_count).

truncate table discount_promos_branches;
insert into discount_promos_branches
  (id, branch, discount_type, name, code, value_type, value, min_order, valid_from, valid_to, used, cap, status)
select s.id, b.name, s.discount_type, s.name, s.code, s.value_type, s.value, s.min_order,
       s.valid_from, s.valid_to, s.used, s.cap, s.status
from (select *, row_number() over (order by id) - 1 as rn from discount_promos) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

truncate table discount_seasonal_branches;
insert into discount_seasonal_branches (season, branch, offer, discount, valid_from, valid_to, status)
select s.season, b.name, s.offer, s.discount, s.valid_from, s.valid_to, s.status
from (select *, row_number() over (order by season) - 1 as rn from discount_seasonal) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

truncate table discount_usage_branches;
insert into discount_usage_branches (code, branch, discount, times_used, discount_given, avg_order, conversion)
select s.code, b.name, s.discount, s.times_used, s.discount_given, s.avg_order, s.conversion
from (select *, row_number() over (order by code) - 1 as rn from discount_usage) s
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from branches
) b on b.idx = s.rn % b.n;

-- RLS: read-only for anon + authenticated on every new table.
do $$
declare t text;
begin
  foreach t in array array[
    'discount_promos_branches','discount_seasonal_branches','discount_usage_branches'
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
