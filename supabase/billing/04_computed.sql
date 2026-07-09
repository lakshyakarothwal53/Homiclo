-- HOMIQLO — Billing: computed dashboard stats
-- Run AFTER 03_rls.sql in the Supabase SQL editor.
--
-- What this does:
--   1. Adds bill_date DATE + amount_num NUMERIC to key tables so SQL can aggregate.
--   2. Back-fills the seed rows and inserts extra spread-out rows for the trend chart.
--   3. Creates billing_dashboard_stats() RPC — returns live computed stat values.
--   4. Creates billing_revenue_trend_live view — last 14 days of paid sales by date.

-- ─── 1. Schema additions ────────────────────────────────────────────────────

alter table billing_sales_bills
  add column if not exists bill_date  date    not null default current_date,
  add column if not exists amount_num numeric not null default 0;

alter table billing_payments
  add column if not exists pay_date   date    not null default current_date,
  add column if not exists amount_num numeric not null default 0;

alter table billing_refunds
  add column if not exists amount_num numeric not null default 0;

-- ─── 2. Back-fill seed rows ─────────────────────────────────────────────────

update billing_sales_bills set bill_date = current_date,     amount_num = 4616  where invoice = 'INV-10248';
update billing_sales_bills set bill_date = current_date,     amount_num = 1820  where invoice = 'INV-10247';
update billing_sales_bills set bill_date = current_date,     amount_num = 12400 where invoice = 'INV-10246';
update billing_sales_bills set bill_date = current_date - 1, amount_num = 2950  where invoice = 'INV-10245';
update billing_sales_bills set bill_date = current_date - 1, amount_num = 680   where invoice = 'INV-10244';

update billing_payments set pay_date = current_date,     amount_num = 4616 where receipt = 'REC-4521';
update billing_payments set pay_date = current_date,     amount_num = 1820 where receipt = 'REC-4520';
update billing_payments set pay_date = current_date - 1, amount_num = 2950 where receipt = 'REC-4519';
update billing_payments set pay_date = current_date - 2, amount_num = 8200 where receipt = 'REC-4518';

update billing_refunds set amount_num = 680  where refund = 'REF-201';
update billing_refunds set amount_num = 1299 where refund = 'REF-200';
update billing_refunds set amount_num = 450  where refund = 'REF-199';

-- ─── 3. Extra seed rows to fill the 14-day revenue trend ────────────────────
-- These simulate realistic daily sales spread across the past two weeks.

insert into billing_sales_bills (invoice, date, customer, amount, payment, status, bill_date, amount_num) values
  ('INV-10200', to_char(current_date - 13, 'DD Mon'), 'Walk-in',   '₹64,000',   'Cash', 'Paid', current_date - 13,  64000),
  ('INV-10201', to_char(current_date - 12, 'DD Mon'), 'Priya S.',  '₹72,000',   'UPI',  'Paid', current_date - 12,  72000),
  ('INV-10202', to_char(current_date - 11, 'DD Mon'), 'Arjun K.',  '₹81,000',   'Card', 'Paid', current_date - 11,  81000),
  ('INV-10203', to_char(current_date - 10, 'DD Mon'), 'Sunita R.', '₹94,000',   'NEFT', 'Paid', current_date - 10,  94000),
  ('INV-10204', to_char(current_date - 9,  'DD Mon'), 'Deepak M.', '₹1,08,000', 'UPI',  'Paid', current_date - 9,  108000),
  ('INV-10205', to_char(current_date - 8,  'DD Mon'), 'Neha V.',   '₹1,21,000', 'Card', 'Paid', current_date - 8,  121000),
  ('INV-10206', to_char(current_date - 7,  'DD Mon'), 'Raj P.',    '₹1,34,000', 'UPI',  'Paid', current_date - 7,  134000),
  ('INV-10207', to_char(current_date - 6,  'DD Mon'), 'Walk-in',   '₹58,000',   'Cash', 'Paid', current_date - 6,   58000),
  ('INV-10208', to_char(current_date - 5,  'DD Mon'), 'Meera T.',  '₹69,000',   'UPI',  'Paid', current_date - 5,   69000),
  ('INV-10209', to_char(current_date - 4,  'DD Mon'), 'Kiran B.',  '₹88,000',   'Card', 'Paid', current_date - 4,   88000),
  ('INV-10210', to_char(current_date - 3,  'DD Mon'), 'Pooja L.',  '₹1,12,000', 'NEFT', 'Paid', current_date - 3,  112000)
on conflict (invoice) do nothing;

-- ─── 4. RPC: billing_dashboard_stats() ──────────────────────────────────────
-- Returns a JSONB object with live computed values for all four stat cards.

create or replace function billing_dashboard_stats()
returns jsonb
language sql
stable
security definer
as $$
  select jsonb_build_object(
    'todayRevenue',
      coalesce((
        select sum(amount_num) from billing_sales_bills
        where bill_date = current_date and status = 'Paid'
      ), 0),

    'todayInvoiceCount',
      coalesce((
        select count(*) from billing_sales_bills
        where bill_date = current_date
      ), 0),

    'pendingPayments',
      coalesce((
        select sum(amount_num) from billing_sales_bills
        where status = 'Pending'
      ), 0),

    'pendingCount',
      coalesce((
        select count(*) from billing_sales_bills
        where status = 'Pending'
      ), 0),

    'thisMonthRevenue',
      coalesce((
        select sum(amount_num) from billing_sales_bills
        where date_trunc('month', bill_date) = date_trunc('month', current_date)
          and status = 'Paid'
      ), 0),

    'lastMonthRevenue',
      coalesce((
        select sum(amount_num) from billing_sales_bills
        where date_trunc('month', bill_date) = date_trunc('month', current_date - interval '1 month')
          and status = 'Paid'
      ), 0),

    'refundsAmount',
      coalesce((
        select sum(amount_num) from billing_refunds
        where status in ('Completed', 'Processing')
      ), 0),

    'refundsThisWeek',
      coalesce((
        select count(*) from billing_refunds
        where status in ('Completed', 'Processing')
      ), 0)
  );
$$;

grant execute on function billing_dashboard_stats() to anon, authenticated;

-- ─── 5. Live revenue trend view ─────────────────────────────────────────────
-- Groups paid sales by date for the last 14 days.

create or replace view billing_revenue_trend_live as
select
  to_char(bill_date, 'DD Mon') as d,
  sum(amount_num)::integer      as revenue,
  bill_date                     as sort_key
from billing_sales_bills
where bill_date >= current_date - 13
  and status = 'Paid'
group by bill_date
order by bill_date;

grant select on billing_revenue_trend_live to anon, authenticated;
