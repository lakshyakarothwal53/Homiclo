-- HOMIQLO — auto-generated unique product barcodes
-- Run this FOURTEENTH (after 13_completion_pack.sql), in the Supabase SQL editor.
--
-- Why: the app printed CODE128 labels from the free-text `sku`, which is typed by
-- hand and only unique per-branch — two branches could share a SKU and a typo could
-- collide. This adds a dedicated, immutable, GLOBALLY-unique `barcode` column that is
-- generated entirely DB-side (no app change needed to create it). We emit a valid
-- EAN-13 (prefix 890 = GS1 India range + a 9-digit sequence + check digit) so any
-- 1D scanner — including the Impact IHS310X — reads it.
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
