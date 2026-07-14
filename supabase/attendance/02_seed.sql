-- HOMIQLO — Attendance module seed data
-- Run this SECOND. Populates tables with demo data matching mock fixtures.

truncate table daily_logs cascade;
truncate table employee_attendance cascade;
truncate table late_arrivals cascade;
truncate table absent_records cascade;
truncate table live_tracking cascade;
truncate table attendance_reports cascade;
truncate table shift_configs cascade;
truncate table attendance_settings cascade;
truncate table attendance_dashboard cascade;

-- Daily Logs (Check-ins and Check-outs)
insert into daily_logs (date, employee_id, employee_name, check_in_time, check_out_time, status, branch, location, notes) values
('6 Jul 2026', 'EMP001', 'Rahul Sharma', '09:05 AM', '06:15 PM', 'Present', 'Main Store', 'Gate 1', ''),
('6 Jul 2026', 'EMP002', 'Priya Patel', '09:45 AM', NULL, 'Late', 'Main Store', 'Gate 2', 'Traffic delay'),
('6 Jul 2026', 'EMP003', 'Amit Singh', NULL, NULL, 'Absent', 'Main Store', '', 'Sick leave'),
('6 Jul 2026', 'EMP004', 'Sneha Gupta', '09:00 AM', '06:00 PM', 'Present', 'Branch 2', 'Gate 1', ''),
('6 Jul 2026', 'EMP005', 'Vikram Rao', '08:55 AM', '05:45 PM', 'Present', 'Branch 2', 'Gate 2', ''),
('6 Jul 2026', 'EMP006', 'Anjali Desai', '10:15 AM', NULL, 'Late', 'Main Store', 'Gate 1', 'Appointment'),
('6 Jul 2026', 'EMP007', 'Rohan Verma', NULL, NULL, 'Leave', 'Branch 3', '', 'Casual leave'),
('6 Jul 2026', 'EMP008', 'Deepak Kumar', '09:20 AM', '06:30 PM', 'Present', 'Branch 3', 'Gate 1', ''),
('6 Jul 2026', 'EMP009', 'Pooja Sharma', '09:10 AM', '05:50 PM', 'Present', 'Main Store', 'Gate 2', ''),
('6 Jul 2026', 'EMP010', 'Arjun Singh', '09:55 AM', NULL, 'Late', 'Main Store', 'Gate 1', 'Car trouble');

-- Employee Attendance Summary
insert into employee_attendance (id, employee_id, employee_name, designation, branch, total_present, total_absent, total_late, total_leave, attendance_percentage, last_check_in) values
('ATT001', 'EMP001', 'Rahul Sharma', 'Manager', 'Main Store', 22, 1, 2, 0, '91.67%', '09:05 AM'),
('ATT002', 'EMP002', 'Priya Patel', 'Senior Executive', 'Main Store', 19, 2, 4, 0, '79.17%', '09:45 AM'),
('ATT003', 'EMP003', 'Amit Singh', 'Executive', 'Main Store', 20, 3, 2, 0, '83.33%', NULL),
('ATT004', 'EMP004', 'Sneha Gupta', 'Coordinator', 'Branch 2', 23, 0, 2, 0, '95.83%', '09:00 AM'),
('ATT005', 'EMP005', 'Vikram Rao', 'Officer', 'Branch 2', 22, 1, 2, 0, '91.67%', '08:55 AM'),
('ATT006', 'EMP006', 'Anjali Desai', 'Manager', 'Main Store', 18, 2, 5, 0, '75.00%', '10:15 AM'),
('ATT007', 'EMP007', 'Rohan Verma', 'Executive', 'Branch 3', 21, 1, 1, 2, '87.50%', NULL),
('ATT008', 'EMP008', 'Deepak Kumar', 'Senior Officer', 'Branch 3', 24, 0, 1, 0, '96.00%', '09:20 AM'),
('ATT009', 'EMP009', 'Pooja Sharma', 'Executive', 'Main Store', 23, 1, 1, 0, '95.83%', '09:10 AM'),
('ATT010', 'EMP010', 'Arjun Singh', 'Coordinator', 'Main Store', 19, 3, 3, 0, '79.17%', '09:55 AM');

-- Late Arrivals
insert into late_arrivals (date, employee_id, employee_name, check_in_time, lateness_minutes, branch, status) values
('6 Jul 2026', 'EMP002', 'Priya Patel', '09:45 AM', 45, 'Main Store', 'Late'),
('6 Jul 2026', 'EMP006', 'Anjali Desai', '10:15 AM', 75, 'Main Store', 'Late'),
('6 Jul 2026', 'EMP010', 'Arjun Singh', '09:55 AM', 55, 'Main Store', 'Late'),
('5 Jul 2026', 'EMP002', 'Priya Patel', '09:50 AM', 50, 'Main Store', 'Late'),
('5 Jul 2026', 'EMP003', 'Amit Singh', '10:10 AM', 70, 'Main Store', 'Late'),
('4 Jul 2026', 'EMP006', 'Anjali Desai', '10:20 AM', 80, 'Main Store', 'Late');

