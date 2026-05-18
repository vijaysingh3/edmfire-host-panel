// Firebase RTDB helper — NOW SERVER-SIDE PROXIED
// RTDB secret client-side pe kabhi nahi aata — sab API route se hota hai
// Server-side: /api/rtdb route RTDB secret use karti hai

import { auth } from '@/lib/firebase';

// Get Firebase ID token for API authentication
async function getIdToken(): Promise<string> {
  if (!auth.currentUser) throw new Error('Not authenticated');
  return await auth.currentUser.getIdToken();
}

// ✅ RTDB GET — proxied through server
export async function rtdbGet(path: string): Promise<any> {
  try {
    const token = await getIdToken();
    const res = await fetch('/api/rtdb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'GET', path }),
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

// ✅ RTDB PUT — proxied through server
export async function rtdbPut(path: string, data: any): Promise<boolean> {
  try {
    const token = await getIdToken();
    const res = await fetch('/api/rtdb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'PUT', path, data }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

// ✅ RTDB PATCH — proxied through server
export async function rtdbPatch(path: string, data: any): Promise<boolean> {
  try {
    const token = await getIdToken();
    const res = await fetch('/api/rtdb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'PATCH', path, data }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

// ✅ RTDB POST (Push) — proxied through server
export async function rtdbPush(path: string, data: any): Promise<string | null> {
  try {
    const token = await getIdToken();
    const res = await fetch('/api/rtdb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'POST', path, data }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    return json.key ?? null;
  } catch {
    return null;
  }
}

// ✅ RTDB DELETE — proxied through server
export async function rtdbDelete(path: string): Promise<boolean> {
  try {
    const token = await getIdToken();
    const res = await fetch('/api/rtdb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'DELETE', path }),
    });

    return res.ok;
  } catch {
    return false;
  }
}
