-- HOMIQLO attendance — leave-request report row + per-branch report rows
-- Run AFTER supabase/attendance/09_leave_approval.sql. Safe to re-run.
--
-- WHY (two separate gaps):
--
-- 1. There was no report row whose name routes to the leave-request dataset,
--    so the approval status of leave requests was only reachable indirectly
--    via "Absenteeism Report". This adds a first-class "Leave Requests" row
--    (fetchNamedReport matches /leave/ → fetchLeaveRequestReport).
--
-- 2. useReports() reads `reports` for Super Admin but `reports_branches` for
--    every branch-scoped role. reports_branches had NO attendance rows at all,
--    so a Branch Admin's Reports → Attendance page rendered completely empty.
--    This mirrors each attendance report into every active branch.

-- 1. The leave-request report (global list).
delete from reports where category = 'attendance' and name = 'Leave Requests';
insert into reports (id, category, name, type, period, generated, size)
values (
  'a4',
  'attendance',
  'Leave Requests',
  'Monthly',
  to_char(now(), 'Mon YYYY'),
  to_char(now(), 'DD Mon'),
  '—'
);

-- 2. Mirror every attendance report into each active branch so branch-scoped
--    sessions see the same report list. Rebuilt from `reports` each run, so
--    re-running keeps the two tables in sync rather than duplicating rows.
delete from reports_branches where category = 'attendance';
insert into reports_branches (id, branch, category, name, type, period, generated, size)
select
  r.id || '-' || lower(replace(b.name, ' ', '-')),
  b.name,
  r.category,
  r.name,
  r.type,
  r.period,
  r.generated,
  r.size
from reports r
cross join branches b
where r.category = 'attendance'
  and b.is_active;
