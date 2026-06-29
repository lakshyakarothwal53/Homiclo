-- HOMIQLO — Reports seed data (mirrors src/components/reports/data.ts)
-- Run this SECOND, after 01_schema.sql. Safe to re-run.

truncate reports;

insert into reports (id, category, name, type, period, generated, size) values
  -- Sales
  ('s1', 'sales', 'Daily Sales Summary',  'Daily',     '12 Nov 2024', '12 Nov', '124 KB'),
  ('s2', 'sales', 'Monthly Sales Report', 'Monthly',   'Nov 2024',    '12 Nov', '2.4 MB'),
  ('s3', 'sales', 'Product-wise Sales',   'Monthly',   'Nov 2024',    '12 Nov', '1.1 MB'),
  ('s4', 'sales', 'Branch Performance',   'Quarterly', 'Q3 2024',     '01 Oct', '3.2 MB'),
  -- Attendance
  ('a1', 'attendance', 'Monthly Attendance',   'Monthly', 'Nov 2024', '12 Nov', '890 KB'),
  ('a2', 'attendance', 'Late Arrival Summary', 'Weekly',  'Week 46',  '11 Nov', '124 KB'),
  ('a3', 'attendance', 'Absenteeism Report',   'Monthly', 'Nov 2024', '12 Nov', '210 KB'),
  -- Employee
  ('e1', 'employee', 'Employee Master List', 'All',       '12 Nov 2024', '12 Nov', '420 KB'),
  ('e2', 'employee', 'Performance Review',   'Quarterly', 'Q3 2024',     '01 Oct', '1.4 MB'),
  ('e3', 'employee', 'Login Activity',       'Weekly',    'Week 46',     '11 Nov', '320 KB'),
  -- Inventory
  ('i1', 'inventory', 'Stock Valuation',   'Monthly',   'Nov 2024', '12 Nov', '680 KB'),
  ('i2', 'inventory', 'Fast Moving Items', 'Quarterly', 'Q3 2024',  '01 Oct', '420 KB'),
  ('i3', 'inventory', 'Stock Ageing',      'Monthly',   'Nov 2024', '12 Nov', '510 KB'),
  -- Discount
  ('d1', 'discount', 'Campaign ROI',   'Monthly', 'Nov 2024', '12 Nov', '224 KB'),
  ('d2', 'discount', 'Discount Usage', 'Monthly', 'Nov 2024', '12 Nov', '180 KB'),
  -- Financial
  ('f1', 'financial', 'Profit & Loss',     'Monthly', 'Nov 2024', '12 Nov', '890 KB'),
  ('f2', 'financial', 'Cash Flow',         'Monthly', 'Nov 2024', '12 Nov', '620 KB'),
  ('f3', 'financial', 'Tax Summary (GST)', 'Monthly', 'Nov 2024', '12 Nov', '410 KB');
