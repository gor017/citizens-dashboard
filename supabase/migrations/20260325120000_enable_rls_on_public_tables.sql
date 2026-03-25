-- Enable Row Level Security (RLS) on all public tables.
--
-- IMPORTANT:
-- - This project uses the Supabase *service role* key server-side (see `lib/supabase.ts`),
--   which bypasses RLS in Supabase.
-- - We are enabling RLS *without policies* for now. That means any queries executed
--   with anon/authenticated keys will be denied until you add appropriate policies.
--
-- Tables created in `supabase/schema.sql`:
-- - banks
-- - citizens
-- - citizen_bank_accounts
-- - memberships
-- - custom_fields

alter table banks enable row level security;
alter table citizens enable row level security;
alter table citizen_bank_accounts enable row level security;
alter table memberships enable row level security;
alter table custom_fields enable row level security;

