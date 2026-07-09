-- HOMIQLO — Clear all mock/seed data
-- Run this to remove all test data and start fresh with real data
--
-- WARNING: This will DELETE all data in the tables below:
-- - products
-- - categories
-- - stock_inward
-- - stock_outward
-- - stock_history
-- - low_stock_alerts
-- - inventory_reports
-- - inventory_dashboard
--
-- The schema and tables remain intact - only the data is removed.
-- Safe to run multiple times.

-- Disable triggers temporarily to avoid unnecessary updates
alter table products disable trigger products_update_category_count;

-- Clear all data (keeping schema)
truncate products cascade;
truncate categories cascade;
truncate stock_inward cascade;
truncate stock_outward cascade;
truncate stock_history cascade;
truncate low_stock_alerts cascade;
truncate inventory_reports cascade;
truncate inventory_dashboard cascade;
truncate stock_adjustments cascade;

-- Re-enable triggers
alter table products enable trigger products_update_category_count;

-- Verify all tables are empty
select 'Products' as table_name, count(*) as row_count from products
union all
select 'Categories', count(*) from categories
union all
select 'Stock Inward', count(*) from stock_inward
union all
select 'Stock Outward', count(*) from stock_outward
union all
select 'Stock History', count(*) from stock_history
union all
select 'Low Stock Alerts', count(*) from low_stock_alerts
union all
select 'Inventory Reports', count(*) from inventory_reports
union all
select 'Dashboard', count(*) from inventory_dashboard;
