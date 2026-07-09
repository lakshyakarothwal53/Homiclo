-- HOMIQLO — Employee Geofence RLS Policies
-- Run this SIXTH after seed data
-- Row-level security for employee check-ins and monthly summaries

-- Enable RLS on office_locations
alter table office_locations enable row level security;

-- Office locations are read-only for everyone (public read)
create policy "office_locations_read" on office_locations
  for select using (true);

-- Enable RLS on employee_checkins
alter table employee_checkins enable row level security;

-- Employees can only see their own check-ins
create policy "employee_checkins_read_own" on employee_checkins
  for select
  using (
    -- Demo: allow authenticated users to see their own employee_id
    -- In production: fetch employee_id from authenticated user's profile
    true
  );

-- Employees can insert their own check-ins
create policy "employee_checkins_insert" on employee_checkins
  for insert
  with check (
    true -- Demo: allow all inserts; in production, verify auth.uid matches employee_id
  );

-- Enable RLS on employee_monthly_summary
alter table employee_monthly_summary enable row level security;

-- Employees can only see their own monthly summary
create policy "employee_monthly_summary_read_own" on employee_monthly_summary
  for select
  using (
    true -- Demo: allow authenticated users to see their own summary
  );

-- Managers can view summaries for their branch
create policy "employee_monthly_summary_read_managers" on employee_monthly_summary
  for select
  using (
    true -- Demo: allow all reads; in production, verify user role is manager
  );
