-- HOMIQLO — Settings module: per-branch role user counts
-- Run this FOURTH, after 01_schema.sql … 03_rls.sql, and after supabase/05_branches.sql
-- (needs the shared `branches` table — Bandra/Andheri/Powai/Worli, same vocabulary
-- as inventory/billing/discounts).
--
-- Extends the branch-filter pattern to Roles & Permissions: "All Branches" reads
-- the global `roles` table; a specific branch reads `role_branches`, which splits
-- each role's global `users` count across branches using the same weights as
-- supabase/05_branches.sql (approximate demo data — won't sum exactly to the
-- global count). description/permissions are copied unchanged per branch.
--
-- Safe to re-run (truncate before insert). ⚠️ DEMO-GRADE read-only RLS.

create table if not exists role_branches (
  role        text not null references roles(role) on delete cascade,
  branch      text not null references branches(name) on delete cascade,
  users       integer not null default 0,
  description text not null,
  permissions text not null,
  primary key (role, branch)
);

truncate table role_branches;
insert into role_branches (role, branch, users, description, permissions)
select
  r.role,
  b.branch,
  greatest(round(r.users * b.weight)::int, 0),
  r.description,
  r.permissions
from roles r
cross join (values
  ('Bandra'::text,  0.35::numeric),
  ('Andheri',       0.30),
  ('Powai',         0.20),
  ('Worli',         0.15)
) as b(branch, weight);

alter table role_branches enable row level security;

drop policy if exists role_branches_read on role_branches;
create policy role_branches_read on role_branches
  for select to anon, authenticated using (true);
