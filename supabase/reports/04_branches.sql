-- HOMIQLO — Reports module: branch filter (its own city-outlet vocabulary)
-- Run this FOURTH, after 01_schema.sql … 03_rls.sql.
--
-- The Reports module's branch dropdown intentionally uses a DIFFERENT vocabulary
-- than the shared `branches` table (Bandra/Andheri/Powai/Worli, used by
-- inventory/billing/discounts): reports roll up across cities, not just Mumbai
-- outlets, so it gets its own `report_branches` table —
--   Mumbai – Andheri, Delhi – Connaught Place, Bengaluru – Koramangala, Pune – Baner.
-- Confirmed intentional with the team; do not merge this into the shared `branches`
-- table.
--
-- Read model (same pattern as elsewhere): "All Branches" reads the global
-- `reports` table; a specific branch reads `reports_branches`. Each report row
-- belongs to ONE outlet, round-robin assigned across the 4 outlets.
--
-- Safe to re-run (truncate before insert). ⚠️ DEMO-GRADE read-only RLS.

create table if not exists report_branches (
  name text primary key
);

insert into report_branches (name) values
  ('Mumbai – Andheri'), ('Delhi – Connaught Place'), ('Bengaluru – Koramangala'), ('Pune – Baner')
on conflict (name) do nothing;

create table if not exists reports_branches (
  id        text not null,
  branch    text not null references report_branches(name) on delete cascade,
  category  text not null,
  name      text not null,
  type      text,
  period    text,
  generated text,
  size      text,
  primary key (id, branch)
);

-- Round-robin seed: outlets numbered 0..n-1 in name order, each global report
-- row assigned to one outlet (row_number % outlet_count).
truncate table reports_branches;
insert into reports_branches (id, branch, category, name, type, period, generated, size)
select r.id, b.name, r.category, r.name, r.type, r.period, r.generated, r.size
from (select *, row_number() over (order by id) - 1 as rn from reports) r
join (
  select name, row_number() over (order by name) - 1 as idx, count(*) over () as n
  from report_branches
) b on b.idx = r.rn % b.n;

-- RLS: read-only for anon + authenticated.
alter table report_branches  enable row level security;
alter table reports_branches enable row level security;

drop policy if exists report_branches_read on report_branches;
create policy report_branches_read on report_branches
  for select to anon, authenticated using (true);

drop policy if exists reports_branches_read on reports_branches;
create policy reports_branches_read on reports_branches
  for select to anon, authenticated using (true);
