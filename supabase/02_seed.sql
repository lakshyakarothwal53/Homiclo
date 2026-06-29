-- HOMIQLO — Inventory seed data (mirrors src/data/inventory/*.json)
-- Run this SECOND, after 01_schema.sql. Safe to re-run (upserts / truncates).

truncate products, categories, stock_inward, stock_outward, stock_history,
  low_stock_alerts, inventory_reports, inventory_dashboard;

insert into products (sku, name, category, price, stock, status) values
  ('SKU-2401', 'Cotton T-Shirt (L)',      'Apparel',        599,  124, 'In Stock'),
  ('SKU-2402', 'Denim Jeans (32)',        'Apparel',        1299, 42,  'In Stock'),
  ('SKU-2403', 'Wireless Earbuds',        'Electronics',    2499, 8,   'Low Stock'),
  ('SKU-2404', 'Leather Wallet',          'Accessories',    899,  0,   'Out of Stock'),
  ('SKU-2405', 'Basmati Rice 5kg',        'Groceries',      650,  218, 'In Stock'),
  ('SKU-2406', 'Hair Dryer',              'Electronics',    1899, 15,  'In Stock'),
  ('SKU-2407', 'Stainless Steel Bottle',  'Home & Kitchen', 749,  86,  'In Stock'),
  ('SKU-2408', 'Yoga Mat',                'Accessories',    1099, 3,   'Low Stock'),
  ('SKU-2409', 'Bluetooth Speaker',       'Electronics',    3299, 27,  'In Stock'),
  ('SKU-2410', 'Notebook A5',             'Accessories',    149,  12,  'Low Stock'),
  ('SKU-2411', 'Ceramic Dinner Set',      'Home & Kitchen', 2199, 54,  'In Stock'),
  ('SKU-2412', 'Running Shoes (9)',       'Apparel',        2899, 0,   'Out of Stock');

insert into categories (name, product_count, stock_value, last_updated) values
  ('Apparel',          342, '₹4.8L', '2 hours ago'),
  ('Electronics',      218, '₹6.2L', '1 day ago'),
  ('Groceries',        456, '₹3.4L', '30 min ago'),
  ('Accessories',      168, '₹2.1L', '4 hours ago'),
  ('Home & Kitchen',   100, '₹1.9L', 'Yesterday'),
  ('Beauty & Care',    84,  '₹1.2L', '3 hours ago'),
  ('Sports & Fitness', 62,  '₹0.9L', '2 days ago'),
  ('Stationery',       48,  '₹0.4L', '6 hours ago');

insert into stock_inward (grn, date, product, supplier, qty, cost, received_by) values
  ('GRN-2401', '12 Nov', 'Cotton T-Shirt (L)',     'Maxwell Textiles',  100, '₹35,000', 'A. Verma'),
  ('GRN-2402', '12 Nov', 'Basmati Rice 5kg',       'Royal Grains',      80,  '₹38,400', 'A. Verma'),
  ('GRN-2403', '11 Nov', 'Wireless Earbuds',       'TechWave Pvt Ltd',  50,  '₹62,500', 'A. Verma'),
  ('GRN-2404', '10 Nov', 'Leather Wallet',         'Craft Co.',         30,  '₹13,500', 'S. Iyer'),
  ('GRN-2405', '09 Nov', 'Bluetooth Speaker',      'TechWave Pvt Ltd',  40,  '₹98,000', 'S. Iyer'),
  ('GRN-2406', '08 Nov', 'Ceramic Dinner Set',     'HomeStyle Traders', 60,  '₹78,000', 'A. Verma'),
  ('GRN-2407', '07 Nov', 'Stainless Steel Bottle', 'HomeStyle Traders', 120, '₹54,000', 'R. Kapoor'),
  ('GRN-2408', '06 Nov', 'Yoga Mat',               'FitGear Supplies',  45,  '₹31,500', 'S. Iyer');

insert into stock_outward (ref, date, product, type, qty, reference, by) values
  ('OUT-1201', '12 Nov', 'Cotton T-Shirt (L)', 'Sale',     8,  'INV-10248', 'R. Kapoor'),
  ('OUT-1202', '12 Nov', 'Basmati Rice 5kg',   'Sale',     12, 'INV-10247', 'K. Mehta'),
  ('OUT-1203', '11 Nov', 'Hair Dryer',         'Sale',     3,  'INV-10240', 'R. Kapoor'),
  ('OUT-1204', '11 Nov', 'Cotton T-Shirt (M)', 'Damage',   2,  'DMG-44',    'A. Verma'),
  ('OUT-1205', '10 Nov', 'Wireless Earbuds',   'Sale',     6,  'INV-10231', 'K. Mehta'),
  ('OUT-1206', '09 Nov', 'Bluetooth Speaker',  'Transfer', 10, 'TRF-08',    'S. Iyer'),
  ('OUT-1207', '08 Nov', 'Yoga Mat',           'Sale',     4,  'INV-10220', 'R. Kapoor'),
  ('OUT-1208', '07 Nov', 'Ceramic Dinner Set', 'Damage',   1,  'DMG-43',    'A. Verma');

insert into stock_history (datetime, product, change, type, balance, by) values
  ('12 Nov 14:22', 'Cotton T-Shirt (L)', -8,  'Sale',       124, 'R. Kapoor'),
  ('12 Nov 10:05', 'Cotton T-Shirt (L)', 100, 'Inward',     132, 'A. Verma'),
  ('11 Nov 18:30', 'Wireless Earbuds',   -2,  'Sale',       8,   'K. Mehta'),
  ('11 Nov 11:14', 'Basmati Rice 5kg',   80,  'Inward',     298, 'A. Verma'),
  ('10 Nov 17:10', 'Hair Dryer',         -1,  'Sale',       15,  'R. Kapoor'),
  ('10 Nov 09:42', 'Leather Wallet',     -4,  'Adjustment', 0,   'A. Verma'),
  ('09 Nov 16:20', 'Bluetooth Speaker',  40,  'Inward',     27,  'S. Iyer'),
  ('08 Nov 13:05', 'Yoga Mat',           -4,  'Sale',       3,   'R. Kapoor');

insert into low_stock_alerts (sku, product, current_stock, min_level, status) values
  ('SKU-2404', 'Leather Wallet',   0,  10, 'Critical'),
  ('SKU-2403', 'Wireless Earbuds', 8,  20, 'Low'),
  ('SKU-2408', 'Yoga Mat',         3,  15, 'Critical'),
  ('SKU-2410', 'Notebook A5',      12, 25, 'Low'),
  ('SKU-2412', 'Running Shoes (9)', 0, 12, 'Critical'),
  ('SKU-2406', 'Hair Dryer',       15, 30, 'Low');

insert into inventory_reports (report, period, generated, format) values
  ('Stock Valuation Report', 'Nov 2024', '12 Nov 2024', 'PDF'),
  ('Fast Moving Items',      'Q3 2024',  '01 Oct 2024', 'Excel'),
  ('Slow Moving Items',      'Q3 2024',  '01 Oct 2024', 'Excel'),
  ('Stock Ageing',           'Nov 2024', '12 Nov 2024', 'PDF'),
  ('Low Stock Summary',      'Nov 2024', '12 Nov 2024', 'PDF'),
  ('Category Performance',   'Q3 2024',  '01 Oct 2024', 'Excel');

insert into inventory_dashboard (id, data) values (1, '{
  "stats": {
    "totalProducts": 1284,
    "totalCategories": 24,
    "stockValue": "₹18.4L",
    "lowStock": 18,
    "outOfStock": 5
  },
  "stockMovement": [
    { "d": "01", "inward": 120, "outward": 90 },
    { "d": "03", "inward": 160, "outward": 110 },
    { "d": "05", "inward": 140, "outward": 130 },
    { "d": "07", "inward": 200, "outward": 150 },
    { "d": "09", "inward": 240, "outward": 180 },
    { "d": "11", "inward": 280, "outward": 210 },
    { "d": "13", "inward": 320, "outward": 240 },
    { "d": "15", "inward": 130, "outward": 160 },
    { "d": "17", "inward": 190, "outward": 140 },
    { "d": "19", "inward": 240, "outward": 200 },
    { "d": "21", "inward": 210, "outward": 170 },
    { "d": "23", "inward": 290, "outward": 230 },
    { "d": "25", "inward": 340, "outward": 260 },
    { "d": "27", "inward": 150, "outward": 130 },
    { "d": "30", "inward": 180, "outward": 160 }
  ],
  "topCategories": [
    { "name": "Apparel", "productCount": 342, "share": 28 },
    { "name": "Electronics", "productCount": 218, "share": 18 },
    { "name": "Groceries", "productCount": 456, "share": 36 },
    { "name": "Accessories", "productCount": 168, "share": 13 },
    { "name": "Home & Kitchen", "productCount": 100, "share": 5 }
  ]
}'::jsonb);
