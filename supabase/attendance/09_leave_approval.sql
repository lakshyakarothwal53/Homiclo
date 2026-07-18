-- HOMIQLO attendance — leave request approval
-- Run AFTER supabase/attendance/08_shift_assignment.sql.
--
-- WHY: employees self-apply for leave from their check-in page
-- (useApplyLeaveRequest), which inserts an absent_records row with
-- status = 'Pending'. Approving/declining that request is an UPDATE, but
-- 03_rls.sql only ever created SELECT + INSERT policies for absent_records —
-- so every approval was silently rejected by RLS with no error surfaced.
-- These policies make the Absent Report's Approve/Decline actions work.

-- Dropped first so this file is safe to re-run (matches 07_checkin_photo.sql).
drop policy if exists absent_records_update on absent_records;
create policy absent_records_update on absent_records
  for update to anon, authenticated
  using (true)
  with check (true);

drop policy if exists absent_records_delete on absent_records;
create policy absent_records_delete on absent_records
  for delete to anon, authenticated
  using (true);
