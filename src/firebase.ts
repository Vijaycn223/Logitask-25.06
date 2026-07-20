/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import defaultFirebaseConfig from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId || "",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (defaultFirebaseConfig as any).firestoreDatabaseId || ""
};

const app = initializeApp(firebaseConfig);
const dbId = firebaseConfig.firestoreDatabaseId;

// If the database ID is a workspace-specific sandbox ID (starts with "ai-studio-"),
// but the project is a custom user-configured project (does not start with "ai-studio-"),
// we fall back to the default database of that custom project.
const finalDbId = (dbId && dbId.startsWith('ai-studio-') && !firebaseConfig.projectId.startsWith('ai-studio-'))
  ? undefined
  : dbId;

export const db = finalDbId ? getFirestore(app, finalDbId) : getFirestore(app);
