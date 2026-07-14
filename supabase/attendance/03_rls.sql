-- HOMIQLO — Attendance module RLS policies
-- Run this THIRD. Enables row-level security and sets demo-grade policies.
--
-- NOTE: These are demo-grade (anon + authenticated can read and write).
-- Before production, scope these to authenticated admins only.

alter table daily_logs enable row level security;
alter table employee_attendance enable row level security;
alter table late_arrivals enable row level security;
alter table absent_records enable row level security;
alter table live_tracking enable row level security;
alter table attendance_reports enable row level security;
alter table shift_configs enable row level security;
alter table attendance_settings enable row level security;
alter table attendance_dashboard enable row level security;

-- Daily Logs policies
create policy daily_logs_read on daily_logs
  for select to anon, authenticated
  using (true);

create policy daily_logs_insert on daily_logs
  for insert to anon, authenticated
  with check (true);

create policy daily_logs_update on daily_logs
  for update to anon, authenticated
  using (true)
  with check (true);

create policy daily_logs_delete on daily_logs
  for delete to anon, authenticated
  using (true);

-- Employee Attendance policies
create policy employee_attendance_read on employee_attendance
  for select to anon, authenticated
  using (true);

create policy employee_attendance_insert on employee_attendance
  for insert to anon, authenticated
  with check (true);

create policy employee_attendance_update on employee_attendance
  for update to anon, authenticated
  using (true)
  with check (true);

-- Late Arrivals policies
create policy late_arrivals_read on late_arrivals
  for select to anon, authenticated
  using (true);

create policy late_arrivals_insert on late_arrivals
  for insert to anon, authenticated
  with check (true);

-- Absent Records policies
create policy absent_records_read on absent_records
  for select to anon, authenticated
  using (true);

create policy absent_records_insert on absent_records
  for insert to anon, authenticated
  with check (true);

-- Live Tracking policies
create policy live_tracking_read on live_tracking
  for select to anon, authenticated
  using (true);

create policy live_tracking_insert on live_tracking
  for insert to anon, authenticated
  with check (true);

create policy live_tracking_update on live_tracking
  for update to anon, authenticated
  using (true)
  with check (true);

-- Attendance Reports policies
create policy attendance_reports_read on attendance_reports
  for select to anon, authenticated
  using (true);

create policy attendance_reports_insert on attendance_reports
  for insert to anon, authenticated
  with check (true);

-- Shift Configs policies
create policy shift_configs_read on shift_configs
  for select to anon, authenticated
  using (true);

create policy shift_configs_insert on shift_configs
  for insert to anon, authenticated
  with check (true);

create policy shift_configs_update on shift_configs
  for update to anon, authenticated
  using (true)
  with check (true);

-- Attendance Settings policies
create policy attendance_settings_read on attendance_settings
  for select to anon, authenticated
  using (true);

create policy attendance_settings_insert on attendance_settings
  for insert to anon, authenticated
  with check (true);

create policy attendance_settings_update on attendance_settings
  for update to anon, authenticated
  using (true)
  with check (true);

-- Dashboard policies
create policy attendance_dashboard_read on attendance_dashboard
  for select to anon, authenticated
  using (true);

create policy attendance_dashboard_update on attendance_dashboard
  for update to anon, authenticated
  using (true)
  with check (true);
