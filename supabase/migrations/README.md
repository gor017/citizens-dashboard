# Supabase migrations

## How to run

### Option A: Supabase Dashboard (recommended)

1. Open your project: [supabase.com/dashboard](https://supabase.com/dashboard) → select the project.
2. Go to **SQL Editor**.
3. Run in this order:

   **Step 1 — Schema (only if you haven’t applied it yet)**  
   Open `supabase/schema.sql` in your repo, copy its full contents, paste into the SQL Editor, and click **Run**.

   **Step 2 — Data migration**  
   Open `supabase/migrations/20250313000000_normalize_citizen_formats.sql`, copy its full contents, paste into the SQL Editor, and click **Run**.

### Option B: Supabase CLI

If you use the [Supabase CLI](https://supabase.com/docs/guides/cli) and have linked this project (`supabase link`):

```bash
# Apply schema (if needed) — run the SQL in schema.sql manually or via a one-off migration
# Then apply migrations:
supabase db push
```

If `supabase db push` doesn’t pick up your migrations, run the SQL files manually as in Option A.

## What the data migration does

- **Bank accounts**: For each citizen that has no rows in `citizen_bank_accounts` yet, inserts one row from the flat fields: first bank from `banks` array, plus `credit_card`, `expiration_date`, `cvv`, `routing_number`, `account_number`, `due_date`, `username`, `password`. That row appears as the first (and only) account in the new Bank Accounts section until the user adds more.
- **SSN**: Converts to `xxx-xx-xxxx` (strips non-digits, keeps first 9, adds dashes). Rows with fewer than 9 digits are left unchanged.
- **Phone**: Converts to `xxx-xxx-xxxx` (e.g. `(555) 123-4567` → `555-123-4567`). Rows with fewer than 10 digits are left unchanged.
- **DOB / Due date**: Adds CHECK constraints so the year is between 1000 and 9999 (4-digit year). Existing dates are not modified; invalid years would prevent the constraint from being added until data is fixed.

**Note:** If `citizen_bank_accounts` does not exist yet, run the main schema first so that table (and the constraint on it) is created.
