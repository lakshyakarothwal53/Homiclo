-- HOMIQLO — central catalogue + per-branch stock allocation
-- Run after supabase/16_branch_management.sql. Safe to re-run.
--
-- MODEL (deliberately narrow, to respect the product-data-model rule in
-- CLAUDE.md: "never re-store name/price/stock elsewhere — link by sku"):
--
--   products          the catalogue AND the central/unallocated warehouse
--                     stock. Every product fact (name, price, category,
--                     min_stock, status, barcode) lives here and ONLY here.
--   branch_inventory  the ONLY new fact — how many units of a sku a given
--                     branch currently holds. No product fields are copied;
--                     the UI joins back to products by sku.
--
-- Super Admin owns the catalogue and "sends" stock to a branch, which moves
-- units from products.stock into branch_inventory.stock. Branch Admin and
-- Cashier read branch_inventory for their own branch only.

create table if not exists branch_inventory (
  sku    text    not null references products (sku) on update cascade on delete cascade,
  branch text    not null,
  stock  integer not null default 0 check (stock >= 0),
  updated_at timestamptz not null default now(),
  primary key (sku, branch)
);

create index if not exists branch_inventory_branch_idx on branch_inventory (branch);

alter table branch_inventory enable row level security;

drop policy if exists branch_inventory_read on branch_inventory;
create policy branch_inventory_read on branch_inventory
  for select to anon, authenticated using (true);

drop policy if exists branch_inventory_insert on branch_inventory;
create policy branch_inventory_insert on branch_inventory
  for insert to anon, authenticated with check (true);

drop policy if exists branch_inventory_update on branch_inventory;
create policy branch_inventory_update on branch_inventory
  for update to anon, authenticated using (true) with check (true);

drop policy if exists branch_inventory_delete on branch_inventory;
create policy branch_inventory_delete on branch_inventory
  for delete to anon, authenticated using (true);

-- Allocation history. NOT stock_transfers: that table's from_branch/to_branch
-- are FK-constrained to `branches`, and the central warehouse is not a branch,
-- so writing 'Central Warehouse' there fails with a 23503.
create table if not exists product_allocations (
  id         uuid primary key default gen_random_uuid(),
  sku        text not null,
  branch     text not null,
  quantity   integer not null,
  direction  text not null check (direction in ('allocate', 'recall')),
  created_at timestamptz not null default now()
);

create index if not exists product_allocations_branch_idx on product_allocations (branch);
create index if not exists product_allocations_sku_idx on product_allocations (sku);

alter table product_allocations enable row level security;

drop policy if exists product_allocations_read on product_allocations;
create policy product_allocations_read on product_allocations
  for select to anon, authenticated using (true);

drop policy if exists product_allocations_insert on product_allocations;
create policy product_allocations_insert on product_allocations
  for insert to anon, authenticated with check (true);

-- Atomic allocation. Doing the central decrement and the branch increment as
-- two separate client calls would leave stock duplicated or destroyed if the
-- second one failed, so both happen inside this single function. It also
-- refuses to over-allocate rather than letting central stock go negative.
-- NOTE: the OUT columns are deliberately NOT named `sku`/`branch` — those
-- would be ambiguous against the table columns referenced in the body and
-- Postgres raises 42702 at runtime.
create or replace function allocate_product_to_branch(
  p_sku    text,
  p_branch text,
  p_qty    integer
) returns table (central_stock integer, branch_stock integer)
language plpgsql
as $$
declare
  v_central integer;
  v_branch  integer;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if p_branch is null or btrim(p_branch) = '' then
    raise exception 'A destination branch is required';
  end if;

  -- Lock the product row so two concurrent sends can't both pass the check.
  select p.stock into v_central from products p where p.sku = p_sku for update;

  if not found then
    raise exception 'Unknown product %', p_sku;
  end if;

  if v_central < p_qty then
    raise exception 'Only % unit(s) available centrally for %, cannot send %',
      v_central, p_sku, p_qty;
  end if;

  update products p set stock = p.stock - p_qty where p.sku = p_sku
    returning p.stock into v_central;

  insert into branch_inventory as bi (sku, branch, stock, updated_at)
  values (p_sku, p_branch, p_qty, now())
  on conflict (sku, branch)
    do update set stock = bi.stock + excluded.stock, updated_at = now()
    returning bi.stock into v_branch;

  insert into product_allocations (sku, branch, quantity, direction)
  values (p_sku, p_branch, p_qty, 'allocate');

  return query select v_central, v_branch;
end;
$$;

-- Reverse an allocation: pull units back from a branch into central stock.
create or replace function recall_product_from_branch(
  p_sku    text,
  p_branch text,
  p_qty    integer
) returns table (central_stock integer, branch_stock integer)
language plpgsql
as $$
declare
  v_central integer;
  v_branch  integer;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select bi.stock into v_branch from branch_inventory bi
    where bi.sku = p_sku and bi.branch = p_branch for update;

  if not found then
    raise exception '% holds no stock of %', p_branch, p_sku;
  end if;

  if v_branch < p_qty then
    raise exception '% only holds % unit(s) of %, cannot recall %',
      p_branch, v_branch, p_sku, p_qty;
  end if;

  update branch_inventory bi set stock = bi.stock - p_qty, updated_at = now()
    where bi.sku = p_sku and bi.branch = p_branch
    returning bi.stock into v_branch;

  update products p set stock = p.stock + p_qty where p.sku = p_sku
    returning p.stock into v_central;

  insert into product_allocations (sku, branch, quantity, direction)
  values (p_sku, p_branch, p_qty, 'recall');

  return query select v_central, v_branch;
end;
$$;

grant execute on function allocate_product_to_branch(text, text, integer) to anon, authenticated;
grant execute on function recall_product_from_branch(text, text, integer) to anon, authenticated;
