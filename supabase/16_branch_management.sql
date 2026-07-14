-- HOMIQLO — Branch management write policies
-- Run this SIXTEENTH, after 12_branch_authority.sql (which creates branch_admins
-- and mirrors office_locations from branches).
--
-- WHY: the Super Admin can now create/edit/delete branches from the app
-- (Settings → Branches). Runtime branch CRUD writes to `branches`, mirrors the
-- row into `office_locations` (the app does the mirroring itself — no trigger),
-- and optionally records the branch admin in `branch_admins`. Those three
-- tables were read-only until now.
--
-- Safe to re-run. ⚠️ DEMO-GRADE policies (anon + authenticated, unrestricted),
-- consistent with the rest of the repo. Tighten before production.

-- branches ---------------------------------------------------------------------
drop policy if exists branches_insert on branches;
create policy branches_insert on branches
  for insert to anon, authenticated with check (true);

drop policy if exists branches_update on branches;
create policy branches_update on branches
  for update to anon, authenticated using (true) with check (true);

drop policy if exists branches_delete on branches;
create policy branches_delete on branches
  for delete to anon, authenticated using (true);

-- office_locations (mirror of branches; employee check-in reads this) -----------
drop policy if exists office_locations_insert on office_locations;
create policy office_locations_insert on office_locations
  for insert to anon, authenticated with check (true);

drop policy if exists office_locations_update on office_locations;
create policy office_locations_update on office_locations
  for update to anon, authenticated using (true) with check (true);

drop policy if exists office_locations_delete on office_locations;
create policy office_locations_delete on office_locations
  for delete to anon, authenticated using (true);

-- branch_admins (branch → admin assignment) -------------------------------------
drop policy if exists branch_admins_insert on branch_admins;
create policy branch_admins_insert on branch_admins
  for insert to anon, authenticated with check (true);

drop policy if exists branch_admins_update on branch_admins;
create policy branch_admins_update on branch_admins
  for update to anon, authenticated using (true) with check (true);

drop policy if exists branch_admins_delete on branch_admins;
create policy branch_admins_delete on branch_admins
  for delete to anon, authenticated using (true);

-- 2. Junction-table write policies ----------------------------------------------
-- Branch-scoped sessions dual-write: every create lands in the global table
-- (super admin "All Branches" view) AND the `_branches` row (their own branch
-- view). The junctions were read-only until now.
do $$
declare t text;
begin
  foreach t in array array[
    'category_branches','stock_inward_branches','stock_outward_branches',
    'stock_history_branches','inventory_reports_branches',
    'billing_sales_bills_branches','billing_payments_branches',
    'billing_refunds_branches','billing_tax_invoices_branches',
    'billing_reports_branches','pos_transactions_branches','reports_branches'
  ]
  loop
    execute format('drop policy if exists %I on %I;', t || '_insert', t);
    execute format(
      'create policy %I on %I for insert to anon, authenticated with check (true);',
      t || '_insert', t
    );
    execute format('drop policy if exists %I on %I;', t || '_update', t);
    execute format(
      'create policy %I on %I for update to anon, authenticated using (true) with check (true);',
      t || '_update', t
    );
    execute format('drop policy if exists %I on %I;', t || '_delete', t);
    execute format(
      'create policy %I on %I for delete to anon, authenticated using (true);',
      t || '_delete', t
    );
  end loop;
end $$;

-- 3. live_tracking gains a branch dimension --------------------------------------
-- The Live Attendance page is pinned to the session branch for branch-scoped
-- roles; live_tracking never had a branch column. Backfill from
-- employee_attendance (same EMP0xx employee_id space).
alter table live_tracking add column if not exists branch text;
update live_tracking lt
set branch = ea.branch
from employee_attendance ea
where ea.employee_id = lt.employee_id
  and lt.branch is null;

-- 4. Reports: retire the second branch vocabulary --------------------------------
-- reports_branches referenced report_branches (city outlets: 'Mumbai – Andheri'
-- etc.), a leftover vocabulary that never matched the canonical `branches`
-- list, so branch-pinned report views could never show rows. Repoint the FK at
-- branches(name) and clear the stale city-outlet rows; useReportBranches now
-- reads `branches`. report_branches stays behind, retired.
alter table reports_branches drop constraint if exists reports_branches_branch_fkey;
delete from reports_branches where branch not in (select name from branches);
alter table reports_branches
  add constraint reports_branches_branch_fkey
  foreign key (branch) references branches(name) on delete cascade;
