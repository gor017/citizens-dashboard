import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// ── GET /api/banks ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  console.log('GET /api/banks');

  const { searchParams } = new URL(req.url);
  const checkLinked = searchParams.get('checkLinked') === 'true';
  const name = searchParams.get('name') ?? '';

  // Optional linked-check endpoint:
  // GET /api/banks?checkLinked=true&name=<bankName>
  if (checkLinked) {
    const authResult = await requireAuth(req, 'admin');
    if (authResult instanceof NextResponse) return authResult;

    if (!name.trim()) {
      return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
    }

    const bankName = String(name).trim();
    const [linkedCitizensRes, linkedAccountsRes] = await Promise.all([
      supabase
        .from('citizens')
        .select('id')
        .contains('banks', [bankName])
        .limit(1),
      supabase
        .from('citizen_bank_accounts')
        .select('id')
        .eq('bank', bankName)
        .limit(1),
    ]);

    const linked = Boolean(
      linkedCitizensRes.data?.length || linkedAccountsRes.data?.length
    );

    return NextResponse.json(
      linked
        ? { linked: true, error: 'Cannot delete bank: it is linked to users.' }
        : { linked: false }
    );
  }

  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { data, error } = await supabase
    .from('banks')
    .select('name')
    .order('name', { ascending: true });

  if (error) {
    console.error('[GET /api/banks]', error.message, error.code);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ banks: (data ?? []).map((b) => b.name) });
}

// ── POST /api/banks ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
  }

  const { error } = await supabase.from('banks').insert({ name: name.trim() });
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Bank already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// ── DELETE /api/banks ──────────────────────────────────────────────────────────
// Admin-only. Prevent deleting a bank if it is referenced by any citizen.
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth(req, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json().catch(() => ({}));
  const name = body?.name;
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
  }

  const bankName = String(name).trim();

  // Ensure it exists first (so we can return a clean 404)
  const { data: existing, error: existingErr } = await supabase
    .from('banks')
    .select('id')
    .eq('name', bankName)
    .limit(1);

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  if (!existing || existing.length === 0) {
    return NextResponse.json({ error: 'Bank not found' }, { status: 404 });
  }

  // "Linked user" checks:
  // - citizens.banks contains this bank
  // - citizen_bank_accounts.bank equals this bank
  const [linkedCitizensRes, linkedAccountsRes] = await Promise.all([
    supabase
      .from('citizens')
      .select('id')
      .contains('banks', [bankName])
      .limit(1),
    supabase
      .from('citizen_bank_accounts')
      .select('id')
      .eq('bank', bankName)
      .limit(1),
  ]);

  if (linkedCitizensRes.data?.length || linkedAccountsRes.data?.length) {
    return NextResponse.json(
      { error: 'Cannot delete bank: it is linked to users.' },
      { status: 409 }
    );
  }

  const { error: deleteErr } = await supabase.from('banks').delete().eq('name', bankName);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
