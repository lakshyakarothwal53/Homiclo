-- HOMIQLO — Settings module seed data (mirrors the old ROLES mock in roles.tsx)
-- Run AFTER 01_schema.sql. Safe to re-run.

truncate roles;

insert into roles (role, users, description, permissions) values
  ('Super Admin',     1,  'Full system access',  'All'),
  ('Manager',         4,  'Branch & operations',  '32 permissions'),
  ('Cashier',         12, 'POS access only',      '8 permissions'),
  ('Inventory Staff', 6,  'Stock management',     '14 permissions'),
  ('Sales Executive', 18, 'Sales & customers',    '12 permissions');
