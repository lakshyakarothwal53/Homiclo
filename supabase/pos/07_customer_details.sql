-- HOMIQLO — POS: customer details + coupon on the checkout transaction
-- Run this SEVENTH (after 06_transaction_items.sql).
--
-- Why: "Collect Payment" now captures the buyer's details before the invoice is
-- created (name/mobile/DOB/invoice-date mandatory, GSTIN optional) and lets the
-- cashier apply a coupon code whose discount is pulled from discount settings.
-- These columns persist that information on the summary row so the Billing >
-- Sales Bills page (which now reads straight from pos_transactions) can show the
-- customer and invoice date.
--
-- All columns are nullable so older reads keep working; the UI populates them on
-- new sales. Safe to re-run.

alter table pos_transactions add column if not exists customer_name   text;
alter table pos_transactions add column if not exists customer_mobile text;
alter table pos_transactions add column if not exists customer_dob    text;
alter table pos_transactions add column if not exists customer_gstin  text;
alter table pos_transactions add column if not exists invoice_date    text;
alter table pos_transactions add column if not exists coupon_code     text;
