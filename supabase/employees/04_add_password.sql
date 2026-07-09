-- HOMIQLO — Employee Password Authentication
-- Run this FOURTH after RLS policies
-- Adds password_hash column for employee login authentication

-- Add password_hash column to employees table
alter table employees add column if not exists password_hash text;

-- Create index on email for faster login lookups
create index if not exists idx_employees_email on employees(email);

-- Create index on password_hash for authentication
create index if not exists idx_employees_password_hash on employees(password_hash);

-- Add comments for clarity
comment on column employees.password_hash is 'SHA-256 hashed password for employee login authentication';
