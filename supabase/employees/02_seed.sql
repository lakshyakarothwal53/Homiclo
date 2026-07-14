-- Seed employees module with demo data

truncate employees, employee_logins, employee_activity, employee_locations, employee_reports cascade;

insert into employees (name, email, phone, role, branch, join_date, status, salary) values
('Priya Nair', 'priya.nair@homiqlo.com', '9876543210', 'Cashier', 'Bandra', '12 Jan 2022', 'Active', '₹ 2,50,000'),
('Arjun Kapoor', 'arjun.kapoor@homiqlo.com', '9876543211', 'Floor Manager', 'Andheri', '8 Mar 2021', 'Active', '₹ 4,50,000'),
('Neha Singh', 'neha.singh@homiqlo.com', '9876543212', 'Inventory', 'Powai', '15 Jun 2022', 'Active', '₹ 2,80,000'),
('Rohan Das', 'rohan.das@homiqlo.com', '9876543213', 'Cashier', 'Worli', '22 Feb 2023', 'Active', '₹ 2,50,000'),
('Sara Khan', 'sara.khan@homiqlo.com', '9876543214', 'Cashier', 'Bandra', '5 Nov 2022', 'Active', '₹ 2,50,000'),
('Vikram Rao', 'vikram.rao@homiqlo.com', '9876543215', 'Supervisor', 'Fort', '10 Jan 2020', 'Active', '₹ 3,50,000'),
('Meera Joshi', 'meera.joshi@homiqlo.com', '9876543216', 'Floor Manager', 'Dadar', '18 Apr 2021', 'Active', '₹ 4,50,000'),
('Karan Mehta', 'karan.mehta@homiqlo.com', '9876543217', 'Inventory', 'Bandra', '25 Jul 2022', 'Active', '₹ 2,80,000'),
('Anaya Iyer', 'anaya.iyer@homiqlo.com', '9876543218', 'Admin', 'Fort', '3 Sep 2020', 'Active', '₹ 5,00,000'),
('Ravi Patel', 'ravi.patel@homiqlo.com', '9876543219', 'Cashier', 'Andheri', '14 Dec 2022', 'Active', '₹ 2,50,000'),
('Divya Sharma', 'divya.sharma@homiqlo.com', '9876543220', 'Supervisor', 'Powai', '9 May 2021', 'Active', '₹ 3,50,000'),
('Ajay Kumar', 'ajay.kumar@homiqlo.com', '9876543221', 'Floor Manager', 'Worli', '20 Aug 2021', 'Inactive', '₹ 4,50,000');

insert into employee_logins (employee_id, employee_name, employee_role, branch, login_time, logout_time, duration, status, last_seen) values
((select id from employees where email = 'priya.nair@homiqlo.com'), 'Priya Nair', 'Cashier · Bandra', 'Bandra', '09:15 AM', null, null, 'online', '2 mins ago'),
((select id from employees where email = 'arjun.kapoor@homiqlo.com'), 'Arjun Kapoor', 'Floor Manager · Andheri', 'Andheri', '08:45 AM', null, null, 'online', 'now'),
((select id from employees where email = 'neha.singh@homiqlo.com'), 'Neha Singh', 'Inventory · Powai', 'Powai', '08:30 AM', null, null, 'idle', '15 mins ago'),
((select id from employees where email = 'rohan.das@homiqlo.com'), 'Rohan Das', 'Cashier · Worli', 'Worli', '09:00 AM', '05:30 PM', '8h 30m', 'offline', '2 hours ago'),
((select id from employees where email = 'sara.khan@homiqlo.com'), 'Sara Khan', 'Cashier · Bandra', 'Bandra', '09:30 AM', null, null, 'online', '30 secs ago'),
((select id from employees where email = 'vikram.rao@homiqlo.com'), 'Vikram Rao', 'Supervisor · Fort', 'Fort', '08:00 AM', null, null, 'online', '1 min ago'),
((select id from employees where email = 'meera.joshi@homiqlo.com'), 'Meera Joshi', 'Floor Manager · Dadar', 'Dadar', '09:00 AM', null, null, 'online', '5 mins ago'),
((select id from employees where email = 'karan.mehta@homiqlo.com'), 'Karan Mehta', 'Inventory · Bandra', 'Bandra', '08:45 AM', null, null, 'idle', '20 mins ago'),
((select id from employees where email = 'anaya.iyer@homiqlo.com'), 'Anaya Iyer', 'Admin · Fort', 'Fort', '08:30 AM', null, null, 'online', '3 mins ago'),
((select id from employees where email = 'ravi.patel@homiqlo.com'), 'Ravi Patel', 'Cashier · Andheri', 'Andheri', '09:15 AM', null, null, 'online', 'now');

