import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// ── PATCH /api/citizens/[id]/active  (toggle) ────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireAuth(req, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);

  // Read current value, then flip
  const { data: citizen, error: readError } = await supabase
    .from('citizens')
    .select('active')
    .eq('id', id)
    .single();

  if (readError || !citizen) {
    return NextResponse.json({ error: 'Citizen not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('citizens')
    .update({ active: !citizen.active })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ active: !citizen.active });
}
