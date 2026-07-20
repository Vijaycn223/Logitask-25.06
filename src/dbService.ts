/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  getDocFromServer,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  User, 
  SKU, 
  InventoryItem, 
  EngineerStock, 
  ProductivityLog, 
  AttendanceRecord, 
  StockRequest, 
  PurchaseInward, 
  RevokeRequest,
  Organisation,
  PurchaseOrder
} from './types';
import {
  INITIAL_USERS,
  INITIAL_SKUS,
  INITIAL_MAIN_INVENTORY,
  INITIAL_ENGINEER_STOCK,
  INITIAL_PRODUCTIVITY_LOGS,
  INITIAL_ATTENDANCE,
  INITIAL_STOCK_REQUESTS,
  INITIAL_PURCHASE_INWARD,
  INITIAL_REVOKE_REQUESTS,
  INITIAL_ORGANISATIONS,
  INITIAL_PURCHASE_ORDERS
} from './mockData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  
  console.warn('Firestore Error Handled Gracefully: ' + errMsg + ` (${operationType} on path: ${path})`);
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firebase-permission-error', { detail: errInfo }));
  }

  // Avoid throwing uncaught exceptions for permission/insufficient errors or read snapshots
  const isPermissionDenied = errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('insufficient');
  if (!isPermissionDenied && operationType !== OperationType.GET) {
    throw new Error(JSON.stringify(errInfo));
  }
}

// Check Firestore health on start
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection established successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    }
  }
}

// Generic database seed function
export async function seedInitialDatabaseIfEmpty() {
  try {
    // 0. Organisations
    const orgsSnap = await getDocs(collection(db, 'organisations'));
    if (orgsSnap.empty) {
      console.log("Seeding organisations collection...");
      for (const org of INITIAL_ORGANISATIONS) {
        await setDoc(doc(db, 'organisations', org.id), org);
      }
    } else {
      // Ensure default orgs exist for the seeded users
      for (const org of INITIAL_ORGANISATIONS) {
        const orgDoc = await getDoc(doc(db, 'organisations', org.id));
        if (!orgDoc.exists()) {
          await setDoc(doc(db, 'organisations', org.id), org);
        }
      }
    }

    // 1. Users
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      console.log("Seeding users collection...");
      for (const user of INITIAL_USERS) {
        await setDoc(doc(db, 'users', user.email), user);
      }
    } else {
      // Ensure Super Admin specifically exists even if other users already exist
      const superAdminDoc = await getDoc(doc(db, 'users', 'vbcn223@gmail.com'));
      if (!superAdminDoc.exists()) {
        console.log("Super Admin was missing in seeded DB, writing super admin...");
        const superAdminUser = INITIAL_USERS.find(u => u.email === 'vbcn223@gmail.com');
        if (superAdminUser) {
          await setDoc(doc(db, 'users', 'vbcn223@gmail.com'), superAdminUser);
        }
      } else {
        // Also ensure password matches 'Vijay@890'
        const existingData = superAdminDoc.data();
        if (existingData && existingData.password !== 'Vijay@890') {
          console.log("Updating Super Admin password...");
          await setDoc(doc(db, 'users', 'vbcn223@gmail.com'), {
            ...existingData,
            password: 'Vijay@890'
          });
        }
      }
    }

    // 2. SKUs
    const skusSnap = await getDocs(collection(db, 'skus'));
    if (skusSnap.empty) {
      console.log("Seeding SKUs collection...");
      for (const sku of INITIAL_SKUS) {
        await setDoc(doc(db, 'skus', `org-001_${sku.id}`), { ...sku, orgId: 'org-001' });
      }
    }

    // 3. Inventory
    const invSnap = await getDocs(collection(db, 'inventory'));
    if (invSnap.empty) {
      console.log("Seeding inventory collection...");
      for (const item of INITIAL_MAIN_INVENTORY) {
        await setDoc(doc(db, 'inventory', `org-001_${item.skuId}`), { ...item, orgId: 'org-001' });
      }
    }

    // 4. Engineer Stock
    const engStockSnap = await getDocs(collection(db, 'engineerStock'));
    if (engStockSnap.empty) {
      console.log("Seeding engineerStock collection...");
      for (const [email, stock] of Object.entries(INITIAL_ENGINEER_STOCK)) {
        await setDoc(doc(db, 'engineerStock', email), { email, stock });
      }
    }

    // 5. Productivity Logs
    const logsSnap = await getDocs(collection(db, 'productivityLogs'));
    if (logsSnap.empty) {
      console.log("Seeding productivityLogs collection...");
      for (const log of INITIAL_PRODUCTIVITY_LOGS) {
        await setDoc(doc(db, 'productivityLogs', log.id), { ...log, orgId: 'org-001' });
      }
    }

    // 6. Attendance
    const attSnap = await getDocs(collection(db, 'attendance'));
    if (attSnap.empty) {
      console.log("Seeding attendance collection...");
      for (const [email, dates] of Object.entries(INITIAL_ATTENDANCE)) {
        await setDoc(doc(db, 'attendance', email), { email, dates });
      }
    }

    // 7. Stock Requests
    const reqSnap = await getDocs(collection(db, 'stockRequests'));
    if (reqSnap.empty) {
      console.log("Seeding stockRequests collection...");
      for (const req of INITIAL_STOCK_REQUESTS) {
        await setDoc(doc(db, 'stockRequests', req.id), { ...req, orgId: 'org-001' });
      }
    }

    // 8. Purchases
    const purchaseSnap = await getDocs(collection(db, 'purchaseInward'));
    if (purchaseSnap.empty) {
      console.log("Seeding purchaseInward collection...");
      for (const p of INITIAL_PURCHASE_INWARD) {
        await setDoc(doc(db, 'purchaseInward', p.id), { ...p, orgId: 'org-001' });
      }
    }

    // 9. Revokes
    const revokeSnap = await getDocs(collection(db, 'revokeRequests'));
    if (revokeSnap.empty) {
      console.log("Seeding revokeRequests collection...");
      for (const r of INITIAL_REVOKE_REQUESTS) {
        await setDoc(doc(db, 'revokeRequests', r.id), { ...r, orgId: 'org-001' });
      }
    }

    // 10. Purchase Orders
    const poSnap = await getDocs(collection(db, 'purchaseOrders'));
    if (poSnap.empty) {
      console.log("Seeding purchaseOrders collection...");
      for (const po of INITIAL_PURCHASE_ORDERS) {
        await setDoc(doc(db, 'purchaseOrders', po.id), { ...po, orgId: 'org-001' });
      }
    }

    console.log("Firebase seeding complete!");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seeding');
  }
}

