-- HOMIQLO attendance — employee shift assignment
-- Run AFTER supabase/attendance/07_checkin_photo.sql. Already applied live via
-- the Supabase MCP migration tool; kept here so the schema is reproducible.
--
-- WHY: the Add Employee form now assigns each employee to a shift_configs row
-- so the self-service check-in page (employee-checkin.tsx) can restrict
-- check-in/check-out to that employee's own shift window instead of allowing
-- attendance to be marked at any time of day.

alter table employees
  add column if not exists shift_id uuid references shift_configs(id) on delete set null;
