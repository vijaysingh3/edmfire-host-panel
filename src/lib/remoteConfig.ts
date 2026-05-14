// Firebase Remote Config utility — web version
// Kotlin me FirebaseRemoteConfig use hota tha, same logic web me

import { getRemoteConfig, fetchAndActivate, getValue, RemoteConfig } from 'firebase/remote-config';
import app from '@/lib/firebase';

// Remote Config singleton instance
let remoteConfigInstance: RemoteConfig | null = null;

export function getRemoteConfigInstance(): RemoteConfig {
  if (!remoteConfigInstance) {
    remoteConfigInstance = getRemoteConfig(app);
    // Kotlin me bhi 3600 seconds tha
    remoteConfigInstance.settings.minimumFetchIntervalMillis = 3600000;
  }
  return remoteConfigInstance;
}

// Remote Config fetch + activate — Kotlin me fetchAndActivate() tha
export async function fetchRemoteConfig(): Promise<boolean> {
  try {
    const rc = getRemoteConfigInstance();
    const activated = await fetchAndActivate(rc);
    console.log('🔧 [RemoteConfig] Fetched & activated:', activated);
    return activated;
  } catch (err) {
    console.error('🔧 [RemoteConfig] Fetch failed:', err);
    return false;
  }
}

// Specific key get — Kotlin me remoteConfig.getString("KEY") tha
export function getRemoteString(key: string): string {
  const rc = getRemoteConfigInstance();
  return getValue(rc, key).asString();
}

// Pre-defined keys — project me jahan jahan use hoga
// Agar Remote Config me key ka naam alag hai to yahan update karo
export const RC_KEYS = {
  UNIVERSAL_IMAGE_UPLOADER_URL: 'UNIVERSAL_IMAGE_UPLOADER_URL',
  RTDB_URL: 'RTDB_URL',           // Firebase RTDB base URL
  RTDB_SECRET: 'RTDB_SECRET',     // Firebase RTDB database secret
} as const;
