-- Add Notes field to citizens
alter table citizens
  add column if not exists notes text not null default '';

