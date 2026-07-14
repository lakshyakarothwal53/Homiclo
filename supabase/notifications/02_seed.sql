truncate notifications;

insert into notifications (id, category, title, description, time, tone, icon_name) values
  -- All-alerts dashboard feed
  ('a1', 'all', 'Critical: Leather Wallet out of stock',          'SKU-2404 has 0 units remaining. Reorder immediately.',   '5 min ago',   'danger',  'AlertTriangle'),
  ('a2', 'all', 'Late arrival: Arjun Verma',                      'Arrived at 09:31 AM, 31 minutes late.',                  '32 min ago',  'warning', 'Clock'),
  ('a3', 'all', 'Payment received ₹4,616',                        'INV-10248 settled via UPI.',                             '1 hour ago',  'success', 'TrendingUp'),
  ('a4', 'all', 'Employee Karan Mehta checked in',                'Login from POS Terminal 1.',                             '2 hours ago', 'info',    'Circle'),
  ('a5', 'all', 'Discount campaign ''Diwali Bonanza'' is live',   '20% off across all categories until 15 Nov.',            'Yesterday',   'brand',   'Tag'),

  -- Stock / low-stock alerts
  ('s1', 'stock', 'Leather Wallet — 0 units',    'Critical reorder.',     '5 min ago',   'danger',  'Diamond'),
  ('s2', 'stock', 'Wireless Earbuds — 8 units',  'Below minimum (20).',   '1 hour ago',  'warning', 'Diamond'),
  ('s3', 'stock', 'Yoga Mat — 3 units',          'Below minimum (15).',   '3 hours ago', 'warning', 'Diamond'),

  -- Attendance alerts
  ('at1', 'attendance', 'Arjun Verma arrived late (31 min)', 'Office start: 09:00. Arrived 09:31.', '32 min ago',   'warning', 'Clock'),
  ('at2', 'attendance', 'Neha Singh absent without notice',  'No check-in recorded.',               'Today 09:30',  'danger',  'UserX'),
  ('at3', 'attendance', 'Sneha Iyer checked out',            '9h 45m work duration.',               '18:30',        'info',    'LogOut'),

  -- Payment alerts
  ('p1', 'payment', 'Payment ₹4,616 received',    'INV-10248 via UPI',         '5 min ago',   'success', 'IndianRupee'),
  ('p2', 'payment', 'Payment pending: INV-10246',  '₹12,400 overdue',          '2 hours ago', 'warning', 'Clock'),
  ('p3', 'payment', 'Refund ₹680 issued',          'INV-10244 — Rahul Nair',   'Yesterday',   'danger',  'IndianRupee'),

  -- System notifications
  ('sy1', 'system', 'Tally sync completed (48 vouchers)', 'All vouchers up to 14:30 synced.', '30 min ago',  'info',    'RefreshCw'),
  ('sy2', 'system', 'Backup pending',                     'Last backup: yesterday 23:00.',    '6 hours ago', 'warning', 'DatabaseBackup'),
  ('sy3', 'system', 'System update v2.4.1 installed',     'New POS features available.',      'Yesterday',   'success', 'Download');
