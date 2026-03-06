import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, SessionPayload } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

// ── Helper: map DB row → camelCase Citizen ──────────────────────────────────
function mapCitizen(row: Record<string, unknown>, memberships: unknown[], customFields: unknown[]) {
  return {
    id: row.id,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    dob: row.dob,
    ssn: row.ssn,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    phone: row.phone,
    bank: row.banks,
    creditCard: row.credit_card,
    expirationDate: row.expiration_date,
    cvv: row.cvv,
    routingNumber: row.routing_number,
    accountNumber: row.account_number,
    dueDate: row.due_date,
    active: row.active,
    username: row.username,
    password: row.password,
    memberships,
    customFields,
  };
}

// ── GET /api/citizens ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const session = authResult as SessionPayload;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const bank = searchParams.get('bank') ?? '';
  const bankExclude = searchParams.get('bankExclude') ?? '';
  const activeFilter = searchParams.get('active') ?? 'all';
  const dueSoon = searchParams.get('dueSoon') === 'true';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') ?? '10', 10)));

  let query = supabase.from('citizens').select('*', { count: 'exact' });

  // Citizens can only see their own record
  if (session.role === 'citizen') {
    query = query.eq('id', session.userId!);
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,ssn.ilike.%${search}%,credit_card.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  if (bank) {
    query = query.contains('banks', [bank]);
  }

  if (bankExclude) {
    query = query.not('banks', 'cs', `{${bankExclude}}`);
  }

  if (activeFilter === 'active') {
    query = query.eq('active', true);
  } else if (activeFilter === 'inactive') {
    query = query.eq('active', false);
  }

  if (dueSoon) {
    const today = new Date().toISOString().split('T')[0];
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    query = query.gte('due_date', today).lte('due_date', threeDaysLater);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to).order('id', { ascending: true });

  const { data: rows, error, count } = await query;
  if (error) {
    console.error('[GET /api/citizens]', error.message, error.code);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch memberships + custom_fields for each citizen
  const ids = (rows ?? []).map((r) => r.id as number);
  const [mbRes, cfRes] = await Promise.all([
    ids.length
      ? supabase.from('memberships').select('*').in('citizen_id', ids)
      : { data: [], error: null },
    ids.length
      ? supabase.from('custom_fields').select('*').in('citizen_id', ids)
      : { data: [], error: null },
  ]);

  const membershipsById: Record<number, unknown[]> = {};
  const customFieldsById: Record<number, unknown[]> = {};
  for (const m of mbRes.data ?? []) {
    const row = m as Record<string, unknown>;
    const cid = row.citizen_id as number;
    if (!membershipsById[cid]) membershipsById[cid] = [];
    membershipsById[cid].push({
      id: row.id,
      name: row.name,
      login: row.login,
      password: row.password,
      number: row.number,
    });
  }
  for (const f of cfRes.data ?? []) {
    const row = f as Record<string, unknown>;
    const cid = row.citizen_id as number;
    if (!customFieldsById[cid]) customFieldsById[cid] = [];
    customFieldsById[cid].push({ id: row.id, name: row.name, value: row.value });
  }

  const citizens = (rows ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return mapCitizen(
      row,
      membershipsById[row.id as number] ?? [],
      customFieldsById[row.id as number] ?? []
    );
  });

  return NextResponse.json({ citizens, total: count ?? 0 });
}

// ── POST /api/citizens ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json();
  const {
    firstName, middleName, lastName, dob, ssn, address, city, state, zip, phone,
    bank, creditCard, expirationDate, cvv, routingNumber, accountNumber, dueDate,
    active, username, password, memberships = [], customFields = [],
  } = body;

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const { data: citizen, error } = await supabase
    .from('citizens')
    .insert({
      first_name: firstName,
      middle_name: middleName ?? '',
      last_name: lastName,
      dob,
      ssn,
      address,
      city,
      state,
      zip,
      phone,
      banks: bank ?? [],
      credit_card: creditCard,
      expiration_date: expirationDate,
      cvv,
      routing_number: routingNumber,
      account_number: accountNumber,
      due_date: dueDate,
      active: active ?? true,
      username,
      password,
      password_hash: passwordHash,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const citizenId = citizen.id as number;

  // Insert memberships
  if (memberships.length > 0) {
    await supabase.from('memberships').insert(
      memberships.map((m: { name: string; login: string; password: string; number: string }) => ({
        citizen_id: citizenId,
        name: m.name,
        login: m.login,
        password: m.password,
        number: m.number,
      }))
    );
  }

  // Insert custom fields
  if (customFields.length > 0) {
    await supabase.from('custom_fields').insert(
      customFields.map((f: { name: string; value: string }) => ({
        citizen_id: citizenId,
        name: f.name,
        value: f.value,
      }))
    );
  }

  return NextResponse.json({ id: citizenId }, { status: 201 });
}
