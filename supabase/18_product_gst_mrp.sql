-- HOMIQLO — per-product GST rate and MRP
-- Run after supabase/17_branch_inventory.sql. Safe to re-run.
--
-- WHY: GST was a single flat rate in app_settings applied to the whole cart,
-- but a real catalogue mixes slabs (0 / 5 / 12 / 18 / 28 %). Each product now
-- carries its own rate, and POS charges each line at that line's rate.
--
-- SEMANTICS (matters — read before changing):
--   price     the SELLING price, GST-EXCLUSIVE. The existing checkout adds GST
--             on top (total = subtotal - discount + gst), so this keeps every
--             historical total intact.
--   mrp       Maximum Retail Price printed on the pack. Display-only: it is
--             shown on the bill so the customer can see what they saved. It is
--             NOT used in any total.
--   gst_rate  percent, e.g. 18.00. NULL means "not set" and the cart falls
--             back to the flat app_settings rate, so existing products keep
--             behaving exactly as they did until a rate is assigned.

alter table products add column if not exists gst_rate numeric(5, 2);
alter table products add column if not exists mrp integer;

alter table products drop constraint if exists products_gst_rate_range;
alter table products add constraint products_gst_rate_range
  check (gst_rate is null or (gst_rate >= 0 and gst_rate <= 100));

alter table products drop constraint if exists products_mrp_non_negative;
alter table products add constraint products_mrp_non_negative
  check (mrp is null or mrp >= 0);

-- Per-line tax snapshot, so a reprinted bill shows the rate that was actually
-- charged even if the product's rate changes later.
alter table pos_transaction_items add column if not exists gst_rate numeric(5, 2);
alter table pos_transaction_items add column if not exists gst_amount integer;
alter table pos_transaction_items add column if not exists mrp integer;
