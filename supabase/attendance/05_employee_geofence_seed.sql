-- HOMIQLO — Employee Geofence Seed Data
-- Run this FIFTH after the geofence schema is created
-- Populates office locations and sample check-ins

-- Office Locations (with sample coordinates)
-- Using real office locations as examples
truncate table office_locations cascade;

insert into office_locations (name, branch, latitude, longitude, radius_meters, address) values
('Mumbai HQ', 'Mumbai HQ', 19.0760, 72.8777, 50, 'Mumbai, Maharashtra'),
('Worli Branch', 'Worli', 19.0176, 72.8194, 50, 'Worli, Mumbai'),
('Bandra Branch', 'Bandra', 19.0596, 72.8295, 50, 'Bandra, Mumbai'),
('Main Store', 'Main Store', 19.0827, 72.8857, 50, 'Andheri, Mumbai'),
('Branch 2', 'Branch 2', 19.1136, 72.8697, 50, 'Thane, Maharashtra'),
('Branch 3', 'Branch 3', 19.0176, 72.9781, 50, 'Airoli, Navi Mumbai'),
('Warehouse', 'Warehouse', 19.2183, 72.9781, 50, 'Navi Mumbai, Maharashtra');

-- Sample Employee Check-ins for current month (July 2026)
truncate table employee_checkins cascade;

insert into employee_checkins (employee_id, employee_name, branch, check_date, check_type, check_time, latitude, longitude, geofence_verified, distance_from_office_m, status, notes) values
-- EMP001 - Rahul Sharma (Inside geofence)
('EMP001', 'Rahul Sharma', 'Main Store', '2026-07-06', 'check-in', '09:05 AM', 19.0827, 72.8857, true, 15.2, 'success', NULL),
('EMP001', 'Rahul Sharma', 'Main Store', '2026-07-06', 'check-out', '06:15 PM', 19.0827, 72.8857, true, 14.8, 'success', NULL),

-- EMP002 - Priya Patel (Outside geofence)
('EMP002', 'Priya Patel', 'Main Store', '2026-07-06', 'check-in', '09:45 AM', 19.0730, 72.8890, false, 12.5, 'outside_geofence', 'Traffic delay - too far from office'),

-- EMP003 - Amit Singh (Absent)
-- No check-in (Sick leave)

-- EMP004 - Sneha Gupta (Inside geofence)
('EMP004', 'Sneha Gupta', 'Branch 2', '2026-07-06', 'check-in', '09:00 AM', 19.1136, 72.8697, true, 18.5, 'success', NULL),
('EMP004', 'Sneha Gupta', 'Branch 2', '2026-07-06', 'check-out', '06:00 PM', 19.1136, 72.8697, true, 16.3, 'success', NULL),

-- EMP005 - Vikram Rao (Inside geofence)
('EMP005', 'Vikram Rao', 'Branch 2', '2026-07-06', 'check-in', '08:55 AM', 19.1136, 72.8697, true, 20.1, 'success', NULL),
('EMP005', 'Vikram Rao', 'Branch 2', '2026-07-06', 'check-out', '05:45 PM', 19.1136, 72.8697, true, 19.8, 'success', NULL),

-- EMP006 - Anjali Desai (Outside geofence - appointment)
('EMP006', 'Anjali Desai', 'Main Store', '2026-07-06', 'check-in', '10:15 AM', 19.0500, 72.8500, false, 42.3, 'outside_geofence', 'Doctor appointment'),

-- EMP007 - Rohan Verma (On leave)
-- No check-in

-- EMP008 - Deepak Kumar (Inside geofence)
('EMP008', 'Deepak Kumar', 'Branch 3', '2026-07-06', 'check-in', '09:20 AM', 19.0176, 72.9781, true, 22.4, 'success', NULL),
('EMP008', 'Deepak Kumar', 'Branch 3', '2026-07-06', 'check-out', '06:30 PM', 19.0176, 72.9781, true, 21.9, 'success', NULL),

