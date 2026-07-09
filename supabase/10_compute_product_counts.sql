-- HOMIQLO — Compute product counts for categories
-- Run this TENTH, after 01_schema.sql … 09_discounts_branches.sql.
--
-- Automatically updates the categories.product_count whenever products are
-- inserted/updated/deleted. This ensures the All Categories dashboard table
-- always shows current data from Supabase.
--
-- Two triggers:
-- 1. on INSERT/UPDATE/DELETE of products — update the affected category's count
-- 2. on INSERT of categories — initialize product_count from actual product count
--
-- Safe to re-run (drop-if-exists guarded).

-- Trigger function: when a product changes, recount products and compute stock value in its category
create or replace function public.update_category_product_count()
returns trigger as $$
declare
  old_category text;
  new_category text;
  total_value bigint;
begin
  old_category := coalesce(old.category, new.category);
  new_category := coalesce(new.category, old.category);

  -- If the category changed (e.g. product moved to a different category),
  -- update both the old and new category counts
  if (tg_op = 'UPDATE') and (old.category != new.category) then
    -- Update old category
    select coalesce(sum(price * stock), 0) into total_value
    from products where category = old_category;

    update categories
    set
      product_count = (select count(*) from products where category = old_category),
      stock_value = total_value::text
    where name = old_category;
  end if;

  -- Update the (new) category's count and stock value
  select coalesce(sum(price * stock), 0) into total_value
  from products where category = new_category;

  update categories
  set
    product_count = (select count(*) from products where category = new_category),
    stock_value = total_value::text
  where name = new_category;

  return null;
end;
$$ language plpgsql;

-- Trigger: fires when products are inserted, updated, or deleted
drop trigger if exists products_update_category_count on products;
create trigger products_update_category_count
  after insert or update or delete on products
  for each row
  execute function public.update_category_product_count();

-- On INSERT of a new category, initialize its product_count and stock_value from actual products
create or replace function public.init_category_product_count()
returns trigger as $$
declare
  total_value bigint;
begin
  new.product_count := coalesce(
    (select count(*) from products where category = new.name),
    0
  );

  select coalesce(sum(price * stock), 0) into total_value
  from products where category = new.name;
  new.stock_value := total_value::text;

  return new;
end;
$$ language plpgsql;

-- Trigger: fires before a new category is inserted
drop trigger if exists categories_init_count on categories;
create trigger categories_init_count
  before insert on categories
  for each row
  execute function public.init_category_product_count();

-- REFRESH EXISTING DATA: recalculate product counts and stock values for all existing categories
-- based on actual products in the database (fixes stale seed data)
update categories c
set
  product_count = (
    select count(*) from products where category = c.name
  ),
  stock_value = (
    select coalesce(sum(price * stock)::text, '₹0')
    from products where category = c.name
  );
