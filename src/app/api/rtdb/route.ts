import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════
// SERVER-SIDE RTDB PROXY
// RTDB credentials sirf server-side rehte hain — client ko kabhi nahi milte
// ═══════════════════════════════════════════════════

const RTDB_URL = process.env.RTDB_URL;
const RTDB_SECRET = process.env.RTDB_SECRET;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Only allow specific RTDB paths that hosts need
const ALLOWED_PATH_PREFIXES = [
  'Tournaments/',
  'AllTournamentsID',
];

function isPathAllowed(path: string): boolean {
  return ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
}

function buildUrl(path: string): string {
  const base = RTDB_URL?.endsWith('/') ? RTDB_URL.slice(0, -1) : RTDB_URL;
  return `${base}/${path}.json?auth=${RTDB_SECRET}`;
}

// Verify Firebase ID token using Firebase Auth REST API (no Admin SDK needed)
async function verifyIdToken(idToken: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    const data = await res.json();
    return res.ok && Array.isArray(data.users) && data.users.length > 0;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // 1. Check server-side credentials exist
  if (!RTDB_URL || !RTDB_SECRET) {
    return NextResponse.json({ error: 'RTDB not configured on server' }, { status: 500 });
  }

  // 2. Verify Firebase Auth token (host must be logged in)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: No auth token' }, { status: 401 });
  }

  const idToken = authHeader.split('Bearer ')[1];
  const isValid = await verifyIdToken(idToken);
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
  }

  // 3. Parse request body
  let body: { action: string; path: string; data?: any };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, path, data } = body;

  // 4. Validate path — only allow whitelisted prefixes
  if (!path || typeof path !== 'string' || !isPathAllowed(path)) {
    return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
  }

  // 5. Validate action
  const validActions = ['GET', 'PUT', 'PATCH', 'POST', 'DELETE'];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // 6. Execute RTDB request
  try {
    const url = buildUrl(path);

    const fetchOptions: RequestInit = {
      method: action,
      headers: { 'Content-Type': 'application/json' },
    };

    if (data !== undefined && action !== 'GET' && action !== 'DELETE') {
      fetchOptions.body = JSON.stringify(data);
    }

    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `RTDB ${action} failed`, status: res.status, detail: errText }, { status: res.status });
    }

    // For DELETE, return success
    if (action === 'DELETE') {
      return NextResponse.json({ success: true });
    }

    const result = await res.json();

    // For POST (push), return the generated key
    if (action === 'POST') {
      return NextResponse.json({ key: result?.name || null });
    }

    // For PUT/PATCH, return success
    if (action === 'PUT' || action === 'PATCH') {
      return NextResponse.json({ success: true, data: result });
    }

    // For GET, return the data
    return NextResponse.json({ data: result });
  } catch (e: any) {
    return NextResponse.json({ error: 'RTDB request failed', detail: e.message }, { status: 500 });
  }
}
