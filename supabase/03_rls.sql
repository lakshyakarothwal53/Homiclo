-- HOMIQLO — Row Level Security for the inventory tables
-- Run this THIRD, after 01_schema.sql and 02_seed.sql.
--
-- ⚠️ DEMO-GRADE POLICIES. These allow the public anon key to read everything and
-- to write the tables the stock-adjustment flow touches. Before going to
-- production, replace these with policies scoped to authenticated admin users
-- (e.g. using auth.uid() / a roles table).

alter table products            enable row level security;
alter table categories          enable row level security;
alter table stock_inward        enable row level security;
alter table stock_outward       enable row level security;
alter table stock_history       enable row level security;
alter table low_stock_alerts    enable row level security;
alter table inventory_reports   enable row level security;
alter table stock_adjustments   enable row level security;
alter table inventory_dashboard enable row level security;

-- Read access (anon + authenticated) for every inventory table.
do $$
declare t text;
begin
  foreach t in array array[
    'products','categories','stock_inward','stock_outward','stock_history',
    'low_stock_alerts','inventory_reports','stock_adjustments','inventory_dashboard'
  ]
  loop
    execute format(
      'create policy %I on %I for select to anon, authenticated using (true);',
      t || '_read', t
    );
  end loop;
end $$;

-- Write access for the stock-adjustment mutation:
--   insert stock_adjustments, update products.stock, insert stock_history.
create policy products_update on products
  for update to anon, authenticated using (true) with check (true);

create policy stock_history_insert on stock_history
  for insert to anon, authenticated with check (true);

create policy stock_adjustments_insert on stock_adjustments
  for insert to anon, authenticated with check (true);
