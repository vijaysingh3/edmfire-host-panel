// Firebase RTDB REST API helper — Kotlin UniversalReader/UniversalWriter equivalent
// RTDB ke saare read/write operations yahan se honge

import { getRemoteString, RC_KEYS } from './remoteConfig';

// RTDB base URL fetch karo (Remote Config se)
function getBaseUrl(): string {
  const url = getRemoteString(RC_KEYS.RTDB_URL);
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

// RTDB secret fetch karo (Remote Config se)
function getSecret(): string {
  return getRemoteString(RC_KEYS.RTDB_SECRET);
}

// Full URL build karo: {baseUrl}/{path}.json?auth={secret}
function buildUrl(path: string): string {
  const base = getBaseUrl();
  const secret = getSecret();
  return `${base}/${path}.json?auth=${secret}`;
}

// ✅ RTDB GET — Kotlin: universalReader.readFromPath()
// Returns parsed JSON (object/array/null)
export async function rtdbGet(path: string): Promise<any> {
  const base = getBaseUrl();
  const secret = getSecret();

  if (!base || !secret) {
    console.error('🔥 [RTDB] Base URL or Secret is empty');
    return null;
  }

  const url = `${base}/${path}.json?auth=${secret}`;
  console.log('🔥 [RTDB] GET:', path);

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    console.error('🔥 [RTDB] GET failed:', res.status, errText);
    throw new Error(`RTDB GET failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data;
}

// ✅ RTDB PUT — Kotlin: universalWriter.putData()
// Overwrites the entire path with new data
export async function rtdbPut(path: string, data: any): Promise<boolean> {
  const base = getBaseUrl();
  const secret = getSecret();

  if (!base || !secret) {
    console.error('🔥 [RTDB] Base URL or Secret is empty');
    return false;
  }

  const url = `${base}/${path}.json?auth=${secret}`;
  console.log('🔥 [RTDB] PUT:', path);

  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('🔥 [RTDB] PUT failed:', res.status, errText);
    return false;
  }

  return true;
}

// ✅ RTDB PATCH — Kotlin: universalWriter.patchData()
// Merges new data with existing (partial update)
export async function rtdbPatch(path: string, data: any): Promise<boolean> {
  const base = getBaseUrl();
  const secret = getSecret();

  if (!base || !secret) {
    console.error('🔥 [RTDB] Base URL or Secret is empty');
    return false;
  }

  const url = `${base}/${path}.json?auth=${secret}`;
  console.log('🔥 [RTDB] PATCH:', path);

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('🔥 [RTDB] PATCH failed:', res.status, errText);
    return false;
  }

  return true;
}

// ✅ RTDB POST (Push) — Kotlin: universalWriter.postPushData()
// Push data with auto-generated key (SDK push().setValue() equivalent)
// Response: { "name": "-MxYz123abc" }
export async function rtdbPush(path: string, data: any): Promise<string | null> {
  const base = getBaseUrl();
  const secret = getSecret();

  if (!base || !secret) {
    console.error('🔥 [RTDB] Base URL or Secret is empty');
    return null;
  }

  const url = `${base}/${path}.json?auth=${secret}`;
  console.log('🔥 [RTDB] POST (push):', path);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('🔥 [RTDB] POST (push) failed:', res.status, errText);
    return null;
  }

  const result = await res.json();
  // Response: { "name": "-MxYz123abc" }
  const generatedKey = result?.name || null;
  console.log('🔥 [RTDB] POST (push) success, key:', generatedKey);
  return generatedKey;
}

// ✅ RTDB DELETE — Kotlin: universalWriter.deleteData()
// Remove data at path
export async function rtdbDelete(path: string): Promise<boolean> {
  const base = getBaseUrl();
  const secret = getSecret();

  if (!base || !secret) {
    console.error('🔥 [RTDB] Base URL or Secret is empty');
    return false;
  }

  const url = `${base}/${path}.json?auth=${secret}`;
  console.log('🔥 [RTDB] DELETE:', path);

  const res = await fetch(url, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('🔥 [RTDB] DELETE failed:', res.status, errText);
    return false;
  }

  return true;
}
