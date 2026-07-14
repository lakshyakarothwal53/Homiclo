truncate discount_usage, discount_seasonal, discount_campaigns, discount_promos, discounts_active, discounts_dashboard;

-- Stat cards for the dashboard index page
insert into discounts_dashboard (id, data) values (1, '{
  "activeCampaigns":     "4",
  "activeCampaignsHint": "12 discounts live",
  "discountGiven":       "₹48,200",
  "discountGivenHint":   "This month",
  "timesUsed":           "248",
  "timesUsedHint":       "Across all promos",
  "avgDiscount":         "18%",
  "avgDiscountHint":     "Per transaction"
}'::jsonb);

-- Active discounts table on the dashboard
insert into discounts_active (name, type, value, applies_to, valid_till, used, status) values
  ('Diwali Bonanza',       'Percentage', '20%',   'All Products',  '15 Nov 2024', '128 / 500', 'Active'),
  ('Festive Flat ₹100',    'Flat',       '₹100',  'Orders > ₹500', '20 Nov 2024', '62 / 200',  'Active'),
  ('Apparel Sale',         'Category',   '15%',   'Apparel',       '30 Nov 2024', '38 / 300',  'Active'),
  ('New Customer ₹50 Off', 'Flat',       '₹50',   'First Order',   '31 Dec 2024', '20 / —',    'Active');

-- Promo rows (flat / percentage / category / product — 3 rows each)
insert into discount_promos
  (id, discount_type, name, code, value_type, value, min_order, valid_from, valid_to, used, cap, status)
values
  ('Flat-a',       'flat',       'Flat Discount A',       'PROMO10', 'flat',       100, 500,  '2024-11-01', '2024-11-30',  42, null, 'Active'),
  ('Flat-b',       'flat',       'Flat Discount B',       'PROMO20', 'flat',       250, 1000, '2024-11-05', '2024-11-25',  18, null, 'Active'),
  ('Flat-c',       'flat',       'Flat Discount C',       'PROMO50', 'flat',        50, 250,  '2024-10-01', '2024-10-31', 102, null, 'Expired'),
  ('Percentage-a', 'percentage', 'Percentage Discount A', 'PROMO10', 'percentage',  10, 500,  '2024-11-01', '2024-11-30',  42, null, 'Active'),
  ('Percentage-b', 'percentage', 'Percentage Discount B', 'PROMO20', 'percentage',  20, 1000, '2024-11-05', '2024-11-25',  18, null, 'Active'),
  ('Percentage-c', 'percentage', 'Percentage Discount C', 'PROMO50', 'flat',        50, 250,  '2024-10-01', '2024-10-31', 102, null, 'Expired'),
  ('Category-a',   'category',   'Category Discount A',   'PROMO10', 'percentage',  10, 500,  '2024-11-01', '2024-11-30',  42, null, 'Active'),
  ('Category-b',   'category',   'Category Discount B',   'PROMO20', 'percentage',  20, 1000, '2024-11-05', '2024-11-25',  18, null, 'Active'),
  ('Category-c',   'category',   'Category Discount C',   'PROMO50', 'flat',        50, 250,  '2024-10-01', '2024-10-31', 102, null, 'Expired'),
  ('Product-a',    'product',    'Product Discount A',    'PROMO10', 'percentage',  10, 500,  '2024-11-01', '2024-11-30',  42, null, 'Active'),
  ('Product-b',    'product',    'Product Discount B',    'PROMO20', 'percentage',  20, 1000, '2024-11-05', '2024-11-25',  18, null, 'Active'),
  ('Product-c',    'product',    'Product Discount C',    'PROMO50', 'flat',        50, 250,  '2024-10-01', '2024-10-31', 102, null, 'Expired');

-- Promotional campaigns
insert into discount_campaigns (name, blurb, valid_till, used, status) values
  ('Diwali Bonanza',   'Flat 20% off across all categories.',   '15 Nov',    '128', 'Active'),
  ('Festive Combo',    'Buy 2 get 1 free on selected apparel.', '20 Nov',    '42',  'Active'),
  ('Weekend Flash',    'Flat ₹100 on weekend purchases.',       'Recurring', '256', 'Active'),
  ('Black Friday',     'Up to 50% off store-wide.',             '29 Nov',    '—',   'Upcoming'),
  ('New Year Special', 'Mega discount on electronics.',         '01 Jan',    '—',   'Upcoming'),
  ('Summer Clearance', 'End of season sale.',                   '—',         '612', 'Ended');

-- Seasonal offers
insert into discount_seasonal (season, offer, discount, valid_from, valid_to, status) values
  ('Diwali',        'Festive Bonanza',    'Up to 30%', '01 Nov', '15 Nov', 'Active'),
  ('Black Friday',  'Mega Sale',          'Up to 50%', '29 Nov', '30 Nov', 'Upcoming'),
  ('Christmas',     'Holiday Deals',      '20%',        '20 Dec', '26 Dec', 'Upcoming'),
  ('New Year',      'Year-End Clearance', 'Up to 40%', '27 Dec', '02 Jan', 'Upcoming');

-- Discount usage analytics (real numbers — stat cards are computed client-side)
insert into discount_usage (code, discount, times_used, discount_given, avg_order, conversion) values
  ('DIWALI20',  'Diwali Bonanza', 128, 24580, 1920, 68),
  ('FLAT100',   'Festive Flat',    62,  6200,  820, 52),
  ('APPAREL15', 'Apparel Sale',    38,  8420, 2210, 44),
  ('NEW50',     'New Customer',    20,  1000,  620, 28);
