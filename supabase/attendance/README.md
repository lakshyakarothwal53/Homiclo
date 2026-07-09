# Attendance Module SQL

This directory contains the SQL schema, seed data, and RLS policies for the Attendance module in HOMIQLO.

## Run Order

Execute the files in this order in the Supabase SQL editor:

1. **01_schema.sql** — Creates all attendance tables (daily_logs, employee_attendance, late_arrivals, absent_records, live_tracking, attendance_reports, shift_configs, attendance_settings, attendance_dashboard)
2. **02_seed.sql** — Populates the tables with demo data (can be re-run to reset)
3. **03_rls.sql** — Enables row-level security and creates demo-grade read/write policies

## Table Reference

| Table                  | Purpose                              | Primary Key           |
| ---------------------- | ------------------------------------ | --------------------- |
| `daily_logs`           | Check-in and check-out records       | `id (uuid)`           |
| `employee_attendance`  | Per-employee attendance summary      | `id (text)`           |
| `late_arrivals`        | Records of employees arriving late   | `id (uuid)`           |
| `absent_records`       | Absences and leave records           | `id (uuid)`           |
| `live_tracking`        | Real-time presence tracking          | `id (uuid)`           |
| `attendance_reports`   | Generated reports                    | `id (uuid)`           |
| `shift_configs`        | Shift time and verification settings | `id (uuid)`           |
| `attendance_settings`  | System configuration                 | `id (uuid)`           |
| `attendance_dashboard` | Singleton dashboard aggregates       | `id (int, default 1)` |

## Hooks

All data is accessed via TanStack Query hooks in `src/hooks/use-attendance.ts`:

- `useAttendanceDashboard()` — Dashboard stats and summaries
- `useDailyLogs(search?)` — Check-in/check-out records
- `useEmployeeAttendance(search?)` — Per-employee summary
- `useLateArrivals(search?)` — Late arrival records
- `useAbsentRecords(search?)` — Absence records
- `useLiveTracking(search?)` — Real-time tracking
- `useAttendanceReports(search?)` — Report list
- `useShiftConfigs(search?)` — Shift configurations
- `useAttendanceSettings(search?)` — System settings

## Notes

- **Display strings as TEXT**: All times, dates, and percentages are stored as formatted strings for UI parity (e.g. "09:05 AM", "6 Jul 2026", "91.67%")
- **RLS policies are demo-grade**: Currently allow anon + authenticated read/write. Before production, scope writes to authenticated admins only.
- **Seed is re-runnable**: The 02_seed.sql file truncates before inserting, so it can be run again to reset demo data.
