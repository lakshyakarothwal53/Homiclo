-- HOMIQLO — Discounts: "Buy X Get Y Free" (BOGO) campaigns.
-- Run AFTER 06_redeemable.sql in the Supabase SQL editor.
--
-- discount_campaigns.value_type/value (added in 06_redeemable.sql) can only
-- express a flat/percentage reduction — not "the 3rd matching item is free."
-- buy_qty/get_qty drive that math instead when value_type = 'bogo'; value
-- stays NULL for those rows (unused). No CHECK constraint exists on
-- value_type today, so no migration is needed there — 'bogo' is just a new
-- string the application code now recognizes.

alter table discount_campaigns
  add column if not exists buy_qty integer,
  add column if not exists get_qty integer;

-- RLS: covered by the existing table-level policies from 03_rls.sql /
-- 04_crud.sql — no changes needed.
