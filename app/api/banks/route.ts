import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// ── GET /api/banks ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  console.log('GET /api/banks');
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
