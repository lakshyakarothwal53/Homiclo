-- HOMIQLO — Billing module seed data
-- Run AFTER 01_schema.sql. Safe to re-run (truncate + insert).

truncate billing_reports       restart identity cascade;
truncate billing_gateway_txns  restart identity cascade;
truncate billing_tally_log     restart identity cascade;
truncate billing_tax_invoices  restart identity cascade;
truncate billing_refunds       restart identity cascade;
truncate billing_payments      restart identity cascade;
truncate billing_sales_bills   restart identity cascade;
truncate billing_revenue_trend restart identity cascade;
truncate billing_dashboard     restart identity cascade;

insert into billing_dashboard (id, data) values (1, '{
  "todayRevenue":       "₹1,24,580",
  "todayRevenueHint":   "48 invoices",
  "pendingPayments":    "₹38,200",
  "pendingPaymentsHint":"12 invoices",
  "thisMonth":          "₹24.8L",
  "thisMonthDelta":     "Up 18% vs last month",
  "refunds":            "₹4,820",
  "refundsHint":        "6 this week",
  "tallySyncedToday":   "48",
  "tallySyncedHint":    "Last sync 5 min ago",
  "tallyPendingSync":   "3",
  "tallyPendingHint":   "Vouchers waiting",
  "tallyFailed":        "1",
  "tallyFailedHint":    "Requires attention"
}'::jsonb);

insert into billing_revenue_trend (d, revenue, sort_order) values
  ('1 Nov',   64000,  1),
  ('2 Nov',   72000,  2),
  ('3 Nov',   81000,  3),
  ('4 Nov',   94000,  4),
  ('5 Nov',  108000,  5),
  ('6 Nov',  121000,  6),
  ('7 Nov',  134000,  7),
  ('8 Nov',   58000,  8),
  ('9 Nov',   69000,  9),
  ('10 Nov',  88000, 10),
  ('11 Nov', 112000, 11),
  ('12 Nov', 124580, 12);

insert into billing_sales_bills (invoice, date, customer, amount, payment, status) values
  ('INV-10248', '12 Nov', 'Anita Desai',  '₹4,616',  'UPI',  'Paid'),
  ('INV-10247', '12 Nov', 'Walk-in',      '₹1,820',  'Cash', 'Paid'),
  ('INV-10246', '12 Nov', 'Vikram Joshi', '₹12,400', 'Card', 'Pending'),
  ('INV-10245', '11 Nov', 'Sneha Iyer',   '₹2,950',  'UPI',  'Paid'),
  ('INV-10244', '11 Nov', 'Rahul Nair',   '₹680',    'Cash', 'Refunded');

insert into billing_payments (receipt, date, customer, invoice, amount, mode, status) values
  ('REC-4521', '12 Nov', 'Anita Desai',  'INV-10248', '₹4,616', 'UPI',  'Received'),
  ('REC-4520', '12 Nov', 'Walk-in',      'INV-10247', '₹1,820', 'Cash', 'Received'),
  ('REC-4519', '11 Nov', 'Sneha Iyer',   'INV-10245', '₹2,950', 'UPI',  'Received'),
  ('REC-4518', '10 Nov', 'Vikram Joshi', 'INV-10240', '₹8,200', 'NEFT', 'Received');

insert into billing_refunds (refund, invoice, customer, amount, reason, status) values
  ('REF-201', 'INV-10244', 'Rahul Nair', '₹680',   'Damaged item',  'Completed'),
  ('REF-200', 'INV-10230', 'Maya P.',    '₹1,299', 'Size mismatch', 'Completed'),
  ('REF-199', 'INV-10221', 'Suresh K.',  '₹450',   'Wrong product', 'Processing');

insert into billing_tax_invoices (invoice, date, gstin, taxable, cgst, sgst, total) values
  ('INV-10248', '12 Nov', '27ABCDE1234F1Z5', '₹3,912',  '₹352', '₹352', '₹4,616'),
  ('INV-10246', '12 Nov', '27FGHIJ5678K1Z3', '₹10,508', '₹946', '₹946', '₹12,400'),
  ('INV-10245', '11 Nov', '—',               '₹2,500',  '₹225', '₹225', '₹2,950');

insert into billing_tally_log (time, voucher, reference, amount, status, created_at) values
  ('14:30', 'Sales',    'INV-10248', '₹4,616',  'Synced',  '2026-06-29 14:30:00+05:30'),
  ('14:10', 'Receipt',  'REC-4521',  '₹4,616',  'Synced',  '2026-06-29 14:10:00+05:30'),
  ('13:55', 'Sales',    'INV-10247', '₹1,820',  'Synced',  '2026-06-29 13:55:00+05:30'),
  ('13:30', 'Sales',    'INV-10246', '₹12,400', 'Pending', '2026-06-29 13:30:00+05:30'),
  ('12:00', 'Purchase', 'GRN-2403',  '₹62,500', 'Failed',  '2026-06-29 12:00:00+05:30');

insert into billing_gateway_txns (txn, date, customer, amount, gateway, status) values
  ('pay_NK4521', '12 Nov', 'Anita Desai',  '₹4,616',  'Razorpay', 'Success'),
  ('pay_NK4520', '12 Nov', 'Vikram Joshi', '₹12,400', 'Razorpay', 'Pending'),
  ('pay_NK4519', '11 Nov', 'Sneha Iyer',   '₹2,950',  'Razorpay', 'Success'),
  ('pay_NK4515', '10 Nov', 'Karan M.',     '₹680',    'PhonePe',  'Refunded');

insert into billing_reports (report, period, generated, format) values
  ('Daily Sales Summary',   '12 Nov 2024', '12 Nov 2024', 'PDF'),
  ('Tax Summary (GST)',      'Nov 2024',    '12 Nov 2024', 'Excel'),
  ('Outstanding Payments',  '12 Nov 2024', '12 Nov 2024', 'PDF'),
  ('Refund Summary',        'Nov 2024',    '12 Nov 2024', 'Excel');
