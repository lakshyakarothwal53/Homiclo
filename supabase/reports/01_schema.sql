-- HOMIQLO — Reports module schema
-- Run this FIRST in the Supabase SQL editor.
--
-- All six report listings (sales, attendance, employee, inventory, discount,
-- financial) share the same ReportRow shape, so they live in one table keyed by
-- `category`. The hook useReports(category) selects by that column; the route
-- components are unchanged (they still receive a ReportRow[]).
--
-- NOTE: `size` is a display string ("124 KB", "2.4 MB") — stored as TEXT to mirror
-- the mock fixtures verbatim. Normalize to bytes later if the UI computes its own.

create table if not exists reports (
  id        text primary key,
  category  text not null,
  name      text not null,
  type      text,
  period    text,
  generated text,
  size      text
);

create index if not exists reports_category_idx on reports (category);
