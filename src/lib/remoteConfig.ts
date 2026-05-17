// Firebase Remote Config utility — web version
// Kotlin me FirebaseRemoteConfig use hota tha, same logic web me

import { getRemoteConfig, fetchAndActivate, getValue, RemoteConfig } from 'firebase/remote-config';
import app from '@/lib/firebase';

// Remote Config singleton instance
let remoteConfigInstance: RemoteConfig | null = null;

export function getRemoteConfigInstance(): RemoteConfig {
  if (!remoteConfigInstance) {
    remoteConfigInstance = getRemoteConfig(app);
    // Admin panel ke liye har baar fresh fetch (Kotlin me 0 tha)
    remoteConfigInstance.settings.minimumFetchIntervalMillis = 0;
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

// Pre-defined keys — exact match with Firebase Remote Config key names
// Kotlin RemoteConfigHelper.kt se match kiya gaya hai
export const RC_KEYS = {
  UNIVERSAL_IMAGE_UPLOADER_URL: 'UNIVERSAL_IMAGE_UPLOADER_URL',
  RTDB_URL: 'FirebaseDatabase_url',         // Firebase RTDB base URL (Kotlin: getDatabaseUrl())
  RTDB_SECRET: 'RECYCLABLE_DB_SECRET',       // Firebase RTDB database secret (Kotlin: getDatabaseSecret())
  NOTIFY_JOINED_PLAYERS: 'notifyjoinedplayers', // FCM notification Cloud Function URL
  FUN_PRICE_DISTRIBUTION: 'Fun_pricedistribution', // Prize distribution Cloud Function URL
  FUN_WITHDRAWAL_REQUEST: 'Fun_hostsWithdrawal_Request', // Host withdrawal request Cloud Function URL
} as const;
