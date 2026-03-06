/**
 * Seed script – inserts the 25 mock citizens (+ memberships + custom fields)
 * into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires .env.local to have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set.
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  // ── Mock data (mirrors the original mockCitizens array) ────────────────────
  const PASSWORD_HASH = await bcrypt.hash('citizen123', 10);

  const mockCitizens = Array.from({ length: 25 }, (_, i) => ({
    first_name:      ['John', 'Sarah', 'Michael', 'Emily', 'David'][i % 5],
    middle_name:     ['Allen', 'Marie', 'James', 'Rose', 'Lee'][i % 5],
    last_name:       ['Smith', 'Johnson', 'Davis', 'Brown', 'Wilson'][i % 5],
    dob:             '1985-03-15',
    ssn:             `${123 + i}-45-6789`,
    address:         `${123 + i} Main St`,
    city:            ['Springfield', 'Portland', 'Austin', 'Seattle', 'Boston'][i % 5],
    state:           ['IL', 'OR', 'TX', 'WA', 'MA'][i % 5],
    zip:             `${62701 + i}`,
    phone:           `(555) ${123 + i}-4567`,
    banks:           ([['Chase Bank'], ['Wells Fargo'], ['Bank of America', 'Chase Bank']] as string[][])[i % 3],
    credit_card:     `4532-1234-5678-${9010 + i}`,
    expiration_date: '12/28',
    cvv:             '123',
    routing_number:  '021000021',
    account_number:  `1234567${890 + i}`,
    due_date:        i < 3
      ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : '2026-02-15',
    active:          i % 2 === 0,
    username:        ['john.smith', 'sarah.johnson', 'michael.davis', 'emily.brown', 'david.wilson'][i % 5],
    password:        'citizen123',
    password_hash:   PASSWORD_HASH,
  }));

  // Deduplicate by username (the 25 rows cycle through 5 names, DB requires uniqueness)
  const seen = new Set<string>();
  const uniqueCitizens = mockCitizens.filter(c => {
    if (seen.has(c.username)) return false;
    seen.add(c.username);
    return true;
  });

  console.log('Seeding citizens…');

  // Upsert on username so the script is re-runnable without duplicates
  const { data: inserted, error: citizenError } = await supabase
    .from('citizens')
    .upsert(uniqueCitizens, { onConflict: 'username' })
    .select('id, username');

  if (citizenError) {
    console.error('Error inserting citizens:', citizenError.message);
    process.exit(1);
  }

  console.log(`✓ ${inserted?.length ?? 0} citizens upserted`);

  // Build a username → id map
  const idByUsername: Record<string, number> = {};
  for (const row of inserted ?? []) {
    idByUsername[row.username as string] = row.id as number;
  }

  // ── Memberships ────────────────────────────────────────────────────────────
  const usernames = ['john.smith', 'sarah.johnson', 'michael.davis', 'emily.brown', 'david.wilson'];
  const memberships = usernames.flatMap(u => {
    const cid = idByUsername[u];
    if (!cid) return [];
    return [{
      citizen_id: cid,
      name:       'Gym Membership',
      login:      'user123',
      password:   'pass123',
      number:     '1234567890',
    }];
  });

  // Delete existing memberships for these citizens then re-insert
  const citizenIds = Object.values(idByUsername);
  await supabase.from('memberships').delete().in('citizen_id', citizenIds);

  if (memberships.length > 0) {
    const { error: mbError } = await supabase.from('memberships').insert(memberships);
    if (mbError) {
      console.error('Error inserting memberships:', mbError.message);
      process.exit(1);
    }
    console.log(`✓ ${memberships.length} memberships inserted`);
  }

  // ── Custom Fields ──────────────────────────────────────────────────────────
  const customFields = usernames.flatMap(u => {
    const cid = idByUsername[u];
    if (!cid) return [];
    return [{
      citizen_id: cid,
      name:       'Emergency Contact',
      value:      'Jane Doe - (555) 999-8888',
    }];
  });

  await supabase.from('custom_fields').delete().in('citizen_id', citizenIds);

  if (customFields.length > 0) {
    const { error: cfError } = await supabase.from('custom_fields').insert(customFields);
    if (cfError) {
      console.error('Error inserting custom fields:', cfError.message);
      process.exit(1);
    }
    console.log(`✓ ${customFields.length} custom fields inserted`);
  }

  console.log('\nSeeding complete!');
  console.log('Login with any of these credentials (password: citizen123):');
  usernames.forEach(u => console.log(`  • ${u}`));
}

seed();
