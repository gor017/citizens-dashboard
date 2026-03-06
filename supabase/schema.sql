-- Citizens Dashboard – Supabase Schema
-- Run this in the Supabase SQL Editor

-- ─────────────────────────────────────────
-- Banks
-- ─────────────────────────────────────────
create table if not exists banks (
  id   serial primary key,
  name text not null unique
);

insert into banks (name) values
  ('Chase Bank'),
  ('Wells Fargo'),
  ('Bank of America'),
  ('Citibank'),
  ('US Bank')
on conflict (name) do nothing;

-- ─────────────────────────────────────────
-- Citizens
-- ─────────────────────────────────────────
create table if not exists citizens (
  id              serial primary key,
  first_name      text        not null,
  middle_name     text        not null default '',
  last_name       text        not null,
  dob             date        not null,
  ssn             text        not null,
  address         text        not null,
  city            text        not null,
  state           char(2)     not null,
  zip             text        not null,
  phone           text        not null,
  banks           text[]      not null default '{}',
  credit_card     text        not null,
  expiration_date text        not null,
  cvv             text        not null,
  routing_number  text        not null,
  account_number  text        not null,
  due_date        date        not null,
  active          boolean     not null default true,
  username        text        not null unique,
  password        text        not null default '',
  password_hash   text        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists citizens_updated_at on citizens;
create trigger citizens_updated_at
  before update on citizens
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────
-- Memberships
-- ─────────────────────────────────────────
create table if not exists memberships (
  id          serial primary key,
  citizen_id  int  not null references citizens(id) on delete cascade,
  name        text not null,
  login       text not null,
  password    text not null,
  number      text not null
);

-- ─────────────────────────────────────────
-- Custom Fields
-- ─────────────────────────────────────────
create table if not exists custom_fields (
  id          serial primary key,
  citizen_id  int  not null references citizens(id) on delete cascade,
  name        text not null,
  value       text not null default ''
);

-- ─────────────────────────────────────────
-- Migration: add plain-text password column (run once on existing tables)
-- ─────────────────────────────────────────
alter table citizens add column if not exists password text not null default '';

-- ─────────────────────────────────────────
-- Row Level Security (disable for service role)
-- ─────────────────────────────────────────
-- We use the service role key server-side only, so RLS is not required.
-- Enable it here if you want extra protection.
-- alter table citizens enable row level security;
