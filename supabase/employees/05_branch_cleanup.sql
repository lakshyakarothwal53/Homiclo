-- HOMIQLO employees — orphaned branch cleanup
-- Run AFTER supabase/employees/04_add_password.sql.
--
-- WHY: branches were deleted directly in the database at some point,
-- bypassing useDeleteBranch()'s app-level office_locations cleanup, which
-- never checked for dependent employees either. This left 14 employees and
-- 8 office_locations rows pointing at branches that no longer exist.
-- Safe to re-run: every delete is keyed off "doesn't match a current
-- branches row", so once clean a second run deletes nothing.

-- 1. Delete employee_checkins for employees whose branch no longer exists.
--    MUST run before deleting the employees rows below: employee_checkins.
--    employee_id has no foreign key, so it is not cleaned up automatically.
delete from employee_checkins
where employee_id in (
  select id::text from employees where branch not in (select name from branches)
);

-- 2. Delete the orphaned employees. employee_logins, employee_activity, and
--    employee_locations all reference employees.id with ON DELETE CASCADE,
--    so they're cleaned up automatically here.
delete from employees
where branch not in (select name from branches);

-- 3. Delete stale office_locations rows with no matching current branch.
delete from office_locations
where branch not in (select name from branches);

-- 4. Prevent this recurring: an employee can never reference a nonexistent
--    branch, and a branch can't be deleted while employees still use it.
alter table employees
  drop constraint if exists employees_branch_fkey;
alter table employees
  add constraint employees_branch_fkey
  foreign key (branch) references branches(name) on delete restrict;
