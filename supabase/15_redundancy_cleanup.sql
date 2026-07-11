-- 15_redundancy_cleanup.sql
-- ---------------------------------------------------------------------------
-- Product-data redundancy cleanup.
--
-- Goal: `products` (PK `sku`) is the single source of truth for every product
-- fact. Duplicate product tables (pos_products, low_stock_alerts,
-- discounts_active and their _branches twins) are retired, and every table that
-- carries a product must link to it by `sku`.
--
-- Run this in the Supabase dashboard SQL editor (the app has only the anon key,
-- no DDL). It is split into parts by risk:
--
--   PART 1  — SAFE TO RUN NOW. Additive only: adds a `product_sku` link +
--             foreign keys. Nothing is dropped; the app keeps working exactly
--             as today. FKs on existing data are added NOT VALID so this script
--             can never fail on a pre-existing orphan row.
--
--   PART 2  — RUN LATER, only AFTER the refactored React app (which no longer
--             reads these tables) has been deployed and verified. Drops the
--             product-duplicate tables. Reversible only from a backup.
--
--   PART 3  — OPTIONAL, and only after the corresponding branch-scoped code
--             paths are retired. Left commented out on purpose.
--
-- Idempotent: re-running it is a no-op.
-- ---------------------------------------------------------------------------


-- ===========================================================================
-- PART 1 — SAFE TO RUN NOW (additive integrity: link everything by sku)
-- ===========================================================================

-- 1a. Add a real product_sku link to the stock tables, which today reference a
--     product only by free-text name. Backfill it by matching the existing
--     name; rows whose name matches no product stay NULL (surfaced in 1c).
alter table public.stock_inward  add column if not exists product_sku text;
alter table public.stock_outward add column if not exists product_sku text;
alter table public.stock_history add column if not exists product_sku text;

update public.stock_inward  si set product_sku = p.sku
  from public.products p where p.name = si.product  and si.product_sku is null;
update public.stock_outward so set product_sku = p.sku
  from public.products p where p.name = so.product  and so.product_sku is null;
update public.stock_history sh set product_sku = p.sku
  from public.products p where p.name = sh.product  and sh.product_sku is null;

-- 1b. Enforce the product links as foreign keys. NULLs are allowed (they are the
--     orphans to reconcile), so a nullable FK is safe to add now. The FKs on
--     columns that may hold pre-existing orphans (stock_adjustments.sku,
--     pos_transaction_items.sku) are added NOT VALID so the script never fails;
--     VALIDATE them later once 1c reports zero orphans.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'stock_inward_product_sku_fkey') then
    alter table public.stock_inward
      add constraint stock_inward_product_sku_fkey
      foreign key (product_sku) references public.products(sku);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'stock_outward_product_sku_fkey') then
    alter table public.stock_outward
      add constraint stock_outward_product_sku_fkey
      foreign key (product_sku) references public.products(sku);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'stock_history_product_sku_fkey') then
    alter table public.stock_history
      add constraint stock_history_product_sku_fkey
      foreign key (product_sku) references public.products(sku);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'stock_adjustments_sku_fkey') then
    alter table public.stock_adjustments
      add constraint stock_adjustments_sku_fkey
      foreign key (sku) references public.products(sku) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'pos_transaction_items_sku_fkey') then
    alter table public.pos_transaction_items
      add constraint pos_transaction_items_sku_fkey
      foreign key (sku) references public.products(sku) not valid;
  end if;
end $$;

-- 1c. Orphan report — run these after 1a/1b and reconcile before VALIDATE-ing.
--     Expect zero rows once product names/SKUs are cleaned up.
--   select 'stock_inward'  as tbl, grn as ref, product from public.stock_inward  where product_sku is null;
--   select 'stock_outward' as tbl, ref,        product from public.stock_outward where product_sku is null;
--   select 'stock_history' as tbl, id::text,   product from public.stock_history where product_sku is null;
--   select 'stock_adjustments' as tbl, id::text, sku   from public.stock_adjustments s
--     where not exists (select 1 from public.products p where p.sku = s.sku);
--
-- After the orphan reports are empty, promote the NOT VALID constraints:
--   alter table public.stock_adjustments    validate constraint stock_adjustments_sku_fkey;
--   alter table public.pos_transaction_items validate constraint pos_transaction_items_sku_fkey;


-- ===========================================================================
-- PART 2 — RUN LATER (drop the product-duplicate tables)
--
-- Precondition: the refactored app is deployed. As of this migration the app
-- reads product data ONLY from `products`:
--   * usePosProducts  -> products      (was pos_products / pos_products_branches)
--   * useProducts     -> products      (was products_branches on the branch path)
--   * useLowStockAlerts + dashboard + notifications + reports
--                     -> derived from products (was low_stock_alerts / _branches)
--   * discounts_active -> never referenced by the app
--
-- Verify nothing else references them, then uncomment and run this block.
-- (Take a snapshot/backup first — DROP is not reversible without one.)
-- ===========================================================================

-- drop table if exists public.pos_products             cascade;
-- drop table if exists public.pos_products_branches    cascade;
-- drop table if exists public.products_branches        cascade;
-- drop table if exists public.low_stock_alerts         cascade;
-- drop table if exists public.low_stock_alerts_branches cascade;
-- drop table if exists public.discounts_active         cascade;


-- ===========================================================================
-- PART 3 — OPTIONAL, LATER (retire the remaining empty *_branches twins)
--
-- These twins are still read by the branch-scoped hooks (billing/stock/category/
-- discount/reports/role/pos_transactions). They are the documented multi-tenancy
-- pattern (see branch-strategy skill) and are simply unseeded. Do NOT drop them
-- until those branch-scoped code paths are retired or moved to a branch_id
-- column model, or branch-filtered pages will break. Listed here for reference:
--
--   billing_gateway_txns_branches, billing_payments_branches,
--   billing_refunds_branches, billing_reports_branches,
--   billing_sales_bills_branches, billing_tax_invoices_branches,
--   category_branches, discount_seasonal_branches, discount_usage_branches,
--   inventory_reports_branches, pos_transactions_branches, role_branches,
--   stock_history_branches, stock_inward_branches, stock_outward_branches
-- ===========================================================================
