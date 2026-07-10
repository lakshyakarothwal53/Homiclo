-- HOMIQLO — POS: barcode column on the POS catalogue
-- Run this FIFTH (after 04_branches.sql) AND after supabase/14_product_barcode.sql
-- (which defines generate_product_barcode() and stamps products.barcode).
--
-- The POS dashboard/scanner reads pos_products, so the barcode the USB gun scans
-- must live here too. We reuse the SAME barcode as the inventory `products` row for
-- a matching SKU, so a label printed from Inventory scans to the right POS product.
--
-- Safe to re-run.

alter table pos_products add column if not exists barcode text;

-- Reuse the inventory barcode where the SKU matches; generate for any orphans.
update pos_products p
   set barcode = coalesce(inv.barcode, generate_product_barcode())
  from (select sku, barcode from products) inv
 where p.sku = inv.sku
   and p.barcode is null;

update pos_products
   set barcode = generate_product_barcode()
 where barcode is null;

alter table pos_products alter column barcode set not null;
alter table pos_products alter column barcode set default generate_product_barcode();

create unique index if not exists pos_products_barcode_key on pos_products (barcode);

drop trigger if exists trg_set_pos_product_barcode on pos_products;
create trigger trg_set_pos_product_barcode
  before insert on pos_products
  for each row execute function set_product_barcode();

-- Branch catalogue (pos_products_branches): same barcode per SKU across branches.
alter table pos_products_branches add column if not exists barcode text;

update pos_products_branches b
   set barcode = pp.barcode
  from pos_products pp
 where b.sku = pp.sku
   and b.barcode is null;

update pos_products_branches
   set barcode = generate_product_barcode()
 where barcode is null;
