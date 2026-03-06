import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyPassword } from '@/lib/password';
import { setSessionCookie, SessionPayload } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  // ── Admin check (plain credentials from env) ────────────────────────────
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminUsername && adminPassword && username === adminUsername) {
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    const payload: SessionPayload = { role: 'admin', userId: null };
    const res = NextResponse.json({ role: 'admin', userId: null });
    return setSessionCookie(res, payload);
  }

  // ── Citizen check (from DB) ──────────────────────────────────────────────
  const { data: citizen, error } = await supabase
    .from('citizens')
    .select('id, username, password_hash, active')
    .eq('username', username)
    .single();

  if (error || !citizen) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  if (!citizen.active) {
    return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
  }

  const valid = await verifyPassword(password, citizen.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const payload: SessionPayload = { role: 'citizen', userId: citizen.id };
  const res = NextResponse.json({ role: 'citizen', userId: citizen.id });
  return setSessionCookie(res, payload);
}
