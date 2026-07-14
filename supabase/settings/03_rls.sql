-- HOMIQLO — Settings module Row Level Security
-- Run AFTER 02_seed.sql.
-- DEMO-GRADE: anon + authenticated read everything. Tighten to admin roles
-- before production.

alter table roles enable row level security;

create policy roles_read on roles for select to anon, authenticated using (true);