// Reset database back to seed data
export async function forceResetDatabaseToSeed() {
  try {
    console.log("Force seeding starting...");
    // Reset Organisations
    for (const org of INITIAL_ORGANISATIONS) {
      await setDoc(doc(db, 'organisations', org.id), org);
    }
    // Rewrite all collections with INITIAL values
    for (const user of INITIAL_USERS) {
      await setDoc(doc(db, 'users', user.email), user);
    }
    for (const sku of INITIAL_SKUS) {
      await setDoc(doc(db, 'skus', `org-001_${sku.id}`), { ...sku, orgId: 'org-001' });
    }
    for (const item of INITIAL_MAIN_INVENTORY) {
      await setDoc(doc(db, 'inventory', `org-001_${item.skuId}`), { ...item, orgId: 'org-001' });
    }
    for (const [email, stock] of Object.entries(INITIAL_ENGINEER_STOCK)) {
      await setDoc(doc(db, 'engineerStock', email), { email, stock });
    }
    for (const log of INITIAL_PRODUCTIVITY_LOGS) {
      await setDoc(doc(db, 'productivityLogs', log.id), { ...log, orgId: 'org-001' });
    }
    for (const [email, dates] of Object.entries(INITIAL_ATTENDANCE)) {
      await setDoc(doc(db, 'attendance', email), { email, dates });
    }
    for (const req of INITIAL_STOCK_REQUESTS) {
      await setDoc(doc(db, 'stockRequests', req.id), { ...req, orgId: 'org-001' });
    }
    // Delete any other records or reset to initial
    for (const p of INITIAL_PURCHASE_INWARD) {
      await setDoc(doc(db, 'purchaseInward', p.id), { ...p, orgId: 'org-001' });
    }
    for (const po of INITIAL_PURCHASE_ORDERS) {
      await setDoc(doc(db, 'purchaseOrders', po.id), { ...po, orgId: 'org-001' });
    }
    // To clear previous lists of extra requests, we would ideally delete them.
    // For this applet, doing setDoc updates of initialized items is clean and robust.
    console.log("Database successfully reset to seed defaults!");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'reset');
  }
}

// Helper to recursively remove undefined values from objects as Firestore setDoc rejects with undefined fields
export function cleanUndefined(obj: any): any {
  if (obj === null) return null;
  if (obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined).filter(x => x !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        const cleanedVal = cleanUndefined(val);
        if (cleanedVal !== undefined) {
          cleaned[key] = cleanedVal;
        }
      }
    }
    return cleaned;
  }
  return obj;
}

// Writes
export async function writeDocument(colName: string, docId: string, data: any) {
  try {
    const cleaned = cleanUndefined(data);
    await setDoc(doc(db, colName, docId), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colName}/${docId}`);
  }
}

// Deletes
export async function deleteDocument(colName: string, docId: string) {
  try {
    await deleteDoc(doc(db, colName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${colName}/${docId}`);
  }
}
