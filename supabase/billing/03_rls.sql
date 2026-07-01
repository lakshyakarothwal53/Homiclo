-- HOMIQLO — Billing module Row Level Security
-- Run AFTER 02_seed.sql.
-- DEMO-GRADE: anon + authenticated read everything; authenticated can insert
-- new bills. Tighten to staff/admin roles before production.

alter table billing_dashboard      enable row level security;
alter table billing_revenue_trend  enable row level security;
alter table billing_sales_bills    enable row level security;
alter table billing_payments       enable row level security;
alter table billing_refunds        enable row level security;
alter table billing_tax_invoices   enable row level security;
alter table billing_tally_log      enable row level security;
alter table billing_gateway_txns   enable row level security;
alter table billing_reports        enable row level security;

-- read policies
create policy billing_dashboard_read      on billing_dashboard      for select to anon, authenticated using (true);
create policy billing_revenue_trend_read  on billing_revenue_trend  for select to anon, authenticated using (true);
create policy billing_sales_bills_read    on billing_sales_bills    for select to anon, authenticated using (true);
create policy billing_payments_read       on billing_payments       for select to anon, authenticated using (true);
create policy billing_refunds_read        on billing_refunds        for select to anon, authenticated using (true);
create policy billing_tax_invoices_read   on billing_tax_invoices   for select to anon, authenticated using (true);
create policy billing_tally_log_read      on billing_tally_log      for select to anon, authenticated using (true);
create policy billing_gateway_txns_read   on billing_gateway_txns   for select to anon, authenticated using (true);
create policy billing_reports_read        on billing_reports        for select to anon, authenticated using (true);

-- write policy: Generate Invoice inserts a new sales bill
create policy billing_sales_bills_insert
  on billing_sales_bills for insert
  to anon, authenticated
  with check (true);
