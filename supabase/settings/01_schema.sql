-- HOMIQLO — Settings module: Roles & Permissions schema
-- Run this FIRST in the Supabase SQL editor.

create table if not exists roles (
  role        text primary key,
  users       integer not null default 0,
  description text not null,
  permissions text not null
);
