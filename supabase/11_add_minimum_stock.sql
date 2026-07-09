-- HOMIQLO — Add minimum stock level to products table
-- Run this ELEVENTH, after 10_compute_product_counts.sql
--
-- Adds min_stock column to track minimum required stock level per product.
-- Product status (In Stock / Low Stock / Out of Stock) is automatically determined
-- based on comparing current stock to this minimum level.
--
-- Safe to re-run (add column if not exists guarded).

alter table products
add column if not exists min_stock integer not null default 10;

-- Optional: Add comment explaining the column
comment on column products.min_stock is 'Minimum stock level - status is Low Stock when stock < min_stock';
