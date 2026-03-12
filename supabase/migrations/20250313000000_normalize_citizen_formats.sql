-- Migration: Normalize existing citizen data to required formats
-- Run this in the Supabase SQL Editor. Requires: citizens table must exist.
--
-- Formats applied:
--   Bank accounts: create table if missing, then flat citizen fields → first row
--   SSN:           xxx-xx-xxxx (9 digits with dashes)
--   Phone:         xxx-xxx-xxxx (10 digits with dashes)
--   DOB/Due:       4-digit year enforced via CHECK (1000–9999)

-- ─────────────────────────────────────────────────────────────────────────────
-- 0a. Ensure citizen_bank_accounts table exists (create if not in schema yet)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists citizen_bank_accounts (
  id               serial primary key,
  citizen_id       int  not null references citizens(id) on delete cascade,
  bank             text not null default '',
  credit_card      text not null default '',
  expiration_date  text not null default '',
  cvv              text not null default '',
  routing_number   text not null default '',
  account_number   text not null default '',
  due_date         date,
  username         text not null default '',
  password         text not null default ''
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 0b. Migrate flat bank fields into citizen_bank_accounts (as first element)
--    Each citizen's existing bank/credit_card/... becomes one row in the new table.
--    Skips citizens that already have at least one bank account row (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────
insert into citizen_bank_accounts (
  citizen_id,
  bank,
  credit_card,
  expiration_date,
  cvv,
  routing_number,
  account_number,
  due_date,
  username,
  password
)
select
  c.id,
  coalesce(c.banks[1], ''),
  coalesce(c.credit_card, ''),
  coalesce(c.expiration_date, ''),
  coalesce(c.cvv, ''),
  coalesce(c.routing_number, ''),
  coalesce(c.account_number, ''),
  c.due_date,
  coalesce(c.username, ''),
  coalesce(c.password, '')
from citizens c
where not exists (
  select 1 from citizen_bank_accounts ba where ba.citizen_id = c.id
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SSN: normalize to xxx-xx-xxxx
--    Strip non-digits, take first 9, format as 3-2-4
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  r record;
  d text;
  fmt text;
begin
  for r in select id, ssn from citizens where ssn is not null and ssn <> ''
  loop
    d := regexp_replace(r.ssn, '[^0-9]', '', 'g');
    d := left(d, 9);
    if length(d) >= 9 then
      fmt := left(d, 3) || '-' || substring(d from 4 for 2) || '-' || substring(d from 6 for 4);
      update citizens set ssn = fmt where id = r.id;
    end if;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Phone: normalize to xxx-xxx-xxxx
--    Strip non-digits, take first 10, format as 3-3-4
--    (e.g. (555) 123-4567 → 555-123-4567)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  r record;
  d text;
  fmt text;
begin
  for r in select id, phone from citizens where phone is not null and phone <> ''
  loop
    d := regexp_replace(r.phone, '[^0-9]', '', 'g');
    d := left(d, 10);
    if length(d) >= 10 then
      fmt := left(d, 3) || '-' || substring(d from 4 for 3) || '-' || substring(d from 7 for 4);
      update citizens set phone = fmt where id = r.id;
    end if;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DOB / Due date: CHECK constraints for 4-digit year (1000–9999)
--    PostgreSQL date type already only allows valid dates; this restricts year.
-- ─────────────────────────────────────────────────────────────────────────────
alter table citizens
  drop constraint if exists citizens_dob_year_4digits;

alter table citizens
  add constraint citizens_dob_year_4digits
  check (extract(year from dob) >= 1000 and extract(year from dob) <= 9999);

alter table citizens
  drop constraint if exists citizens_due_date_year_4digits;

alter table citizens
  add constraint citizens_due_date_year_4digits
  check (extract(year from due_date) >= 1000 and extract(year from due_date) <= 9999);

-- citizen_bank_accounts.due_date (nullable)
alter table citizen_bank_accounts
  drop constraint if exists citizen_bank_accounts_due_date_year_4digits;

alter table citizen_bank_accounts
  add constraint citizen_bank_accounts_due_date_year_4digits
  check (due_date is null or (extract(year from due_date) >= 1000 and extract(year from due_date) <= 9999));
