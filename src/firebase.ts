/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const dbId = (firebaseConfig as any).firestoreDatabaseId;

// If the database ID is a workspace-specific sandbox ID (starts with "ai-studio-"),
// but the project is a custom user-configured project (does not start with "ai-studio-"),
// we fall back to the default database of that custom project.
const finalDbId = (dbId && dbId.startsWith('ai-studio-') && !firebaseConfig.projectId.startsWith('ai-studio-'))
  ? undefined
  : dbId;

export const db = finalDbId ? getFirestore(app, finalDbId) : getFirestore(app);
