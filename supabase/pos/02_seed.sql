-- HOMIQLO — POS module seed data
-- Run AFTER 01_schema.sql. Safe to re-run (truncate + insert).

truncate pos_transactions restart identity cascade;
truncate pos_products    restart identity cascade;

insert into pos_products (sku, name, category, price, stock) values
  ('SKU-2401', 'Cotton T-Shirt L',  'Apparel',     599,  124),
  ('SKU-2402', 'Denim Jeans 32',    'Apparel',    1299,   42),
  ('SKU-2403', 'Wireless Earbuds',  'Electronics',2499,    8),
  ('SKU-2404', 'Leather Wallet',    'Accessories', 899,   56),
  ('SKU-2405', 'Basmati Rice 5kg',  'Grocery',     650,  210),
  ('SKU-2406', 'Hair Dryer',        'Electronics',1899,   17),
  ('SKU-2407', 'Sports Cap',        'Accessories', 399,   88),
  ('SKU-2408', 'Yoga Mat',          'Fitness',     799,   34),
  ('SKU-2409', 'Notebook A5',       'Stationery',  149,  320),
  ('SKU-2410', 'Water Bottle',      'Lifestyle',   349,  145),
  ('SKU-2411', 'Phone Case',        'Electronics', 299,   76),
  ('SKU-2412', 'Sunglasses',        'Accessories',1199,   23);

insert into pos_transactions (invoice, time, items, amount, payment, cashier, status, created_at) values
  ('INV-10248', '14:22', 3, '₹4,616',  'UPI',  'R. Kapoor', 'Completed', '2026-06-29 14:22:00+05:30'),
  ('INV-10247', '13:55', 2, '₹1,820',  'Cash', 'K. Mehta',  'Completed', '2026-06-29 13:55:00+05:30'),
  ('INV-10246', '13:30', 5, '₹12,400', 'Card', 'R. Kapoor', 'Pending',   '2026-06-29 13:30:00+05:30'),
  ('INV-10245', '12:18', 1, '₹2,950',  'UPI',  'K. Mehta',  'Completed', '2026-06-29 12:18:00+05:30'),
  ('INV-10244', '11:45', 2, '₹680',    'Cash', 'R. Kapoor', 'Refunded',  '2026-06-29 11:45:00+05:30');
