// Firebase Admin SDK — Server-side only
// Client-side code me import mat karna
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';

// Service Account credentials from environment variable
// Base64 encoded JSON string of the Firebase service account key
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

let adminApp: App;

if (getApps().length > 0) {
  adminApp = getApps()[0];
} else {
  if (serviceAccount) {
    // Decode base64 service account JSON
    const decoded = Buffer.from(serviceAccount, 'base64').toString('utf-8');
    const serviceAccountJson = JSON.parse(decoded);
    adminApp = initializeApp({
      credential: cert(serviceAccountJson),
    });
  } else {
    // Fallback: try using default credentials (works on Vercel/Firebase hosting with linked project)
    adminApp = initializeApp();
  }
}

export default adminApp;
