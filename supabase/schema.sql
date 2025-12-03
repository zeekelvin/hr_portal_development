create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  role text not null,
  status text not null default 'onboarding',
  location text,
  hire_date date,
  created_at timestamptz default now()
);

create table if not exists credentials (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  type text not null,
  number text,
  issue_date date,
  expiry_date date,
  status text default 'valid',
  created_at timestamptz default now()
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  type text,
  severity text,
  description text,
  status text default 'open',
  occurred_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists trainings (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists employee_trainings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  training_id uuid references trainings(id) on delete cascade,
  assigned_at timestamptz default now(),
  completed_at timestamptz,
  status text default 'assigned'
);
