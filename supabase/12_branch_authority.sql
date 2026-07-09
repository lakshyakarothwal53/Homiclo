-- HOMIQLO — Branch authority + multi-branch reconciliation
-- Run this TWELFTH, AFTER 05_branches.sql and the attendance geofence files
-- (supabase/attendance/04_employee_geofence.sql).
--
-- WHY: the app had four conflicting "branch" vocabularies (store list, user
-- accounts, seeded employees, geofence offices). Per the product decision, the
-- geofence office list is now the single authoritative set, and the existing
-- name-based `branches` table (NOT integer branch_id) is extended to carry the
-- office GPS coordinates so attendance geofencing and branch isolation share one
-- source of truth.
--
-- AFTER running this, RE-RUN the junction seeds so their rows reference the new
-- branch list (their seeds read from `branches` and are re-runnable):
--   06_inventory_branches.sql, 08_billing_branches.sql, 09_discounts_branches.sql
--
-- Safe to re-run. ⚠️ DEMO-GRADE read-only RLS.

-- 1. Extend `branches` with office geolocation (name stays the primary key).
alter table branches add column if not exists latitude      numeric;
alter table branches add column if not exists longitude     numeric;
alter table branches add column if not exists radius_meters integer not null default 50;
alter table branches add column if not exists address       text;

-- 2. Make the authoritative branch list = the 7 geofence offices, with coords.
--    Old store-only branches (Andheri, Powai) are removed; their junction rows
--    cascade away and are re-seeded when you re-run 06/08/09.
delete from branches where name in ('Andheri', 'Powai');

insert into branches (name, latitude, longitude, radius_meters, address) values
  ('Mumbai HQ',  19.0760, 72.8777, 50, 'Mumbai, Maharashtra'),
  ('Worli',      19.0176, 72.8194, 50, 'Worli, Mumbai'),
  ('Bandra',     19.0596, 72.8295, 50, 'Bandra, Mumbai'),
  ('Main Store', 19.0827, 72.8857, 50, 'Andheri, Mumbai'),
  ('Branch 2',   19.1136, 72.8697, 50, 'Thane, Maharashtra'),
  ('Branch 3',   19.0176, 72.9781, 50, 'Airoli, Navi Mumbai'),
  ('Warehouse',  19.2183, 72.9781, 50, 'Navi Mumbai, Maharashtra')
on conflict (name) do update set
  latitude      = excluded.latitude,
  longitude     = excluded.longitude,
  radius_meters = excluded.radius_meters,
  address       = excluded.address;

-- 3. Keep office_locations in lockstep with branches (the employee check-in page
--    reads office_locations; branches is the master). Mirror the same 7 rows.
insert into office_locations (name, branch, latitude, longitude, radius_meters, address)
select name, name, latitude, longitude, radius_meters, address from branches
on conflict (branch) do update set
  name          = excluded.name,
  latitude      = excluded.latitude,
  longitude     = excluded.longitude,
  radius_meters = excluded.radius_meters,
  address       = excluded.address;

-- 4. Branch → Branch Admin assignment (Super Admin manages this).
--    Demo accounts live in src/mocks/users.json; this table records the mapping
--    for reporting and future Supabase-Auth migration.
create table if not exists branch_admins (
  branch      text primary key references branches(name) on delete cascade,
  admin_name  text not null,
  admin_email text not null,
  created_at  timestamptz default now()
);

insert into branch_admins (branch, admin_name, admin_email) values
  ('Mumbai HQ',  'Rohan Kulkarni', 'branch.mumbai@homiqlo.co'),
  ('Worli',      'Sneha Iyer',     'branch.worli@homiqlo.co'),
  ('Bandra',     'Imran Shaikh',   'branch.bandra@homiqlo.co'),
  ('Main Store', 'Fatima Khan',    'branch.mainstore@homiqlo.co'),
  ('Branch 2',   'Ganesh Pillai',  'branch.branch2@homiqlo.co'),
  ('Branch 3',   'Leela Menon',    'branch.branch3@homiqlo.co'),
  ('Warehouse',  'Devendra Rao',   'branch.warehouse@homiqlo.co')
on conflict (branch) do update set
  admin_name  = excluded.admin_name,
  admin_email = excluded.admin_email;

-- 5. RLS: demo-grade read-only for anon + authenticated on branch_admins.
alter table branch_admins enable row level security;
drop policy if exists branch_admins_read on branch_admins;
create policy branch_admins_read on branch_admins
  for select to anon, authenticated using (true);
