-- Row-level security for employees module
-- NOTE: These are demo-grade policies. Tighten before production.

alter table employees enable row level security;
alter table employee_logins enable row level security;
alter table employee_activity enable row level security;
alter table employee_locations enable row level security;
alter table employee_reports enable row level security;

-- employees: read for all authenticated users
create policy employees_read on employees for select to anon, authenticated using (true);
-- employees: write for authenticated users (demo-grade)
create policy employees_insert on employees for insert to anon, authenticated with check (true);
create policy employees_update on employees for update to anon, authenticated using (true) with check (true);
create policy employees_delete on employees for delete to anon, authenticated using (true);

-- employee_logins: read for all
create policy employee_logins_read on employee_logins for select to anon, authenticated using (true);
-- employee_logins: write for mutations
create policy employee_logins_insert on employee_logins for insert to anon, authenticated with check (true);
create policy employee_logins_update on employee_logins for update to anon, authenticated using (true) with check (true);
create policy employee_logins_delete on employee_logins for delete to anon, authenticated using (true);

-- employee_activity: read for all
create policy employee_activity_read on employee_activity for select to anon, authenticated using (true);
-- employee_activity: write for mutations
create policy employee_activity_insert on employee_activity for insert to anon, authenticated with check (true);
create policy employee_activity_update on employee_activity for update to anon, authenticated using (true) with check (true);

-- employee_locations: read for all
create policy employee_locations_read on employee_locations for select to anon, authenticated using (true);
-- employee_locations: write for mutations
create policy employee_locations_insert on employee_locations for insert to anon, authenticated with check (true);
create policy employee_locations_update on employee_locations for update to anon, authenticated using (true) with check (true);

-- employee_reports: read for all
create policy employee_reports_read on employee_reports for select to anon, authenticated using (true);
