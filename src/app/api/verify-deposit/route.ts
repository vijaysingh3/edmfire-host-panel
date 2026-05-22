import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════
// DEPOSIT VERIFICATION PROXY
// Client → This API → Firebase Function (verifyUTR)
// Firebase Function handles: AllUTRs lock + BharatPay API + Coins add
// ═══════════════════════════════════════════════════

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const VERIFY_UTR_URL = 'https://asia-south1-edm-fire-app.cloudfunctions.net/verifyUTR';

// Verify Firebase ID token using REST API (no Admin SDK needed)
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
  try {
    // 1. Verify Firebase Auth token (host must be logged in)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Unauthorized: No auth token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const isValid = await verifyIdToken(idToken);
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 2. Parse request body
    let body: { uid: string; utr: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const { uid, utr } = body;

    if (!uid || !utr || utr.length !== 12) {
      return NextResponse.json(
        { success: false, message: 'Valid UID and 12-digit UTR required' },
        { status: 400 }
      );
    }

    // 3. Forward to Firebase Function verifyUTR
    const funcRes = await fetch(VERIFY_UTR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, utr }),
    });

    const data = await funcRes.json();
    return NextResponse.json(data, { status: funcRes.status });

  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
