-- HOMIQLO — Attendance: allow deleting a report row
-- Run this ELEVENTH (after 10_leave_report_rows.sql).
--
-- Why: attendance_reports had read + insert policies (03_rls.sql) but no
-- delete policy, so the "Delete" action on the Attendance Reports page would
-- silently fail under RLS (0 rows affected, no error surfaced by Supabase).
--
-- Safe to re-run.

drop policy if exists attendance_reports_delete on attendance_reports;
create policy attendance_reports_delete on attendance_reports
  for delete to anon, authenticated
  using (true);
