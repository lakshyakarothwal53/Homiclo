-- HOMIQLO — "applies to" targeting for discount promos
-- Run this FIFTH, after 01_schema.sql … 04_crud.sql (and 09_discounts_branches.sql
-- if you use per-branch views).
--
-- Adds two columns so a discount can target specific products or categories:
--   applies_to_type : 'product' | 'category' | null (null = whole store)
--   applies_to      : jsonb array of { "id", "label" } targets, e.g.
--                     [{"id":"SKU-001","label":"Cotton T-Shirt"}]
--
-- The searchable multi-select in AddDiscountDialog reads the option lists from the
-- inventory `products` / `categories` tables (useProductOptions / useCategoryOptions)
-- and writes the chosen targets here. Existing rows default to an empty array.
--
-- Brands are intentionally omitted: there is no brand column/table in the schema
-- yet. Add a `brands` source and extend applies_to_type to 'brand' when one exists.
--
-- RLS: both tables already have policies (03_rls.sql / 04_crud.sql / 09) that apply
-- to all columns, so no new policy is needed. Safe to re-run (add-column-if-exists).

alter table discount_promos
  add column if not exists applies_to_type text,
  add column if not exists applies_to jsonb not null default '[]'::jsonb;

alter table discount_promos_branches
  add column if not exists applies_to_type text,
  add column if not exists applies_to jsonb not null default '[]'::jsonb;