-- Absent Records
insert into absent_records (date, employee_id, employee_name, designation, branch, leave_type, reason, status) values
('6 Jul 2026', 'EMP003', 'Amit Singh', 'Executive', 'Main Store', 'Sick', 'Health issues', 'Absent'),
('5 Jul 2026', 'EMP007', 'Rohan Verma', 'Executive', 'Branch 3', 'Casual', 'Personal work', 'Absent'),
('4 Jul 2026', 'EMP002', 'Priya Patel', 'Senior Executive', 'Main Store', 'Personal', 'Doctor appointment', 'Absent'),
('3 Jul 2026', 'EMP001', 'Rahul Sharma', 'Manager', 'Main Store', 'Sick', 'Fever', 'Absent'),
('2 Jul 2026', 'EMP010', 'Arjun Singh', 'Coordinator', 'Main Store', 'Personal', 'Emergency', 'Absent');

-- Live Tracking (Current Real-time Status)
insert into live_tracking (employee_id, employee_name, designation, check_in_time, current_status, location, temperature, last_location, gps_verified, photo_verified) values
('EMP001', 'Rahul Sharma', 'Manager', '09:05 AM', 'Present', 'Floor - Main Store', '37.2°C', 'Meeting Room 1', true, true),
('EMP002', 'Priya Patel', 'Senior Executive', '09:45 AM', 'Present', 'Cubicle A-5 (Main Store)', '36.8°C', 'Break Room', true, true),
('EMP004', 'Sneha Gupta', 'Coordinator', '09:00 AM', 'Present', 'Floor - Branch 2', '37.1°C', 'Storage Area', true, true),
('EMP005', 'Vikram Rao', 'Officer', '08:55 AM', 'Present', 'Office - Branch 2', '36.9°C', 'Meeting Room', true, true),
('EMP008', 'Deepak Kumar', 'Senior Officer', '09:20 AM', 'Present', 'Floor - Branch 3', '37.0°C', 'Checkout Area', true, true),
('EMP009', 'Pooja Sharma', 'Executive', '09:10 AM', 'Present', 'Cubicle B-3 (Main Store)', '36.7°C', 'Cafeteria', true, true);

-- Attendance Reports
insert into attendance_reports (report_name, period, generated_on, format, status) values
('Monthly Attendance Summary', 'June 2026', '6 Jul 2026 02:15 PM', 'PDF', 'Ready'),
('Branch-wise Attendance', 'June 2026', '5 Jul 2026 03:45 PM', 'Excel', 'Ready'),
('Department Wise Analysis', 'June 2026', '4 Jul 2026 10:30 AM', 'PDF', 'Ready'),
('Employee Attendance Trends', 'Q2 2026', '1 Jul 2026 09:00 AM', 'Excel', 'Ready'),
('Late Arrival Report', 'June 2026', '6 Jul 2026 01:00 PM', 'PDF', 'Ready');

-- Shift Configurations
insert into shift_configs (shift_name, start_time, end_time, grace_period_minutes, geofence_radius, requires_gps, requires_photo, applicable_days) values
('Morning Shift', '09:00 AM', '06:00 PM', 15, 500, true, true, 'Monday - Friday'),
('Evening Shift', '01:00 PM', '10:00 PM', 15, 500, true, true, 'Monday - Friday'),
('Night Shift', '09:00 PM', '06:00 AM', 15, 500, true, true, 'Tuesday - Saturday'),
('Weekend Shift', '11:00 AM', '08:00 PM', 20, 500, false, true, 'Saturday - Sunday');

-- Attendance Settings
insert into attendance_settings (name, type, value, description) values
('Geofence Radius', 'distance', '500', 'Geofence radius in meters for location verification'),
('Grace Period', 'time', '15', 'Grace period in minutes before marking late'),
('GPS Required', 'boolean', 'true', 'Require GPS verification for check-in'),
('Photo Required', 'boolean', 'true', 'Require photo verification for check-in'),
('Temperature Check', 'boolean', 'false', 'Require temperature check during check-in'),
('Max Late Limit', 'time', '60', 'Maximum allowed lateness in minutes before absence'),
('Work Hours Per Day', 'time', '480', 'Standard work hours per day in minutes');

-- Dashboard Summary
insert into attendance_dashboard (id, data) values (1, '{
  "stats": {
    "totalEmployees": 10,
    "presentToday": 7,
    "absentToday": 2,
    "lateToday": 3,
    "averageAttendance": "88.5%",
    "onLeave": 1
  },
  "recentLateArrivals": [
    {"employeeId": "EMP010", "employeeName": "Arjun Singh", "checkInTime": "09:55 AM", "latenessMinutes": 55, "branch": "Main Store"},
    {"employeeId": "EMP006", "employeeName": "Anjali Desai", "checkInTime": "10:15 AM", "latenessMinutes": 75, "branch": "Main Store"},
    {"employeeId": "EMP002", "employeeName": "Priya Patel", "checkInTime": "09:45 AM", "latenessMinutes": 45, "branch": "Main Store"}
  ],
  "departmentAttendance": [
    {"department": "Sales", "percentage": "90.5%"},
    {"department": "Operations", "percentage": "89.0%"},
    {"department": "HR", "percentage": "95.0%"},
    {"department": "Finance", "percentage": "87.5%"}
  ]
}'::jsonb);
