-- Add FL Name field to citizens
alter table citizens
  add column if not exists fl_name text not null default '';

