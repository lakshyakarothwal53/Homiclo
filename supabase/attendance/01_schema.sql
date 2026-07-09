-- HOMIQLO — Attendance module schema
-- Run this FIRST in the Supabase SQL editor.
--
-- Column names are snake_case; the TanStack Query hooks in
-- src/hooks/use-attendance.ts alias them back to the camelCase shape that
-- src/types/attendance.ts expects (e.g. employee_name -> employeeName).
--
-- NOTE: Display strings like times, dates, and percentages are stored as TEXT
-- to preserve exact visual parity with mock data.

create table if not exists daily_logs (
  id              uuid primary key default gen_random_uuid(),
  date            text not null,
  employee_id     text not null,
  employee_name   text not null,
  check_in_time   text,
  check_out_time  text,
  status          text not null,
  branch          text not null,
  location        text,
  notes           text
);

create table if not exists employee_attendance (
  id                      text primary key,
  employee_id             text not null unique,
  employee_name           text not null,
  designation             text not null,
  branch                  text not null,
  total_present           integer not null default 0,
  total_absent            integer not null default 0,
  total_late              integer not null default 0,
  total_leave             integer not null default 0,
  attendance_percentage   text not null,
  last_check_in           text
);

create table if not exists late_arrivals (
  id                 uuid primary key default gen_random_uuid(),
  date               text not null,
  employee_id        text not null,
  employee_name      text not null,
  check_in_time      text not null,
  lateness_minutes   integer not null,
  branch             text not null,
  status             text not null
);

create table if not exists absent_records (
  id              uuid primary key default gen_random_uuid(),
  date            text not null,
  employee_id     text not null,
  employee_name   text not null,
  designation     text not null,
  branch          text not null,
  leave_type      text,
  reason          text,
  status          text not null
);

create table if not exists live_tracking (
  id              uuid primary key default gen_random_uuid(),
  employee_id     text not null unique,
  employee_name   text not null,
  designation     text not null,
  check_in_time   text not null,
  current_status  text not null,
  location        text not null,
  temperature     text,
  last_location   text,
  gps_verified    boolean not null default false,
  photo_verified  boolean not null default false,
  updated_at      timestamptz default now()
);

create table if not exists attendance_reports (
  id            uuid primary key default gen_random_uuid(),
  report_name   text not null,
  period        text not null,
  generated_on  text not null,
  format        text not null,
  status        text not null
);

create table if not exists shift_configs (
  id                      uuid primary key default gen_random_uuid(),
  shift_name              text not null unique,
  start_time              text not null,
  end_time                text not null,
  grace_period_minutes    integer not null default 15,
  geofence_radius         integer not null default 500,
  requires_gps            boolean not null default true,
  requires_photo          boolean not null default true,
  applicable_days         text not null
);

create table if not exists attendance_settings (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  type            text not null,
  value           text not null,
  description     text
);

create table if not exists attendance_dashboard (
  id   integer primary key default 1,
  data jsonb not null,
  constraint attendance_dashboard_singleton check (id = 1)
);
