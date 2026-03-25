import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, SessionPayload } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

type Params = { params: Promise<{ id: string }> };

function mapBankAccount(ba: Record<string, unknown>) {
  return {
    id: ba.id,
    bank: ba.bank ?? '',
    creditCard: ba.credit_card ?? '',
    expirationDate: ba.expiration_date ?? '',
    cvv: ba.cvv ?? '',
    routingNumber: ba.routing_number ?? '',
    accountNumber: ba.account_number ?? '',
    dueDate: ba.due_date ?? '',
    username: ba.username ?? '',
    password: ba.password ?? '',
  };
}

function mapCitizen(
  row: Record<string, unknown>,
  memberships: unknown[],
  customFields: unknown[],
  bankAccounts: Array<Record<string, unknown>> = []
) {
  const accounts =
    bankAccounts.length > 0
      ? bankAccounts.map(mapBankAccount)
      : row.credit_card
        ? [
            {
              id: 0,
              bank: Array.isArray(row.banks) ? (row.banks as string[])[0] ?? '' : '',
              creditCard: row.credit_card,
              expirationDate: row.expiration_date,
              cvv: row.cvv,
              routingNumber: row.routing_number,
              accountNumber: row.account_number,
              dueDate: row.due_date,
              username: row.username,
              password: row.password,
            },
          ]
        : [];
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
    notes: row.notes ?? '',
    bankAccounts: accounts,
    memberships,
    customFields,
  };
}

// ── GET /api/citizens/[id] ───────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const session = authResult as SessionPayload;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);

  if (session.role === 'citizen' && session.userId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: row, error } = await supabase
    .from('citizens')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [mbRes, cfRes, baRes] = await Promise.all([
    supabase.from('memberships').select('*').eq('citizen_id', id),
    supabase.from('custom_fields').select('*').eq('citizen_id', id),
    supabase.from('citizen_bank_accounts').select('*').eq('citizen_id', id),
  ]);

  const memberships = (mbRes.data ?? []).map((m) => {
    const r = m as Record<string, unknown>;
    return { id: r.id, name: r.name, login: r.login, password: r.password, number: r.number };
  });
  const customFields = (cfRes.data ?? []).map((f) => {
    const r = f as Record<string, unknown>;
    return { id: r.id, name: r.name, value: r.value };
  });
  const bankAccounts = (baRes.data ?? []).map((r) => r as Record<string, unknown>);

  return NextResponse.json(
    mapCitizen(row as Record<string, unknown>, memberships, customFields, bankAccounts)
  );
}

// ── PUT /api/citizens/[id] ───────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  const authResult = await requireAuth(req, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  const body = await req.json();

  const {
    firstName, middleName, lastName, dob, ssn, address, city, state, zip, phone,
    notes, active, username, password, memberships = [], customFields = [], bankAccounts = [],
  } = body;

  const dobVal = (dob != null && String(dob).trim() !== '') ? dob : null;
  if (!dobVal) {
    return NextResponse.json({ error: 'Date of birth is required and must be a valid date', field: 'dob' }, { status: 400 });
  }

  const firstAccount = Array.isArray(bankAccounts) && bankAccounts.length > 0 ? bankAccounts[0] : null;
  const banks = Array.isArray(bankAccounts) ? bankAccounts.map((a: { bank?: string }) => (a.bank ?? '').trim()).filter(Boolean) : [];
  const defaultDue = new Date().toISOString().split('T')[0];
  const dueDateVal = (firstAccount?.dueDate && String(firstAccount.dueDate).trim() !== '') ? firstAccount.dueDate : defaultDue;

  const updatePayload: Record<string, unknown> = {
    first_name: firstName,
    middle_name: middleName ?? '',
    last_name: lastName,
    dob: dobVal,
    ssn,
    address,
    city,
    state,
    zip,
    phone,
    banks,
    credit_card: firstAccount?.creditCard ?? '',
    expiration_date: firstAccount?.expirationDate ?? '',
    cvv: firstAccount?.cvv ?? '',
    routing_number: firstAccount?.routingNumber ?? '',
    account_number: firstAccount?.accountNumber ?? '',
    due_date: dueDateVal,
    active,
    username,
    notes: notes ?? '',
  };

  // Only re-hash if a new password was provided
  if (password) {
    updatePayload.password = password;
    updatePayload.password_hash = await hashPassword(password);
  }

  const { error: updateError } = await supabase
    .from('citizens')
    .update(updatePayload)
    .eq('id', id);

  if (updateError) {
    if (updateError.code === '23505') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Replace bank accounts
  await supabase.from('citizen_bank_accounts').delete().eq('citizen_id', id);
  if (Array.isArray(bankAccounts) && bankAccounts.length > 0) {
    await supabase.from('citizen_bank_accounts').insert(
      bankAccounts.map(
        (a: {
          bank?: string;
          creditCard?: string;
          expirationDate?: string;
          cvv?: string;
          routingNumber?: string;
          accountNumber?: string;
          dueDate?: string;
          username?: string;
          password?: string;
        }) => ({
          citizen_id: id,
          bank: (a.bank ?? '').trim(),
          credit_card: a.creditCard ?? '',
          expiration_date: a.expirationDate ?? '',
          cvv: a.cvv ?? '',
          routing_number: a.routingNumber ?? '',
          account_number: a.accountNumber ?? '',
          due_date: (a.dueDate && String(a.dueDate).trim() !== '') ? a.dueDate : null,
          username: a.username ?? '',
          password: a.password ?? '',
        })
      )
    );
  }

  // Replace memberships: delete existing then re-insert
  await supabase.from('memberships').delete().eq('citizen_id', id);
  if (memberships.length > 0) {
    await supabase.from('memberships').insert(
      memberships.map((m: { name: string; login: string; password: string; number: string }) => ({
        citizen_id: id,
        name: m.name,
        login: m.login,
        password: m.password,
        number: m.number,
      }))
    );
  }

  // Replace custom fields
  await supabase.from('custom_fields').delete().eq('citizen_id', id);
  if (customFields.length > 0) {
    await supabase.from('custom_fields').insert(
      customFields.map((f: { name: string; value: string }) => ({
        citizen_id: id,
        name: f.name,
        value: f.value,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE /api/citizens/[id] ────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await requireAuth(req, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);

  // Cascade deletes memberships + custom_fields via FK constraint
  const { error } = await supabase.from('citizens').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
