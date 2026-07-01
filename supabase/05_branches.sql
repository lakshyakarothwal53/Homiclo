-- HOMIQLO — Branches + per-branch category metrics (Categories page branch filter)
-- Run this FIFTH, after 01_schema.sql … 04_categories_crud.sql.
--
-- Model (normalized junction):
--   branches            — the list of branches that populates the dropdown.
--   category_branches   — per-branch product_count / stock_value / last_updated for each
--                         category. The global `categories` table stays the "All Branches" view.
--
-- Safe to re-run. Seeds category_branches by splitting each category's global numbers across
-- branches with fixed weights (demo data). stock_value stays the "₹X.YL" display-string form.
--
-- ⚠️ DEMO-GRADE RLS (read-only, anon + authenticated). Tighten before production.

create table if not exists branches (
  name text primary key
);

create table if not exists category_branches (
  category      text not null references categories(name) on delete cascade,
  branch        text not null references branches(name)   on delete cascade,
  product_count integer not null default 0,
  stock_value   text,
  last_updated  text,
  primary key (category, branch)
);

-- Branches (canonical list used across the app).
insert into branches (name) values
  ('Bandra'), ('Andheri'), ('Powai'), ('Worli')
on conflict (name) do nothing;

-- Per-branch rows: every category × every branch, weighted off the global totals.
truncate table category_branches;
insert into category_branches (category, branch, product_count, stock_value, last_updated)
select
  c.name,
  b.branch,
  round(c.product_count * b.weight)::int,
  '₹' || to_char(
    replace(replace(c.stock_value, '₹', ''), 'L', '')::numeric * b.weight,
    'FM990.0'
  ) || 'L',
  c.last_updated
from categories c
cross join (values
  ('Bandra'::text,  0.35::numeric),
  ('Andheri',       0.30),
  ('Powai',         0.20),
  ('Worli',         0.15)
) as b(branch, weight);

-- RLS: read-only access for the public anon key + authenticated users.
alter table branches          enable row level security;
alter table category_branches enable row level security;

drop policy if exists branches_read on branches;
create policy branches_read on branches
  for select to anon, authenticated using (true);

drop policy if exists category_branches_read on category_branches;
create policy category_branches_read on category_branches
  for select to anon, authenticated using (true);
