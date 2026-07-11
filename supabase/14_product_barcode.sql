-- HOMIQLO — auto-generated unique product barcodes
--
-- ⚠️ OPTIONAL / NOT REQUIRED — the app no longer depends on this file. The SKU
-- itself is now generated client-side (generateSku() in src/lib/inventory-utils.ts)
-- and used directly as the scannable barcode, so a product has exactly ONE
-- identifier instead of two different numbers. The hooks in src/hooks/use-pos.ts
-- and src/hooks/use-inventory.ts do NOT select a `barcode` column — running or
-- skipping this file has no effect on app behavior. Kept only in case a future
-- integration (e.g. a real GS1/EAN-13 registration) needs a separate DB-generated
-- code; do not run it expecting the app to start using it.
--
-- Safe to re-run.

-- 1) Sequence that feeds the 9-digit body of each barcode.
create sequence if not exists product_barcode_seq start with 1;

-- 2) EAN-13 check digit for a 12-digit body.
create or replace function ean13_check_digit(body12 text)
returns text
language plpgsql
immutable
as $$
declare
  total int := 0;
  i int;
  d int;
begin
  for i in 1..12 loop
    d := substr(body12, i, 1)::int;
    -- odd positions (1-indexed) weight 1, even positions weight 3
    total := total + d * (case when i % 2 = 0 then 3 else 1 end);
  end loop;
  return ((10 - (total % 10)) % 10)::text;
end;
$$;

-- 3) Produce the next full EAN-13 (13 digits).
create or replace function generate_product_barcode()
returns text
language plpgsql
as $$
declare
  body12 text;
begin
  -- '890' (India) + 9-digit zero-padded sequence = 12-digit body.
  body12 := '890' || lpad(nextval('product_barcode_seq')::text, 9, '0');
  return body12 || ean13_check_digit(body12);
end;
$$;

-- 4) Add the column (nullable first so we can backfill, then enforce).
alter table products add column if not exists barcode text;

update products set barcode = generate_product_barcode() where barcode is null;

alter table products alter column barcode set not null;
alter table products alter column barcode set default generate_product_barcode();

create unique index if not exists products_barcode_key on products (barcode);

-- 5) Keep it filled on future inserts even if the app omits it.
create or replace function set_product_barcode()
returns trigger
language plpgsql
as $$
begin
  if new.barcode is null then
    new.barcode := generate_product_barcode();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_product_barcode on products;
create trigger trg_set_product_barcode
  before insert on products
  for each row execute function set_product_barcode();
