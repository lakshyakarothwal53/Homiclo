-- HOMIQLO — allow decimal amounts on Purchase Rate and MRP
-- Run after supabase/19_product_purchase_rate.sql. Safe to re-run.
--
-- WHY: products.purchase_rate and products.mrp were created as `integer`
-- (see supabase/18_product_gst_mrp.sql and supabase/19_product_purchase_rate.sql).
-- The Add/Edit Product form happily accepts a paise-precision cost price or
-- MRP (e.g. 2.80), but Postgres rejects any non-integer value written to an
-- `integer` column — so entering a decimal in either field made the whole
-- product insert/update fail, and no product was created.
--
-- price (selling price) is deliberately NOT touched here: it flows into
-- pos_transactions.subtotal/discount/gst/total, which are still `integer`
-- and are NOT best-effort inserts (see submitCheckout in src/hooks/use-pos.ts —
-- a failed insert there throws and blocks the sale). Widening price needs
-- that whole POS money chain migrated together, not as a side effect of this
-- fix. Ask if you want that done too.

alter table products alter column purchase_rate type numeric(10, 2);
alter table products alter column mrp type numeric(10, 2);

-- Existing non-negative checks apply automatically to the new column type
-- (integer -> numeric is a safe, automatic widening) — no need to redefine
-- products_purchase_rate_non_negative / products_mrp_non_negative.

-- Per-line checkout snapshot (best-effort insert — see submitCheckout in
-- src/hooks/use-pos.ts) carries the same two fields plus the computed GST
-- amount; widen them to match so a decimal MRP/GST split isn't silently
-- dropped from a reprinted bill.
alter table pos_transaction_items alter column mrp type numeric(10, 2);
alter table pos_transaction_items alter column gst_amount type numeric(10, 2);