-- EMP009 - Pooja Sharma (Inside geofence)
('EMP009', 'Pooja Sharma', 'Main Store', '2026-07-06', 'check-in', '09:10 AM', 19.0827, 72.8857, true, 11.3, 'success', NULL),
('EMP009', 'Pooja Sharma', 'Main Store', '2026-07-06', 'check-out', '05:50 PM', 19.0827, 72.8857, true, 12.1, 'success', NULL),

-- EMP010 - Arjun Singh (Outside geofence - car trouble)
('EMP010', 'Arjun Singh', 'Main Store', '2026-07-06', 'check-in', '09:55 AM', 19.0700, 72.8900, false, 35.7, 'outside_geofence', 'Car trouble'),

-- Previous days sample data (July 5, 2026)
('EMP001', 'Rahul Sharma', 'Main Store', '2026-07-05', 'check-in', '09:02 AM', 19.0827, 72.8857, true, 16.1, 'success', NULL),
('EMP001', 'Rahul Sharma', 'Main Store', '2026-07-05', 'check-out', '06:20 PM', 19.0827, 72.8857, true, 15.5, 'success', NULL),
('EMP004', 'Sneha Gupta', 'Branch 2', '2026-07-05', 'check-in', '09:01 AM', 19.1136, 72.8697, true, 19.2, 'success', NULL),
('EMP004', 'Sneha Gupta', 'Branch 2', '2026-07-05', 'check-out', '06:05 PM', 19.1136, 72.8697, true, 17.8, 'success', NULL),
('EMP008', 'Deepak Kumar', 'Branch 3', '2026-07-05', 'check-in', '09:15 AM', 19.0176, 72.9781, true, 23.1, 'success', NULL),
('EMP008', 'Deepak Kumar', 'Branch 3', '2026-07-05', 'check-out', '06:25 PM', 19.0176, 72.9781, true, 22.6, 'success', NULL),

-- More days for monthly summary calculation
('EMP001', 'Rahul Sharma', 'Main Store', '2026-07-04', 'check-in', '09:00 AM', 19.0827, 72.8857, true, 14.9, 'success', NULL),
('EMP001', 'Rahul Sharma', 'Main Store', '2026-07-04', 'check-out', '06:10 PM', 19.0827, 72.8857, true, 15.3, 'success', NULL),
('EMP004', 'Sneha Gupta', 'Branch 2', '2026-07-04', 'check-in', '09:05 AM', 19.1136, 72.8697, true, 18.9, 'success', NULL),
('EMP004', 'Sneha Gupta', 'Branch 2', '2026-07-04', 'check-out', '06:00 PM', 19.1136, 72.8697, true, 16.7, 'success', NULL);

-- Employee Monthly Summary for July 2026
truncate table employee_monthly_summary cascade;

insert into employee_monthly_summary (employee_id, employee_name, branch, year, month, working_days, present_days, absent_days, late_days, leave_days, attendance_percentage) values
('EMP001', 'Rahul Sharma', 'Main Store', 2026, 7, 22, 20, 1, 1, 0, '90.9%'),
('EMP002', 'Priya Patel', 'Main Store', 2026, 7, 22, 18, 2, 4, 0, '81.8%'),
('EMP003', 'Amit Singh', 'Main Store', 2026, 7, 22, 19, 3, 2, 0, '86.4%'),
('EMP004', 'Sneha Gupta', 'Branch 2', 2026, 7, 22, 22, 0, 1, 0, '95.5%'),
('EMP005', 'Vikram Rao', 'Branch 2', 2026, 7, 22, 21, 1, 1, 0, '90.9%'),
('EMP006', 'Anjali Desai', 'Main Store', 2026, 7, 22, 17, 2, 4, 0, '77.3%'),
('EMP007', 'Rohan Verma', 'Branch 3', 2026, 7, 22, 20, 1, 1, 2, '86.4%'),
('EMP008', 'Deepak Kumar', 'Branch 3', 2026, 7, 22, 22, 0, 1, 0, '95.5%'),
('EMP009', 'Pooja Sharma', 'Main Store', 2026, 7, 22, 22, 1, 1, 0, '95.5%'),
('EMP010', 'Arjun Singh', 'Main Store', 2026, 7, 22, 18, 3, 3, 0, '81.8%');