insert into employee_activity (employee_id, employee_name, branch, activity, timestamp, details) values
((select id from employees where email = 'priya.nair@homiqlo.com'), 'Priya Nair', 'Bandra', 'Cash In', '10:30 AM', 'Opening Cash: ₹ 5,000'),
((select id from employees where email = 'arjun.kapoor@homiqlo.com'), 'Arjun Kapoor', 'Andheri', 'Stock Verification', '09:00 AM', 'Verified 45 SKUs'),
((select id from employees where email = 'neha.singh@homiqlo.com'), 'Neha Singh', 'Powai', 'Inventory Adjustment', '10:15 AM', 'Adjusted 12 items'),
((select id from employees where email = 'sara.khan@homiqlo.com'), 'Sara Khan', 'Bandra', 'Sales Transaction', '10:45 AM', 'Amount: ₹ 8,500'),
((select id from employees where email = 'vikram.rao@homiqlo.com'), 'Vikram Rao', 'Fort', 'Daily Report', '10:00 AM', 'Generated sales report'),
((select id from employees where email = 'meera.joshi@homiqlo.com'), 'Meera Joshi', 'Dadar', 'Customer Inquiry', '10:20 AM', 'Handled product inquiry');

insert into employee_locations (employee_id, employee_name, branch, latitude, longitude, address, timestamp, accuracy) values
((select id from employees where email = 'priya.nair@homiqlo.com'), 'Priya Nair', 'Bandra', 19.0596, 72.8295, '123 Linking Road, Bandra, Mumbai', '10:50 AM', '±5m'),
((select id from employees where email = 'arjun.kapoor@homiqlo.com'), 'Arjun Kapoor', 'Andheri', 19.1136, 72.8697, '456 Veera Desai Ave, Andheri, Mumbai', '10:52 AM', '±8m'),
((select id from employees where email = 'neha.singh@homiqlo.com'), 'Neha Singh', 'Powai', 19.1092, 72.9019, '789 Powai Park, Powai, Mumbai', '10:48 AM', '±6m'),
((select id from employees where email = 'sara.khan@homiqlo.com'), 'Sara Khan', 'Bandra', 19.0576, 72.8292, '321 Hill Road, Bandra, Mumbai', '10:51 AM', '±5m'),
((select id from employees where email = 'vikram.rao@homiqlo.com'), 'Vikram Rao', 'Fort', 18.9667, 72.8300, '654 Fort Market, Fort, Mumbai', '10:49 AM', '±7m'),
((select id from employees where email = 'meera.joshi@homiqlo.com'), 'Meera Joshi', 'Dadar', 19.0176, 72.8479, '987 Station Road, Dadar, Mumbai', '10:47 AM', '±6m');

insert into employee_reports (report, period, generated, status) values
('Attendance Summary', 'Jul 2026', '2 hours ago', 'Available'),
('Sales Performance', 'Jul 2026', '1 day ago', 'Available'),
('Activity Report', 'Jul 2026', '3 days ago', 'Available'),
('Monthly Payroll', 'Jun 2026', '5 days ago', 'Available'),
('Performance Review', 'Q2 2026', 'Last week', 'Available');
