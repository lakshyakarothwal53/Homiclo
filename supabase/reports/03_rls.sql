-- HOMIQLO — Row Level Security for the reports table
-- Run this THIRD, after 01_schema.sql and 02_seed.sql.
--
-- ⚠️ DEMO-GRADE: read-only for the public anon key. The reports module only reads,
-- so no write policies are needed. Tighten to authenticated admins before prod.

alter table reports enable row level security;

create policy reports_read on reports
  for select to anon, authenticated using (true);
