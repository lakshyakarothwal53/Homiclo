-- HOMIQLO — Employee Geofenced Check-in System
-- Run this FOURTH after RLS policies
-- Adds tables for employee self-service check-in with GPS geofence validation

-- Office Locations Configuration
create table if not exists office_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch text not null unique,
  latitude numeric not null,
  longitude numeric not null,
  radius_meters integer not null default 50,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Employee Check-ins (Self-service with GPS)
create table if not exists employee_checkins (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null,
  employee_name text not null,
  branch text not null,
  check_date text not null,
  check_type text not null, -- 'check-in' or 'check-out'
  check_time text not null,
  latitude numeric,
  longitude numeric,
  geofence_verified boolean default false,
  distance_from_office_m numeric,
  geofence_error_message text,
  status text not null default 'success', -- 'success', 'outside_geofence', 'gps_error'
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Employee Monthly Attendance Summary
create table if not exists employee_monthly_summary (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null,
  employee_name text not null,
  branch text not null,
  year integer not null,
  month integer not null,
  working_days integer not null default 0,
  present_days integer not null default 0,
  absent_days integer not null default 0,
  late_days integer not null default 0,
  leave_days integer not null default 0,
  attendance_percentage text not null default '0%',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, year, month)
);

-- Helper function to calculate distance between two GPS points (Haversine formula)
create or replace function calculate_distance(
  lat1 numeric, lon1 numeric,
  lat2 numeric, lon2 numeric
) returns numeric as $$
declare
  r numeric := 6371000; -- Earth radius in meters
  phi1 numeric;
  phi2 numeric;
  delta_phi numeric;
  delta_lambda numeric;
  a numeric;
  c numeric;
begin
  phi1 := lat1 * pi() / 180.0;
  phi2 := lat2 * pi() / 180.0;
  delta_phi := (lat2 - lat1) * pi() / 180.0;
  delta_lambda := (lon2 - lon1) * pi() / 180.0;

  a := sin(delta_phi / 2.0) * sin(delta_phi / 2.0) +
       cos(phi1) * cos(phi2) *
       sin(delta_lambda / 2.0) * sin(delta_lambda / 2.0);

  c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));

  return r * c;
end;
$$ language plpgsql immutable;

-- Indexes for performance
create index if not exists idx_employee_checkins_employee_id on employee_checkins(employee_id);
create index if not exists idx_employee_checkins_check_date on employee_checkins(check_date);
create index if not exists idx_employee_checkins_branch on employee_checkins(branch);
create index if not exists idx_employee_monthly_summary_employee_id on employee_monthly_summary(employee_id);
create index if not exists idx_employee_monthly_summary_year_month on employee_monthly_summary(year, month);
create index if not exists idx_office_locations_branch on office_locations(branch);
