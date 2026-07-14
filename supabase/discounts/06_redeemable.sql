-- HOMIQLO — Discounts: make Campaigns and Seasonal Offers redeemable at POS
-- checkout, same as Product/Category/Flat/Percentage Discounts.
-- Run AFTER 05_applies_to.sql in the Supabase SQL editor.
--
-- discount_campaigns.blurb and discount_seasonal.discount are free-text
-- marketing copy (e.g. "Up to 30%", "Buy 2 get 1 free") — not safe to parse
-- into real bill math. Likewise discount_campaigns.valid_till can literally
-- be the string "Recurring", and discount_seasonal.valid_from/valid_to are
-- admin-typed strings like "01 Nov" with no year — neither is a reliable ISO
-- date for a checkout expiry check. So redemption gets its own separate,
-- optional fields on both tables; the existing display columns are untouched.
-- code IS NULL (the default) means "display-only, not a POS coupon" — the
-- current behavior for every existing row.

alter table discount_campaigns
  add column if not exists code text,
  add column if not exists value_type text,
  add column if not exists value integer,
  add column if not exists min_order integer not null default 0,
  add column if not exists cap integer,
  add column if not exists redeem_used integer not null default 0,
  add column if not exists redeem_valid_from text,
  add column if not exists redeem_valid_to text,
  add column if not exists applies_to_type text,
  add column if not exists applies_to jsonb not null default '[]'::jsonb;

alter table discount_seasonal
  add column if not exists code text,
  add column if not exists value_type text,
  add column if not exists value integer,
  add column if not exists min_order integer not null default 0,
  add column if not exists cap integer,
  add column if not exists redeem_used integer not null default 0,
  add column if not exists redeem_valid_from text,
  add column if not exists redeem_valid_to text,
  add column if not exists applies_to_type text,
  add column if not exists applies_to jsonb not null default '[]'::jsonb;

-- Per-table code uniqueness (partial index so the common NULL/display-only
-- case never collides). Cross-table uniqueness against discount_promos.code
-- is enforced app-side in useCreateCampaign/useUpdateCampaign/
-- useCreateSeasonal/useUpdateSeasonal via isCodeTaken() — best-effort, not
-- airtight against races, matching the demo-grade RLS already used elsewhere
-- in this module.
create unique index if not exists discount_campaigns_code_key
  on discount_campaigns (lower(code)) where code is not null;
create unique index if not exists discount_seasonal_code_key
  on discount_seasonal (lower(code)) where code is not null;

-- RLS: 03_rls.sql / 04_crud.sql already grant anon+authenticated full CRUD
-- on both tables at the table level, so these new columns are covered —
-- no policy changes needed.
