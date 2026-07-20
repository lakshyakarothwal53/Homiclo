-- HOMIQLO — POS: created_at on branch-scoped transactions
-- Run this NINTH (after 08_sales_bills_delete.sql).
--
-- Why: pos_transactions (the global table) has always had created_at, but
-- pos_transactions_branches never did — only a time-of-day string with no
-- date. That meant a branch-scoped POS Transactions view (Noida, Branch 2,
-- etc.) had no way to show or filter by date, and had to order by invoice
-- number instead of actual transaction time. This backfills existing rows to
-- now() (best-effort — their real timestamp isn't recoverable) and every new
-- sale gets an accurate one going forward via the same DEFAULT now() the
-- global table already relies on.
--
-- Safe to re-run.

alter table pos_transactions_branches
  add column if not exists created_at timestamptz not null default now();
