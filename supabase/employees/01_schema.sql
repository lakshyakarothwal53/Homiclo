-- HOMIQLO employees module schema

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text not null,
  role text not null,
  branch text not null,
  join_date text not null,
  status text not null default 'Active',
  salary text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists employee_logins (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  employee_role text not null,
  branch text not null,
  login_time text not null,
  logout_time text,
  duration text,
  status text not null default 'online',
  last_seen text not null,
  created_at timestamptz default now()
);

create table if not exists employee_activity (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  branch text not null,
  activity text not null,
  timestamp text not null,
  details text,
  created_at timestamptz default now()
);

create table if not exists employee_locations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  branch text not null,
  latitude numeric not null,
  longitude numeric not null,
  address text not null,
  timestamp text not null,
  accuracy text,
  created_at timestamptz default now()
);

create table if not exists employee_reports (
  id uuid primary key default gen_random_uuid(),
  report text not null,
  period text not null,
  generated text not null,
  status text not null,
  created_at timestamptz default now()
);

create index if not exists idx_employees_branch on employees(branch);
create index if not exists idx_employees_status on employees(status);
create index if not exists idx_employee_logins_employee_id on employee_logins(employee_id);
create index if not exists idx_employee_logins_status on employee_logins(status);
create index if not exists idx_employee_activity_employee_id on employee_activity(employee_id);
create index if not exists idx_employee_locations_employee_id on employee_locations(employee_id);
