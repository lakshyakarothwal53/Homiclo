-- HOMIQLO — Inventory module schema
-- Run this FIRST in the Supabase SQL editor.
--
-- Column names are snake_case; the TanStack Query hooks in
-- src/hooks/use-inventory.ts alias them back to the camelCase shape that
-- src/types/inventory.ts expects (e.g. received_by -> receivedBy).
--
-- NOTE: cost / stock_value / date / last_updated are stored as TEXT to mirror
-- the current mock fixtures verbatim (e.g. "₹35,000", "₹4.8L", "12 Nov",
-- "2 hours ago"). These are denormalized display strings — normalize to numeric
-- / timestamptz later if/when the UI computes its own formatting.

create table if not exists products (
  sku      text primary key,
  name     text not null,
  category text not null,
  price    integer not null default 0,
  stock    integer not null default 0,
  status   text not null
);

create table if not exists categories (
  name          text primary key,
  product_count integer not null default 0,
  stock_value   text,
  last_updated  text
);

create table if not exists stock_inward (
  grn         text primary key,
  date        text,
  product     text not null,
  supplier    text,
  qty         integer not null default 0,
  cost        text,
  received_by text
);

create table if not exists stock_outward (
  ref       text primary key,
  date      text,
  product   text not null,
  type      text not null,
  qty       integer not null default 0,
  reference text,
  by        text
);

create table if not exists stock_history (
  id       uuid primary key default gen_random_uuid(),
  datetime text,
  product  text not null,
  change   integer not null default 0,
  type     text not null,
  balance  integer not null default 0,
  by       text
);

-- Standalone table for now (matches the mock fixture 1:1). It can later become a
-- VIEW over products once products gains a min_level column:
--   create view low_stock_alerts as
--     select sku, name as product, stock as current_stock, min_level,
--            case when stock = 0 then 'Critical' else 'Low' end as status
--     from products where stock <= min_level;
create table if not exists low_stock_alerts (
  sku           text primary key,
  product       text not null,
  current_stock integer not null default 0,
  min_level     integer not null default 0,
  status        text not null
);

create table if not exists inventory_reports (
  id        uuid primary key default gen_random_uuid(),
  report    text not null,
  period    text,
  generated text,
  format    text
);

-- Target of the useSubmitStockAdjustment mutation.
create table if not exists stock_adjustments (
  id             uuid primary key default gen_random_uuid(),
  sku            text not null,
  adjusted_stock integer not null,
  reason         text not null,
  date           text,
  notes          text,
  created_at     timestamptz not null default now()
);

-- Single-row store of the dashboard payload (stats + stockMovement + topCategories).
-- Keeps exact parity with dashboard.json. Can later be replaced by a computed
-- get_inventory_dashboard() RPC / aggregating views.
create table if not exists inventory_dashboard (
  id   integer primary key default 1,
  data jsonb not null,
  constraint inventory_dashboard_singleton check (id = 1)
);
