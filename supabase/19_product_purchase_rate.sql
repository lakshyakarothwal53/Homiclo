-- HOMIQLO — per-product purchase rate (cost price)
-- Run after supabase/18_product_gst_mrp.sql. Safe to re-run.
--
-- WHY: the product form had a selling price and MRP, but no cost price, so
-- there was no way to see or report on margin. purchase_rate is the amount
-- paid to the supplier — GST-EXCLUSIVE, like price — and is display-only:
-- it is never charged to the customer and never used in any checkout total.

alter table products add column if not exists purchase_rate integer;

alter table products drop constraint if exists products_purchase_rate_non_negative;
alter table products add constraint products_purchase_rate_non_negative
  check (purchase_rate is null or purchase_rate >= 0);
