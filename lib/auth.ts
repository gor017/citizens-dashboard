import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export type SessionPayload = {
  role: 'admin' | 'citizen';
  userId: number | null;
};

const COOKIE_NAME = 'session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET environment variable');
  return new TextEncoder().encode(secret);
}

export async function signJwt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Set the session cookie on a response. */
export async function setSessionCookie(
  response: NextResponse,
  payload: SessionPayload
): Promise<NextResponse> {
  const token = await signJwt(payload);
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  return response;
}

/** Clear the session cookie. */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

/** Read and verify the session from the incoming request cookie. */
export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

/** Read session from next/headers (for Server Components / Route Handlers). */
export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

/**
 * Guard helper for route handlers.
 * Returns the session payload, or a 401 NextResponse if not authenticated.
 * Optionally restrict to a specific role.
 */
export async function requireAuth(
  req: NextRequest,
  role?: 'admin' | 'citizen'
): Promise<SessionPayload | NextResponse> {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (role && session.role !== role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session;
}
