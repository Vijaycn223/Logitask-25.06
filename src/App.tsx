/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getUser, getMonthRange } from './utils';
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
  UserRole,
  LPRequest,
  Organisation,
  AttendanceRequest,
  ReturnRequest,
  PurchaseOrder,
  SupplierDebit,
  Vendor,
  SaleRecord
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
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { AdminPages } from './components/AdminPages';
import { StoreManagerPages } from './components/StoreManagerPages';
import { TeamLeaderPages } from './components/TeamLeaderPages';
import { AdminBilling } from './components/AdminBilling';
import { EngineerPages } from './components/EngineerPages';
import { SuperAdminPages } from './components/SuperAdminPages';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { BackendExecutivePages } from './components/BackendExecutivePages';
import { Sparkles, Calendar, CheckCircle2, AlertCircle, Menu, LogOut, ShieldAlert, Key } from 'lucide-react';
import { collection, doc, onSnapshot, query, where, getDocs, or, and } from 'firebase/firestore';
import { db } from './firebase';
import { 
  testConnection, 
  seedInitialDatabaseIfEmpty, 
  forceResetDatabaseToSeed, 
  writeDocument, 
  deleteDocument,
  handleFirestoreError, 
  OperationType 
} from './dbService';


interface Toast {
  id: string;
  msg: string;
  type: 'success' | 'error';
}

const STORAGE_KEYS = {
  USERS: 'fieldops_users',
  SKUS: 'fieldops_skus',
  INVENTORY: 'fieldops_inventory',
  ENG_STOCK: 'fieldops_eng_stock',
  LOGS: 'fieldops_logs',
  ATTENDANCE: 'fieldops_attendance',
  STOCK_REQS: 'fieldops_stock_reqs',
  PURCHASES: 'fieldops_purchases',
  REVOKES: 'fieldops_revokes',
  LP_REQS: 'fieldops_lp_reqs',
  ATTENDANCE_REQS: 'fieldops_attendance_reqs',
  RETURNS: 'fieldops_returns',
  ORGANISATIONS: 'fieldops_organisations',
  LOGGED_USER: 'fieldops_logged_user',
  SALES: 'fieldops_sales',
};

const isDatesEqual = (a: Record<string, string> | undefined, b: Record<string, string> | undefined): boolean => {
  if (!a || !b) return a === b;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

const isAttendanceEqual = (a: AttendanceRecord | undefined, b: AttendanceRecord | undefined): boolean => {
  if (!a || !b) return a === b;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const email of keysA) {
    if (!isDatesEqual(a[email], b[email])) return false;
  }
  return true;
};

export default function App() {
  const getStoredOrDefault = <T,>(key: string, defaultValue: T): T => {
    const item = localStorage.getItem(key);
    if (!item || item === 'null' || item === 'undefined') return defaultValue;
    try {
      const parsed = JSON.parse(item) as T;
      if (!parsed) return defaultValue;
      if (key === STORAGE_KEYS.USERS && Array.isArray(parsed)) {
        const filtered = parsed.filter((u: any) => u.email.toLowerCase() !== 'superadmin@fieldops.com');
        const hasSuperAdmin = filtered.some((u: any) => u.email.toLowerCase() === 'vbcn223@gmail.com');
        if (!hasSuperAdmin) {
          const superAdminUser = (defaultValue as any[]).find((u) => u.email.toLowerCase() === 'vbcn223@gmail.com');
          if (superAdminUser) {
            return [...filtered, superAdminUser] as unknown as T;
          }
        } else {
          return filtered.map((u: any) => {
            if (u.email.toLowerCase() === 'vbcn223@gmail.com') {
              return { ...u, password: 'Vijay@890' };
            }
            return u;
          }) as unknown as T;
        }
        return filtered as unknown as T;
      }
      return parsed;
    } catch {
      return defaultValue;
    }
  };

  const [offlineMode, setOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem('fieldops_offline_mode') === 'true';
  });

  const [permissionError, setPermissionError] = useState<any | null>(null);

  // State variables backed by LocalStorage & initial mock datasets
  const [organisations, setOrganisations] = useState<Organisation[]>(() => getStoredOrDefault(STORAGE_KEYS.ORGANISATIONS, INITIAL_ORGANISATIONS));
  const [users, setUsers] = useState<User[]>(() => getStoredOrDefault(STORAGE_KEYS.USERS, INITIAL_USERS));
  const [skus, setSkus] = useState<SKU[]>(() => {
    const list = getStoredOrDefault(STORAGE_KEYS.SKUS, INITIAL_SKUS);
    return list.map(s => ({ ...s, orgId: s.orgId || 'org-001' }));
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const list = getStoredOrDefault(STORAGE_KEYS.INVENTORY, INITIAL_MAIN_INVENTORY);
    return list.map(i => ({ ...i, orgId: i.orgId || 'org-001' }));
  });
  const [engineerStock, setEngineerStock] = useState<EngineerStock>(() => getStoredOrDefault(STORAGE_KEYS.ENG_STOCK, INITIAL_ENGINEER_STOCK));
  const [productivityLogs, setProductivityLogs] = useState<ProductivityLog[]>(() => {
    const list = getStoredOrDefault(STORAGE_KEYS.LOGS, INITIAL_PRODUCTIVITY_LOGS);
    return list.map(l => ({ ...l, orgId: l.orgId || 'org-001' }));
  });
  const [attendance, setAttendance] = useState<AttendanceRecord>(() => getStoredOrDefault(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE));
  const [stockRequests, setStockRequests] = useState<StockRequest[]>(() => {
    const list = getStoredOrDefault(STORAGE_KEYS.STOCK_REQS, INITIAL_STOCK_REQUESTS);
    return list.map(r => ({ ...r, orgId: r.orgId || 'org-001' }));
  });
  const [purchaseInward, setPurchaseInward] = useState<PurchaseInward[]>(() => {
    const list = getStoredOrDefault(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASE_INWARD);
    return list.map(p => ({ ...p, orgId: p.orgId || 'org-001' }));
  });
  const [revokeRequests, setRevokeRequests] = useState<RevokeRequest[]>(() => {
    const list = getStoredOrDefault(STORAGE_KEYS.REVOKES, INITIAL_REVOKE_REQUESTS);
    return list.map(r => ({ ...r, orgId: r.orgId || 'org-001' }));
  });
  const [lpRequests, setLpRequests] = useState<LPRequest[]>(() => {
    const list = getStoredOrDefault(STORAGE_KEYS.LP_REQS, []);
    return list.map(lp => ({ ...lp, orgId: lp.orgId || 'org-001' }));
  });
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceRequest[]>(() => {
    const list = getStoredOrDefault(STORAGE_KEYS.ATTENDANCE_REQS, []);
    return list.map(req => ({ ...req, orgId: req.orgId || 'org-001' }));
  });
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>(() => {
    const list = getStoredOrDefault(STORAGE_KEYS.RETURNS, []);
    return list.map(req => ({ ...req, orgId: req.orgId || 'org-001' }));
  });
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const list = getStoredOrDefault('fieldops_purchase_orders', INITIAL_PURCHASE_ORDERS);
    return list.map(po => ({ ...po, orgId: po.orgId || 'org-001' }));
  });
  const [supplierDebits, setSupplierDebits] = useState<SupplierDebit[]>(() => {
    const list = getStoredOrDefault('fieldops_supplier_debits', []);
    return list.map(d => ({ ...d, orgId: d.orgId || 'org-001' }));
  });
  const [vendors, setVendors] = useState<Vendor[]>(() => {
    const list = getStoredOrDefault('fieldops_vendors', []);
    return list.map(v => ({ ...v, orgId: v.orgId || 'org-001' }));
  });

  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>(() => {
    const list = getStoredOrDefault(STORAGE_KEYS.SALES, []);
    return list.map(s => ({ ...s, orgId: s.orgId || 'org-001' }));
  });

  // Authenticated state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTLMonth, setSelectedTLMonth] = useState<string>(() => getMonthRange().prefix);
  const [activeTab, setActiveTab] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
 
  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Listen to Firestore permission/integration failures
  useEffect(() => {
    const handleErr = (e: any) => {
      const errMsg = e.detail?.error?.toLowerCase() || '';
      const originalMsg = e.detail?.error || 'Unknown database error';
      
      // Always show a red toast error for any Firestore database failure
      addToast(`Database Error: ${originalMsg}`, 'error');

      if (errMsg.includes('permission') || errMsg.includes('insufficient') || errMsg.includes('auth')) {
        setPermissionError(e.detail);
        setOfflineMode(true);
        localStorage.setItem('fieldops_offline_mode', 'true');
      }
    };
    window.addEventListener('firebase-permission-error', handleErr);
    return () => window.removeEventListener('firebase-permission-error', handleErr);
  }, []);

  // Sync session user
  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.LOGGED_USER);
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser) as User;
        setCurrentUser(u);
        setActiveTab(getDefaultLandingPage(u.role));
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);

  // 1. Initial Load & Seeding (Startup Check)
  useEffect(() => {
    if (offlineMode) {
      console.log("Offline mode active. Firestore initialization skipped.");
      return;
    }

    const initializeData = async () => {
      try {
        await testConnection();
        await seedInitialDatabaseIfEmpty();
      } catch (err) {
        console.error("Initialization / Seeding Error:", err);
      }
    };
    initializeData();
  }, [offlineMode]);

  // 1b. Dynamic Tenant-Aware Firestore Listeners
  useEffect(() => {
    if (offlineMode) return;
    
    if (!currentUser) {
      // Clear tenant state on logout
      setUsers([]);
      setOrganisations([]);
      setSkus([]);
      setInventory([]);
      setEngineerStock({});
      setProductivityLogs([]);
      setAttendance({});
      setStockRequests([]);
      setPurchaseInward([]);
      setRevokeRequests([]);
      setLpRequests([]);
      setAttendanceRequests([]);
      setReturnRequests([]);
      setPurchaseOrders([]);
      setSupplierDebits([]);
      setVendors([]);
      setSalesRecords([]);
      return;
    }

    const userOrgId = currentUser.orgId || '';
    const isSuperAdmin = currentUser.role === 'Super Admin';

    // Helper to filter query dynamically by Tenant ID
    const getTenantQuery = (colName: string) => {
      const colRef = collection(db, colName);
      if (isSuperAdmin || !userOrgId) {
        return colRef;
      }
      if (colName === 'users') {
        return query(colRef, or(
          where('orgId', '==', userOrgId),
          where('role', '==', 'Super Admin'),
          where('role', '==', 'Admin')
        ));
      }
      return query(colRef, where('orgId', '==', userOrgId));
    };

    const role = currentUser.role;

    let unsubUsers = () => {};
    if (['Super Admin', 'Admin', 'Store Manager', 'Team Leader'].includes(role)) {
      unsubUsers = onSnapshot(getTenantQuery('users'), (snapshot) => {
        const list: User[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as User);
        });
        setUsers((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
    }

    let unsubOrgs = () => {};
    if (isSuperAdmin) {
      unsubOrgs = onSnapshot(collection(db, 'organisations'), (snapshot) => {
        const list: Organisation[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Organisation);
        });
        setOrganisations((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.ORGANISATIONS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'organisations'));
    } else if (userOrgId) {
      unsubOrgs = onSnapshot(doc(db, 'organisations', userOrgId), (docSnap) => {
        if (docSnap.exists()) {
          const org = docSnap.data() as Organisation;
          const list = [org];
          setOrganisations((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
            localStorage.setItem(STORAGE_KEYS.ORGANISATIONS, JSON.stringify(list));
            return list;
          });
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'organisations'));
    }

    // SKU Caching (Stale-While-Revalidate)
    let unsubSkus = () => {};
    if (['Super Admin', 'Admin', 'Store Manager', 'Team Leader', 'Engineer'].includes(role)) {
      getDocs(getTenantQuery('skus')).then((snapshot) => {
        const list: SKU[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as SKU);
        });
        setSkus((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.SKUS, JSON.stringify(list));
          return list;
        });
      }).catch((error) => handleFirestoreError(error, OperationType.GET, 'skus'));
    }

    let unsubInventory = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubInventory = onSnapshot(getTenantQuery('inventory'), (snapshot) => {
        const list: InventoryItem[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as InventoryItem);
        });
        setInventory((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'inventory'));
    }

    let unsubEngStock = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubEngStock = onSnapshot(collection(db, 'engineerStock'), (snapshot) => {
        const obj: EngineerStock = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.email && data.stock) {
            obj[data.email] = data.stock;
          }
        });
        setEngineerStock((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(obj)) return prev;
          localStorage.setItem(STORAGE_KEYS.ENG_STOCK, JSON.stringify(obj));
          return obj;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'engineerStock'));
    } else if (role === 'Engineer' && currentUser.email) {
      unsubEngStock = onSnapshot(doc(db, 'engineerStock', currentUser.email), (docSnap) => {
        const obj: EngineerStock = {};
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.stock) {
            obj[currentUser.email] = data.stock;
          }
        }
        setEngineerStock((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(obj)) return prev;
          localStorage.setItem(STORAGE_KEYS.ENG_STOCK, JSON.stringify(obj));
          return obj;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'engineerStock'));
    }

    let unsubLogs = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubLogs = onSnapshot(getTenantQuery('productivityLogs'), (snapshot) => {
        const list: ProductivityLog[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as ProductivityLog);
        });
        setProductivityLogs((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'productivityLogs'));
    } else if (role === 'Team Leader') {
      const qPending = query(
        collection(db, 'productivityLogs'),
        where('orgId', '==', userOrgId),
        where('status', '==', 'Pending')
      );
      const qValidated = query(
        collection(db, 'productivityLogs'),
        where('orgId', '==', userOrgId),
        where('validatedBy', '==', currentUser.email)
      );
      const qApproved = query(
        collection(db, 'productivityLogs'),
        where('orgId', '==', userOrgId),
        where('status', '==', 'Approved'),
        where('date', '>=', `${selectedTLMonth}-01`),
        where('date', '<=', `${selectedTLMonth}-31`)
      );

      const logsMap: Record<string, ProductivityLog> = {};

      const updateLogs = () => {
        const list = Object.values(logsMap);
        setProductivityLogs((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(list));
          return list;
        });
      };

      const unsubLogs1 = onSnapshot(qPending, (snapshot) => {
        Object.keys(logsMap).forEach((id) => {
          if (logsMap[id].status === 'Pending' && !snapshot.docs.some(doc => doc.id === id)) {
            delete logsMap[id];
          }
        });
        snapshot.forEach((doc) => {
          logsMap[doc.id] = doc.data() as ProductivityLog;
        });
        updateLogs();
      }, (error) => handleFirestoreError(error, OperationType.GET, 'productivityLogs'));

      const unsubLogs2 = onSnapshot(qValidated, (snapshot) => {
        Object.keys(logsMap).forEach((id) => {
          if (logsMap[id].validatedBy === currentUser.email && !snapshot.docs.some(doc => doc.id === id)) {
            delete logsMap[id];
          }
        });
        snapshot.forEach((doc) => {
          logsMap[doc.id] = doc.data() as ProductivityLog;
        });
        updateLogs();
      }, (error) => handleFirestoreError(error, OperationType.GET, 'productivityLogs'));

      const unsubLogs3 = onSnapshot(qApproved, (snapshot) => {
        Object.keys(logsMap).forEach((id) => {
          if (logsMap[id].status === 'Approved' && !snapshot.docs.some(doc => doc.id === id)) {
            delete logsMap[id];
          }
        });
        snapshot.forEach((doc) => {
          logsMap[doc.id] = doc.data() as ProductivityLog;
        });
        updateLogs();
      }, (error) => handleFirestoreError(error, OperationType.GET, 'productivityLogs'));

      unsubLogs = () => {
        unsubLogs1();
        unsubLogs2();
        unsubLogs3();
      };
    } else if (role === 'Engineer') {
      const q = query(collection(db, 'productivityLogs'), where('orgId', '==', userOrgId), where('engEmail', '==', currentUser.email));
      unsubLogs = onSnapshot(q, (snapshot) => {
        const list: ProductivityLog[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as ProductivityLog);
        });
        setProductivityLogs((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'productivityLogs'));
    }

    let unsubAttendance = () => {};
    if (['Super Admin', 'Admin', 'Team Leader'].includes(role)) {
      unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
        const obj: AttendanceRecord = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.email && data.dates) {
            obj[data.email] = data.dates;
          }
        });
        setAttendance((prev) => {
          if (isAttendanceEqual(prev, obj)) return prev;
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(obj));
          return obj;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'attendance'));
    } else if (['Store Manager', 'Engineer', 'Backend Executive'].includes(role) && currentUser.email) {
      unsubAttendance = onSnapshot(doc(db, 'attendance', currentUser.email), (docSnap) => {
        const obj: AttendanceRecord = {};
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.dates) {
            obj[currentUser.email] = data.dates;
          }
        }
        setAttendance((prev) => {
          if (isAttendanceEqual(prev, obj)) return prev;
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(obj));
          return obj;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'attendance'));
    }

    let unsubStockReqs = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubStockReqs = onSnapshot(getTenantQuery('stockRequests'), (snapshot) => {
        const list: StockRequest[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as StockRequest);
        });
        setStockRequests((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.STOCK_REQS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'stockRequests'));
    } else if (role === 'Engineer') {
      const q = query(collection(db, 'stockRequests'), where('orgId', '==', userOrgId), where('engEmail', '==', currentUser.email));
      unsubStockReqs = onSnapshot(q, (snapshot) => {
        const list: StockRequest[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as StockRequest);
        });
        setStockRequests((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.STOCK_REQS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'stockRequests'));
    }

    let unsubPurchases = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubPurchases = onSnapshot(getTenantQuery('purchaseInward'), (snapshot) => {
        const list: PurchaseInward[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as PurchaseInward);
        });
        setPurchaseInward((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'purchaseInward'));
    }

    let unsubRevokes = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubRevokes = onSnapshot(getTenantQuery('revokeRequests'), (snapshot) => {
        const list: RevokeRequest[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as RevokeRequest);
        });
        setRevokeRequests((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.REVOKES, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'revokeRequests'));
    }

    let unsubLpReqs = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubLpReqs = onSnapshot(getTenantQuery('lpRequests'), (snapshot) => {
        const list: LPRequest[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as LPRequest);
        });
        setLpRequests((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.LP_REQS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'lpRequests'));
    } else if (role === 'Team Leader') {
      const q = query(collection(db, 'lpRequests'), where('orgId', '==', userOrgId), where('tlEmail', '==', currentUser.email));
      unsubLpReqs = onSnapshot(q, (snapshot) => {
        const list: LPRequest[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as LPRequest);
        });
        setLpRequests((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.LP_REQS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'lpRequests'));
    } else if (role === 'Engineer') {
      const q = query(collection(db, 'lpRequests'), where('orgId', '==', userOrgId), where('submittedBy', '==', currentUser.email));
      unsubLpReqs = onSnapshot(q, (snapshot) => {
        const list: LPRequest[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as LPRequest);
        });
        setLpRequests((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.LP_REQS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'lpRequests'));
    }

    let unsubAttendanceReqs = () => {};
    if (['Super Admin', 'Admin'].includes(role)) {
      unsubAttendanceReqs = onSnapshot(getTenantQuery('attendanceRequests'), (snapshot) => {
        const list: AttendanceRequest[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as AttendanceRequest);
        });
        setAttendanceRequests((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE_REQS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'attendanceRequests'));
    } else if (['Store Manager', 'Team Leader', 'Engineer', 'Backend Executive'].includes(role)) {
      const q = query(collection(db, 'attendanceRequests'), where('orgId', '==', userOrgId), where('submittedBy', '==', currentUser.email));
      unsubAttendanceReqs = onSnapshot(q, (snapshot) => {
        const list: AttendanceRequest[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as AttendanceRequest);
        });
        setAttendanceRequests((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE_REQS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'attendanceRequests'));
    }

    let unsubReturnRequests = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubReturnRequests = onSnapshot(getTenantQuery('returnRequests'), (snapshot) => {
        const list: ReturnRequest[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as ReturnRequest);
        });
        setReturnRequests((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'returnRequests'));
    } else if (role === 'Engineer') {
      const q = query(collection(db, 'returnRequests'), where('orgId', '==', userOrgId), where('engEmail', '==', currentUser.email));
      unsubReturnRequests = onSnapshot(q, (snapshot) => {
        const list: ReturnRequest[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as ReturnRequest);
        });
        setReturnRequests((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'returnRequests'));
    }

    let unsubPOs = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubPOs = onSnapshot(getTenantQuery('purchaseOrders'), (snapshot) => {
        const list: PurchaseOrder[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as PurchaseOrder);
        });
        setPurchaseOrders((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem('fieldops_purchase_orders', JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'purchaseOrders'));
    }

    let unsubDebits = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubDebits = onSnapshot(getTenantQuery('supplierDebits'), (snapshot) => {
        const list: SupplierDebit[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as SupplierDebit);
        });
        setSupplierDebits((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem('fieldops_supplier_debits', JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'supplierDebits'));
    }

    let unsubVendors = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubVendors = onSnapshot(getTenantQuery('vendors'), (snapshot) => {
        const list: Vendor[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Vendor);
        });
        setVendors((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem('fieldops_vendors', JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'vendors'));
    }

    let unsubSales = () => {};
    if (['Super Admin', 'Admin', 'Store Manager'].includes(role)) {
      unsubSales = onSnapshot(getTenantQuery('salesRecords'), (snapshot) => {
        const list: SaleRecord[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as SaleRecord);
        });
        setSalesRecords((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
          localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(list));
          return list;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'salesRecords'));
    }

    return () => {
      unsubUsers();
      unsubOrgs();
      unsubSkus();
      unsubInventory();
      unsubEngStock();
      unsubLogs();
      unsubAttendance();
      unsubStockReqs();
      unsubPurchases();
      unsubRevokes();
      unsubLpReqs();
      unsubAttendanceReqs();
      unsubReturnRequests();
      unsubPOs();
      unsubDebits();
      unsubVendors();
      unsubSales();
    };
  }, [currentUser, offlineMode, selectedTLMonth]);

  // Self-healing: Ensure all approved productivity logs are synced to the attendance register
  useEffect(() => {
    if (offlineMode || productivityLogs.length === 0) return;

    let needsSync = false;
    const nextAttendance = { ...attendance };

    for (const log of productivityLogs) {
      if (log.status === 'Approved') {
        const expectedStatus = log.attendanceStatus || 'Present';
        const userAtt = nextAttendance[log.engEmail];
        if (!userAtt || userAtt[log.date] !== expectedStatus) {
          if (!nextAttendance[log.engEmail]) {
            nextAttendance[log.engEmail] = {};
          }
          nextAttendance[log.engEmail] = {
            ...nextAttendance[log.engEmail],
            [log.date]: expectedStatus
          };
          needsSync = true;
        }
      }
    }

    if (needsSync) {
      console.log('Self-healing: Syncing approved productivity logs to attendance register...');
      syncState(STORAGE_KEYS.ATTENDANCE, nextAttendance, setAttendance);
    }
  }, [productivityLogs, attendance, offlineMode]);

  // Session version watcher for "Logout from all devices" sync
  useEffect(() => {
    if (offlineMode || !currentUser || users.length === 0) return;
    const freshUser = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (freshUser) {
      const currentVersion = currentUser.sessionVersion || 1;
      const freshVersion = freshUser.sessionVersion || 1;
      if (freshVersion > currentVersion) {
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.LOGGED_USER);
        setProfileMenuOpen(false);
        setActiveTab('');
        addToast("Session invalidated: logged out from all devices.", "error");
      }
    }
  }, [users, currentUser, offlineMode]);

  // Monitor organization suspension status for active sessions
  useEffect(() => {
    if (currentUser && currentUser.role !== 'Super Admin' && currentUser.orgId) {
      const myOrg = organisations.find((o) => o.id === currentUser.orgId);
      if (myOrg && myOrg.status === 'suspended') {
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.LOGGED_USER);
        setProfileMenuOpen(false);
        setActiveTab('');
        addToast('Your organization has been suspended. You have been logged out.', 'error');
      }
    }
  }, [organisations, currentUser]);

  // Monitor user suspension status for active sessions
  useEffect(() => {
    if (currentUser) {
      const freshUser = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
      if (freshUser && freshUser.isSuspended) {
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.LOGGED_USER);
        setProfileMenuOpen(false);
        setActiveTab('');
        addToast('Your user profile has been suspended. You have been logged out.', 'error');
      }
    }
  }, [users, currentUser]);


  // Sync back state utilities with Firestore & LocalStorage fallback
  const syncState = async <T,>(key: string, value: T, setter: React.Dispatch<React.SetStateAction<T>>) => {
    setter(value);
    localStorage.setItem(key, JSON.stringify(value));

    if (offlineMode) {
      console.log(`State sync for "${key}" skipped (App is running in Offline Fallback Mode).`);
      return;
    }

    try {
      if (key === STORAGE_KEYS.USERS) {
        const usersList = value as User[];
        const currentEmails = usersList.map(u => u.email.toLowerCase());
        const deletedUsers = users.filter((u) => !currentEmails.includes(u.email.toLowerCase()));
        for (const du of deletedUsers) {
          await deleteDocument('users', du.email);
        }
        for (const u of usersList) {
          const existing = users.find((x) => x.email === u.email);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(u)) {
            await writeDocument('users', u.email, u);
          }
        }
      } else if (key === STORAGE_KEYS.SKUS) {
        const skusList = value as SKU[];
        const activeOrgId = currentUser?.orgId || 'org-001';
        if (currentUser?.role === 'Super Admin') {
          const currentDocIds = skusList.map(s => `${s.orgId || 'org-001'}_${s.id}`);
          const deletedSkus = skus.filter((s) => !currentDocIds.includes(`${s.orgId || 'org-001'}_${s.id}`));
          for (const ds of deletedSkus) {
            await deleteDocument('skus', `${ds.orgId || 'org-001'}_${ds.id}`);
          }
          for (const s of skusList) {
            const docId = `${s.orgId || 'org-001'}_${s.id}`;
            const existing = skus.find((x) => x.id === s.id && (x.orgId || 'org-001') === (s.orgId || 'org-001'));
            if (!existing || JSON.stringify(existing) !== JSON.stringify(s)) {
              await writeDocument('skus', docId, s);
            }
          }
        } else {
          const currentDocIds = skusList.map(s => `${s.orgId || activeOrgId}_${s.id}`);
          const deletedSkus = skus.filter((s) => s.orgId === activeOrgId && !currentDocIds.includes(`${s.orgId || activeOrgId}_${s.id}`));
          for (const ds of deletedSkus) {
            await deleteDocument('skus', `${ds.orgId || activeOrgId}_${ds.id}`);
          }
          for (const s of skusList) {
            const docId = `${s.orgId || activeOrgId}_${s.id}`;
            const existing = skus.find((x) => x.id === s.id && (x.orgId || activeOrgId) === (s.orgId || activeOrgId));
            const updatedSku = { ...s, orgId: s.orgId || activeOrgId };
            if (!existing || JSON.stringify(existing) !== JSON.stringify(updatedSku)) {
              await writeDocument('skus', docId, updatedSku);
            }
          }
        }
      } else if (key === STORAGE_KEYS.INVENTORY) {
        const inventoryList = value as InventoryItem[];
        for (const i of inventoryList) {
          const docId = `${i.orgId || 'org-001'}_${i.skuId}`;
          const existing = inventory.find((x) => x.skuId === i.skuId && (x.orgId || 'org-001') === (i.orgId || 'org-001'));
          if (!existing || JSON.stringify(existing) !== JSON.stringify(i)) {
            await writeDocument('inventory', docId, i);
          }
        }
      } else if (key === STORAGE_KEYS.ENG_STOCK) {
        const engStockObj = value as EngineerStock;
        for (const [email, stock] of Object.entries(engStockObj)) {
          const existing = engineerStock[email];
          if (!existing || JSON.stringify(existing) !== JSON.stringify(stock)) {
            await writeDocument('engineerStock', email, { email, stock });
          }
        }
      } else if (key === STORAGE_KEYS.LOGS) {
        const logsList = value as ProductivityLog[];
        for (const l of logsList) {
          const existing = productivityLogs.find((x) => x.id === l.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(l)) {
            await writeDocument('productivityLogs', l.id, l);
          }
        }
      } else if (key === STORAGE_KEYS.ATTENDANCE) {
        const attendanceObj = value as AttendanceRecord;
        for (const [email, dates] of Object.entries(attendanceObj)) {
          const existing = attendance[email];
          if (!existing || !isDatesEqual(existing, dates)) {
            await writeDocument('attendance', email, { email, dates });
          }
        }
      } else if (key === STORAGE_KEYS.STOCK_REQS) {
        const reqsList = value as StockRequest[];
        for (const r of reqsList) {
          const existing = stockRequests.find((x) => x.id === r.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(r)) {
            await writeDocument('stockRequests', r.id, r);
          }
        }
      } else if (key === STORAGE_KEYS.PURCHASES) {
        const purchasesList = value as PurchaseInward[];
        for (const p of purchasesList) {
          const existing = purchaseInward.find((x) => x.id === p.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(p)) {
            await writeDocument('purchaseInward', p.id, p);
          }
        }
      } else if (key === STORAGE_KEYS.REVOKES) {
        const revokesList = value as RevokeRequest[];
        for (const r of revokesList) {
          const existing = revokeRequests.find((x) => x.id === r.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(r)) {
            await writeDocument('revokeRequests', r.id, r);
          }
        }
      } else if (key === STORAGE_KEYS.LP_REQS) {
        const lpList = value as LPRequest[];
        for (const lp of lpList) {
          const existing = lpRequests.find((x) => x.id === lp.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(lp)) {
            await writeDocument('lpRequests', lp.id, lp);
          }
        }
      } else if (key === STORAGE_KEYS.ATTENDANCE_REQS) {
        const reqsList = value as AttendanceRequest[];
        for (const req of reqsList) {
          const existing = attendanceRequests.find((x) => x.id === req.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(req)) {
            await writeDocument('attendanceRequests', req.id, req);
          }
        }
      } else if (key === STORAGE_KEYS.RETURNS) {
        const returnsList = value as ReturnRequest[];
        for (const r of returnsList) {
          const existing = returnRequests.find((x) => x.id === r.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(r)) {
            await writeDocument('returnRequests', r.id, r);
          }
        }
      } else if (key === STORAGE_KEYS.ORGANISATIONS) {
        const orgsList = value as Organisation[];
        const currentIds = orgsList.map((o) => o.id);
        const deletedOrgs = organisations.filter((o) => !currentIds.includes(o.id));
        for (const dor of deletedOrgs) {
          await deleteDocument('organisations', dor.id);
        }
        for (const o of orgsList) {
          const existing = organisations.find((x) => x.id === o.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(o)) {
            await writeDocument('organisations', o.id, o);
          }
        }
      } else if (key === 'fieldops_supplier_debits') {
        const debitsList = value as SupplierDebit[];
        for (const d of debitsList) {
          const existing = supplierDebits.find((x) => x.id === d.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(d)) {
            await writeDocument('supplierDebits', d.id, d);
          }
        }
      } else if (key === 'fieldops_vendors') {
        const vendorsList = value as Vendor[];
        for (const v of vendorsList) {
          const existing = vendors.find((x) => x.id === v.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(v)) {
            await writeDocument('vendors', v.id, v);
          }
        }
      } else if (key === STORAGE_KEYS.SALES) {
        const salesList = value as SaleRecord[];
        for (const s of salesList) {
          const existing = salesRecords.find((x) => x.id === s.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(s)) {
            await writeDocument('salesRecords', s.id, s);
          }
        }
      }
    } catch (err) {
      console.error("Firestore sync block failure: ", err);
    }
  };

  const getDefaultLandingPage = (role: UserRole): string => {
    if (role === 'Super Admin') return 'super-orgs';
    if (role === 'Admin') return 'admin-approvals';
    if (role === 'Store Manager') return 'store-dashboard';
    if (role === 'Team Leader') return 'tl-approvals';
    if (role === 'Backend Executive') return 'be-attendance';
    return 'eng-dashboard';
  };

  // Auth trigger callbacks
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEYS.LOGGED_USER, JSON.stringify(user));
    setActiveTab(getDefaultLandingPage(user.role));
    addToast(`Successfully logged in as ${user.name}!`, 'success');
  };

  const handleRegisterOrganisation = async (orgName: string, adminName: string, email: string, password: string): Promise<boolean> => {
    try {
      const orgId = `org-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      const newOrg: Organisation = {
        id: orgId,
        name: orgName,
        siteCode: 'DEL-01',
        status: 'active',
        subscriptionPlan: 'free-trial',
        subscriptionPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };

      const newAdminUser: User = {
        email: email.trim().toLowerCase(),
        name: adminName.trim(),
        role: 'Admin',
        password: password,
        orgId: orgId,
        invitationStatus: 'active',
        isSuspended: false
      };

      await writeDocument('organisations', orgId, newOrg);
      await writeDocument('users', newAdminUser.email, newAdminUser);
      
      // Seed default SKUs as sample data (walkthrough onboarding)
      const defaultSkus = [
        { id: `SKU-${orgId}-001`, name: 'Standard Router Cat6', lowStockAlert: 5, orgId },
        { id: `SKU-${orgId}-002`, name: 'Fiber Cable 100m', lowStockAlert: 10, orgId },
        { id: `SKU-${orgId}-003`, name: 'ONU Gateway Receiver', lowStockAlert: 3, orgId }
      ];

      for (const s of defaultSkus) {
        await writeDocument('skus', s.id, s);
        await writeDocument('inventory', s.id, { skuId: s.id, qty: 0, unitPrice: 0, orgId });
      }

      addToast(`Organization "${orgName}" registered successfully!`, 'success');
      return true;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to register organization.', 'error');
      return false;
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.LOGGED_USER);
    setActiveTab('');
    addToast('Logged out of operations dashboard.', 'success');
  };

  const handleLogoutFromAllDevices = async () => {
    if (!currentUser) return;
    try {
      const userEmail = currentUser.email.toLowerCase();
      const currentVersion = currentUser.sessionVersion || 1;
      const nextVersion = currentVersion + 1;

      // Update in Firestore
      await writeDocument('users', userEmail, {
        ...currentUser,
        sessionVersion: nextVersion
      });

      // Log out locally
      setCurrentUser(null);
      localStorage.removeItem(STORAGE_KEYS.LOGGED_USER);
      setProfileMenuOpen(false);
      setActiveTab('');
      addToast("Logged out from all devices successfully.", "success");
    } catch (err) {
      console.error("Logout from all devices error:", err);
      addToast("Failed to trigger logout. Please try again.", "error");
    }
  };

  const handleProcessSaleRecord = (saleId: string, status: 'Approved' | 'Rejected', adminNote?: string) => {
    const sale = salesRecords.find(s => s.id === saleId);
    if (!sale) return;

    const updatedSales = salesRecords.map(s => {
      if (s.id === saleId) return { ...s, status, adminNote };
      return s;
    });

    if (status === 'Rejected') {
      const userOrgId = currentUser?.orgId || 'org-001';
      // Return stock to inventory
      const updatedInventory = inventory.map(item => {
        if (item.skuId === sale.skuId && (item.orgId || 'org-001') === userOrgId) {
          return { ...item, qty: item.qty + sale.qty };
        }
        return item;
      });
      syncState(STORAGE_KEYS.INVENTORY, updatedInventory, setInventory);
    }

    syncState(STORAGE_KEYS.SALES, updatedSales, setSalesRecords);
  };

  const handleChangePasswordSuccess = async (updatedUser: User) => {
    await writeDocument('users', updatedUser.email, updatedUser);
    setCurrentUser(updatedUser);
    localStorage.setItem(STORAGE_KEYS.LOGGED_USER, JSON.stringify(updatedUser));
    addToast('Password updated successfully!', 'success');
  };

  const handleUpdatePlan = async (plan: 'free-trial' | 'basic' | 'professional' | 'enterprise') => {
    if (!currentUser || !currentUser.orgId) return;
    const org = organisations.find(o => o.id === currentUser.orgId);
    if (!org) return;
    const updatedOrg = {
      ...org,
      subscriptionPlan: plan,
      status: 'active' as const,
      subscriptionPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    await writeDocument('organisations', org.id, updatedOrg);
    addToast(`Subscription upgraded to ${plan} successfully!`, 'success');
  };

  const handleToggleOrgStatus = async (orgId: string, nextStatus: 'active' | 'suspended' | 'expired') => {
    const org = organisations.find(o => o.id === orgId);
    if (!org) return;
    const updatedOrg = { ...org, status: nextStatus };
    await writeDocument('organisations', orgId, updatedOrg);
    addToast(`Tenant status updated to ${nextStatus}!`, 'success');
  };



  const addToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const adjustStockForLogChange = (
    oldLogs: ProductivityLog[],
    newLogs: ProductivityLog[]
  ) => {
    let nextEngStock = { ...engineerStock };
    let hasStockChange = false;

    newLogs.forEach((newLog) => {
      const oldLog = oldLogs.find((ol) => ol.id === newLog.id);
      const email = newLog.engEmail.toLowerCase();

      if (!oldLog) {
        // Case 1: First time log submission
        if (newLog.status !== 'Rejected') {
          const currentVanStock = nextEngStock[email] || [];
          let updatedVanStock = [...currentVanStock];
          newLog.accessories.forEach((acc) => {
            const existing = updatedVanStock.find(item => item.skuId === acc.skuId);
            if (existing) {
              updatedVanStock = updatedVanStock.map(item =>
                item.skuId === acc.skuId ? { ...item, qty: Math.max(0, item.qty - acc.qty) } : item
              );
            } else {
              updatedVanStock.push({ skuId: acc.skuId, qty: 0 });
            }
          });
          nextEngStock[email] = updatedVanStock;
          hasStockChange = true;
        }
      } else {
        // Case 2: Transition to Rejected (Rejection)
        if (oldLog.status !== 'Rejected' && newLog.status === 'Rejected') {
          const currentVanStock = nextEngStock[email] || [];
          let updatedVanStock = [...currentVanStock];
          oldLog.accessories.forEach((acc) => {
            const existing = updatedVanStock.find(item => item.skuId === acc.skuId);
            if (existing) {
              updatedVanStock = updatedVanStock.map(item =>
                item.skuId === acc.skuId ? { ...item, qty: item.qty + acc.qty } : item
              );
            } else {
              updatedVanStock.push({ skuId: acc.skuId, qty: acc.qty });
            }
          });
          nextEngStock[email] = updatedVanStock;
          hasStockChange = true;
        }
        // Case 3: Transition from Rejected to non-Rejected (Resubmission)
        else if (oldLog.status === 'Rejected' && newLog.status !== 'Rejected') {
          const currentVanStock = nextEngStock[email] || [];
          let updatedVanStock = [...currentVanStock];
          newLog.accessories.forEach((acc) => {
            const existing = updatedVanStock.find(item => item.skuId === acc.skuId);
            if (existing) {
              updatedVanStock = updatedVanStock.map(item =>
                item.skuId === acc.skuId ? { ...item, qty: Math.max(0, item.qty - acc.qty) } : item
              );
            } else {
              updatedVanStock.push({ skuId: acc.skuId, qty: 0 });
            }
          });
          nextEngStock[email] = updatedVanStock;
          hasStockChange = true;
        }
      }
    });

    if (hasStockChange) {
      syncState(STORAGE_KEYS.ENG_STOCK, nextEngStock, setEngineerStock);
    }
  };



  if (!currentUser) {
    return (
      <div id="login-container" className="fixed inset-0 z-50 flex flex-col md:flex-row items-center justify-center bg-radial from-[rgba(79,91,213,0.06)] to-transparent bg-slate-100 p-4 gap-6 overflow-y-auto">
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onRegisterOrganisation={handleRegisterOrganisation}
        />
        
        {/* Firebase Rules Advisor Panel for user-guided external project deployment */}
        <div id="firebase-advisor" className="w-full max-w-sm bg-white rounded-3xl border border-slate-200/60 p-6 shadow-2xl flex flex-col gap-4 text-xs select-none">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold text-[10px]">i</span>
            <h3 className="font-sans font-extrabold text-xs text-slate-900 uppercase tracking-wide">Firebase Integration Guide</h3>
          </div>
          
          <div className="flex flex-col gap-3">
            <p className="text-slate-500 font-semibold leading-relaxed">
              Connected external Firebase project ID: <strong className="font-bold text-indigo-600 font-mono">my-backend-app-34cf4</strong>.
            </p>

            {offlineMode ? (
              <div className="rounded-xl bg-emerald-50/75 border border-emerald-100 p-3.5 flex flex-col gap-2 font-medium">
                <span className="text-emerald-800 font-bold flex items-center gap-1.5 shrink-0">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                  Offline Mode Active
                </span>
                <span className="text-slate-500 text-[11px] leading-relaxed font-semibold">
                  The client is currently ignoring Firestore cloud queries and operating completely in-browser with mock data.
                </span>
                <button
                  onClick={() => {
                    setOfflineMode(false);
                    localStorage.setItem('fieldops_offline_mode', 'false');
                    addToast('Cloud Sync Mode selected! Attempting reconnect.', 'success');
                  }}
                  className="mt-1 w-full py-1.5 rounded-lg border border-indigo-200 hover:border-indigo-600 bg-white hover:bg-indigo-50/30 font-bold text-indigo-600 transition"
                >
                  Enable Cloud Sync
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl bg-amber-50/80 border border-amber-200/50 p-3.5 flex flex-col gap-2 font-medium">
                  <span className="text-amber-800 font-bold flex items-center gap-1.5 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block"></span>
                    Credentials Security Status
                  </span>
                  <span className="text-slate-500 text-[11px] leading-relaxed font-semibold">
                    To connect your custom Firestore database, copy the security rules from <strong className="font-bold text-slate-700 font-mono">/firestore.rules</strong> and paste them in your Firebase Console rules tab.
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Unblock Testing Immediately</span>
                  <button
                    onClick={() => {
                      setOfflineMode(true);
                      localStorage.setItem('fieldops_offline_mode', 'true');
                      addToast('Failsafe offline demo mode activated!', 'success');
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl transition shadow-lg shadow-indigo-600/15"
                  >
                    Switch to Offline Mode
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-1.5 font-semibold text-slate-400 text-[10.5px]">
            <span>1. Open <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Firebase Console</a></span>
            <span>2. Click "Firestore Database" &rarr; "Rules"</span>
            <span>3. Paste local contents of `/firestore.rules`</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#edf0f7] text-slate-900 overflow-hidden font-sans font-medium selection:bg-indigo-600 selection:text-white">
      {/* Sidebar Overlay Layer for Mobile */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Dynamic Module Sidebar Left containing Drawer for mobile and default side panel for desktop */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:static md:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          onPageChange={(page) => {
            setActiveTab(page);
            setIsMobileSidebarOpen(false);
          }}
          onLogout={handleLogout}
          onCloseSidebar={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Main Core View Area Right */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        {/* Top Header Bar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-200/50 bg-[#edf0f7] shrink-0 select-none">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger menu */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-200/50 transition shrink-0"
              title="Open Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold hidden xs:inline-block">Terminal Ingress Node</span>
              
              {offlineMode ? (
                <button
                  onClick={() => {
                    setOfflineMode(false);
                    localStorage.setItem('fieldops_offline_mode', 'false');
                    addToast('Cloud Sync Mode selected! Attempting reconnect.', 'success');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-600 hover:bg-amber-50 transition"
                  title="Offline Mode Active. Click to try Real-Time cloud synchronization."
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block"></span>
                  Offline Mode
                </button>
              ) : (
                <button
                  onClick={() => {
                    setOfflineMode(true);
                    localStorage.setItem('fieldops_offline_mode', 'true');
                    addToast('Bypassed to offline mode.', 'success');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 transition"
                  title="Real-Time Cloud Synced. Click to go offline."
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Cloud Synced
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="hidden sm:inline">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <span className="sm:hidden">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                id="profile-dropdown-btn"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center justify-center h-9 w-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 transition cursor-pointer select-none font-bold text-sm relative"
                title="Profile Settings"
              >
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </button>

              {profileMenuOpen && (
                <>
                  {/* Backdrop overlay to click away */}
                  <div
                    className="fixed inset-0 z-45"
                    onClick={() => setProfileMenuOpen(false)}
                  ></div>

                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-slate-700">
                    <div className="px-3 py-2">
                      <p className="text-xs font-extrabold text-slate-900 truncate">{currentUser.name}</p>
                      <p className="text-[10px] font-semibold text-indigo-600 truncate">{currentUser.role}</p>
                      <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                    </div>

                    <div className="h-px bg-slate-100 my-1.5"></div>

                    <button
                      id="profile-signout-btn"
                      onClick={() => {
                        handleLogout();
                        setProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-50 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-slate-450 shrink-0" />
                      Sign Out
                    </button>

                    <button
                      id="profile-change-password-btn"
                      onClick={() => {
                        setShowChangePassword(true);
                        setProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-50 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                    >
                      <Key className="h-4 w-4 text-slate-450 shrink-0" />
                      Change Password
                    </button>

                    <button
                      id="profile-logout-all-btn"
                      onClick={handleLogoutFromAllDevices}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-rose-50 text-xs font-bold text-rose-600 hover:text-rose-700 transition cursor-pointer"
                    >
                      <ShieldAlert className="h-4 w-4 text-rose-450 shrink-0" />
                      Logout All Devices
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Context container */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
          {(() => {
            const isSuperAdmin = currentUser.role === 'Super Admin';
            const userOrgId = currentUser.orgId || '';

            const currentOrgUsersByMail = new Set(
              users.filter(u => isSuperAdmin || u.orgId === userOrgId).map(u => u.email.toLowerCase())
            );

            const filteredUsers = isSuperAdmin ? users : users.filter(u => u.orgId === userOrgId);
            const filteredSkus = isSuperAdmin ? skus : skus.filter(s => s.orgId === userOrgId);
            const filteredInventory = isSuperAdmin ? inventory : inventory.filter(i => i.orgId === userOrgId);

            const filteredEngineerStock = isSuperAdmin 
              ? engineerStock 
              : Object.keys(engineerStock).reduce((acc, email) => {
                  if (currentOrgUsersByMail.has(email.toLowerCase())) {
                    acc[email] = engineerStock[email];
                  }
                  return acc;
                }, {} as EngineerStock);

            const filteredLogs = isSuperAdmin 
              ? productivityLogs 
              : productivityLogs.filter(l => currentOrgUsersByMail.has(l.engEmail.toLowerCase()) || l.orgId === userOrgId);

            const mergedAttendance: AttendanceRecord = {};
            for (const [email, dates] of Object.entries(attendance)) {
              mergedAttendance[email] = { ...(dates as any) };
            }
            for (const log of productivityLogs) {
              if (log.status === 'Approved') {
                if (!mergedAttendance[log.engEmail]) {
                  mergedAttendance[log.engEmail] = {};
                }
                mergedAttendance[log.engEmail][log.date] = log.attendanceStatus || 'Present';
              }
            }

            const filteredAttendance = isSuperAdmin 
              ? mergedAttendance 
              : Object.keys(mergedAttendance).reduce((acc, email) => {
                  if (currentOrgUsersByMail.has(email.toLowerCase())) {
                    acc[email] = mergedAttendance[email];
                  }
                  return acc;
                }, {} as AttendanceRecord);

            const filteredStockRequests = isSuperAdmin 
              ? stockRequests 
              : stockRequests.filter(r => currentOrgUsersByMail.has(r.engEmail.toLowerCase()) || r.orgId === userOrgId);

            const filteredPurchases = isSuperAdmin ? purchaseInward : purchaseInward.filter(p => p.orgId === userOrgId);
            const filteredSupplierDebits = isSuperAdmin ? supplierDebits : supplierDebits.filter(d => d.orgId === userOrgId);
            const filteredVendors = isSuperAdmin ? vendors : vendors.filter(v => v.orgId === userOrgId);
            const filteredRevokes = isSuperAdmin 
              ? revokeRequests 
              : revokeRequests.filter(r => currentOrgUsersByMail.has(r.engEmail.toLowerCase()) || r.orgId === userOrgId);

            const filteredLpRequests = isSuperAdmin 
              ? lpRequests 
              : lpRequests.filter(lp => currentOrgUsersByMail.has(lp.tlEmail.toLowerCase()) || lp.orgId === userOrgId);

            const filteredAttendanceRequests = isSuperAdmin 
              ? attendanceRequests 
              : attendanceRequests.filter(req => req.orgId === userOrgId);

            const filteredReturnRequests = isSuperAdmin 
              ? returnRequests 
              : returnRequests.filter(r => currentOrgUsersByMail.has(r.engEmail.toLowerCase()) || r.orgId === userOrgId);

            const filteredPurchaseOrders = isSuperAdmin
              ? purchaseOrders
              : purchaseOrders.filter(po => po.orgId === userOrgId);

            const filteredSalesRecords = isSuperAdmin
              ? salesRecords
              : salesRecords.filter(s => s.orgId === userOrgId);

            if (currentUser.role === 'Super Admin') {
              return (
                <SuperAdminPages
                  currentUser={currentUser}
                  users={users}
                  organisations={organisations}
                  activeTab={activeTab}
                  purchaseOrders={filteredPurchaseOrders}
                  onUpdatePurchaseOrders={(pos) => {
                    syncState('fieldops_purchase_orders', pos, setPurchaseOrders);
                  }}
                  onUpdateUsers={(u) => syncState(STORAGE_KEYS.USERS, u, setUsers)}
                  onUpdateOrganisations={(o) => syncState(STORAGE_KEYS.ORGANISATIONS, o, setOrganisations)}
                  onAddToast={addToast}
                />
              );
            }

            if (currentUser.role === 'Admin') {
              return (
                <AdminPages
                  currentUser={currentUser}
                  users={filteredUsers}
                  skus={filteredSkus}
                  inventory={filteredInventory}
                  salesRecords={filteredSalesRecords}
                  onUpdateSalesRecords={(sales) => {
                    const withOrg = sales.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = salesRecords.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.SALES, [...others, ...withOrg], setSalesRecords);
                  }}
                  onProcessSaleRecord={handleProcessSaleRecord}
                  purchaseOrders={filteredPurchaseOrders}
                  onUpdatePurchaseOrders={(pos) => {
                    const withOrg = pos.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = purchaseOrders.filter(x => x.orgId !== userOrgId);
                    syncState('fieldops_purchase_orders', [...others, ...withOrg], setPurchaseOrders);
                  }}
                  productivityLogs={filteredLogs}
                  attendance={filteredAttendance}
                  attendanceRequests={filteredAttendanceRequests}
                  onUpdateAttendanceRequests={(reqs) => {
                    const withOrg = reqs.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = attendanceRequests.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.ATTENDANCE_REQS, [...others, ...withOrg], setAttendanceRequests);
                  }}
                  purchaseInward={filteredPurchases}
                  supplierDebits={filteredSupplierDebits}
                  onAddSupplierDebit={(sd) => syncState('fieldops_supplier_debits', [...supplierDebits, { ...sd, orgId: userOrgId }], setSupplierDebits)}
                  vendors={filteredVendors}
                  onAddVendor={(v) => syncState('fieldops_vendors', [...vendors, { ...v, orgId: userOrgId }], setVendors)}
                  revokeRequests={filteredRevokes}
                  stockRequests={filteredStockRequests}
                  engineerStock={filteredEngineerStock}
                  lpRequests={filteredLpRequests}
                  activeTab={activeTab}
                  onUpdateUsers={(u) => {
                    const withOrg = u.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = users.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.USERS, [...others, ...withOrg], setUsers);
                  }}
                  onUpdateSkus={(s) => {
                    const withOrg = s.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = skus.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.SKUS, [...others, ...withOrg], setSkus);
                  }}
                  onUpdateInventory={(i) => {
                    const withOrg = i.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = inventory.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.INVENTORY, [...others, ...withOrg], setInventory);
                  }}
                  onUpdateLogs={(l) => {
                    const withOrg = l.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    adjustStockForLogChange(productivityLogs, withOrg);
                    const others = productivityLogs.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.LOGS, [...others, ...withOrg], setProductivityLogs);
                  }}
                  onUpdateAttendance={(a) => {
                    const nextAttendance = { ...attendance, ...a };
                    syncState(STORAGE_KEYS.ATTENDANCE, nextAttendance, setAttendance);
                  }}
                  onUpdatePurchaseInward={(pi) => {
                    const withOrg = pi.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = purchaseInward.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.PURCHASES, [...others, ...withOrg], setPurchaseInward);
                  }}
                  onUpdateRevokeRequests={(rv) => {
                    const withOrg = rv.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = revokeRequests.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.REVOKES, [...others, ...withOrg], setRevokeRequests);
                  }}
                  onUpdateStockRequests={(sr) => {
                    const withOrg = sr.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = stockRequests.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.STOCK_REQS, [...others, ...withOrg], setStockRequests);
                  }}
                  onUpdateEngineerStock={(es) => {
                    const nextEngStock = { ...engineerStock, ...es };
                    syncState(STORAGE_KEYS.ENG_STOCK, nextEngStock, setEngineerStock);
                  }}
                  onUpdateLpRequests={(lp) => {
                    const withOrg = lp.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = lpRequests.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.LP_REQS, [...others, ...withOrg], setLpRequests);
                  }}
                  onAddToast={addToast}
                />
              );
            }

            if (currentUser.role === 'Store Manager') {
              return (
                <StoreManagerPages
                  currentUser={currentUser}
                  users={filteredUsers}
                  skus={filteredSkus}
                  inventory={filteredInventory}
                  salesRecords={filteredSalesRecords}
                  onAddSaleRecord={(sale) => {
                    const withOrg = { ...sale, orgId: userOrgId };
                    syncState(STORAGE_KEYS.SALES, [...salesRecords, withOrg], setSalesRecords);
                  }}
                  onUpdateSalesRecords={(sales) => {
                    const withOrg = sales.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = salesRecords.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.SALES, [...others, ...withOrg], setSalesRecords);
                  }}
                  engineerStock={filteredEngineerStock}
                  attendance={filteredAttendance}
                  stockRequests={filteredStockRequests}
                  purchaseInward={filteredPurchases}
                  supplierDebits={filteredSupplierDebits}
                  onAddSupplierDebit={(sd) => syncState('fieldops_supplier_debits', [...supplierDebits, { ...sd, orgId: userOrgId }], setSupplierDebits)}
                  vendors={filteredVendors}
                  onAddVendor={(v) => syncState('fieldops_vendors', [...vendors, { ...v, orgId: userOrgId }], setVendors)}
                  returnRequests={filteredReturnRequests}
                  activeTab={activeTab}
                  lpRequests={filteredLpRequests}
                  productivityLogs={filteredLogs}
                  attendanceRequests={filteredAttendanceRequests}
                  onAddAttendanceRequest={(req) => {
                    const withOrg = { ...req, orgId: userOrgId };
                    syncState(STORAGE_KEYS.ATTENDANCE_REQS, [...attendanceRequests, withOrg], setAttendanceRequests);
                  }}
                  onUpdateAttendanceRequests={(reqs) => {
                    const withOrg = reqs.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = attendanceRequests.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.ATTENDANCE_REQS, [...others, ...withOrg], setAttendanceRequests);
                  }}
                  onUpdateLogs={(updated) => {
                    const withOrg = updated.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    adjustStockForLogChange(productivityLogs, withOrg);
                    const others = productivityLogs.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.LOGS, [...others, ...withOrg], setProductivityLogs);
                  }}
                  onUpdateLpRequests={(lp) => {
                    const withOrg = lp.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = lpRequests.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.LP_REQS, [...others, ...withOrg], setLpRequests);
                  }}
                  onAddPurchaseInward={(pi) => {
                    const withOrg = { ...pi, orgId: userOrgId };
                    syncState(STORAGE_KEYS.PURCHASES, [...purchaseInward, withOrg], setPurchaseInward);
                  }}
                  onUpdatePurchaseInward={(pi) => {
                    const withOrg = pi.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = purchaseInward.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.PURCHASES, [...others, ...withOrg], setPurchaseInward);
                  }}
                  onApproveStockRequest={(id, status) => {
                    const req = stockRequests.find((r) => r.id === id);
                    if (!req) return;

                    const updated = stockRequests.map((r) => {
                      if (r.id === id) return { ...r, status, orgId: r.orgId || userOrgId };
                      return r;
                    });

                    if (status === 'Approved') {
                      // deduct warehouse stock
                      const updatedInventory = inventory.map((i) => {
                        if (i.skuId === req.skuId && i.orgId === userOrgId) return { ...i, qty: Math.max(0, i.qty - req.qty) };
                        return i;
                      });

                      // add to engineer stock
                      const updatedEngStock = { ...engineerStock };
                      const currentHolds = updatedEngStock[req.engEmail] || [];
                      const holds = currentHolds.map((h) => {
                        if (h.skuId === req.skuId) return { ...h, qty: h.qty + req.qty };
                        return h;
                      });
                      if (!currentHolds.some((h) => h.skuId === req.skuId)) {
                        holds.push({ skuId: req.skuId, qty: req.qty });
                      }
                      updatedEngStock[req.engEmail] = holds;

                      syncState(STORAGE_KEYS.INVENTORY, updatedInventory, setInventory);
                      syncState(STORAGE_KEYS.ENG_STOCK, updatedEngStock, setEngineerStock);
                      addToast(`Dispatched ${req.qty} units of ${getSku(skus, req.skuId).name} onto ${getUser(users, req.engEmail).name}'s vehicle.`, 'success');
                    } else {
                      addToast(`Rejected stock allocation request for ${getUser(users, req.engEmail).name}.`, 'success');
                    }

                    syncState(STORAGE_KEYS.STOCK_REQS, updated, setStockRequests);
                  }}
                  onSubmitRevoke={(reqId) => {
                    const req = stockRequests.find((r) => r.id === reqId);
                    if (!req) return;

                    const updatedStockRequests = stockRequests.map((s) => {
                      if (s.id === reqId) return { ...s, status: 'Revoke-Pending' as const, orgId: s.orgId || userOrgId };
                      return s;
                    });

                    const updatedRevokes = [
                      ...revokeRequests,
                      {
                        id: `RV-${Date.now().toString(36).toUpperCase()}`,
                        reqId,
                        engEmail: req.engEmail,
                        skuId: req.skuId,
                        qty: req.qty,
                        date: new Date().toISOString().split('T')[0],
                        status: 'Revoke-Pending' as const,
                        orgId: userOrgId
                      },
                    ];

                    syncState(STORAGE_KEYS.STOCK_REQS, updatedStockRequests, setStockRequests);
                    syncState(STORAGE_KEYS.REVOKES, updatedRevokes, setRevokeRequests);
                  }}
                  onUpdateSkus={(s) => {
                    const withOrg = s.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = skus.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.SKUS, [...others, ...withOrg], setSkus);
                  }}
                  onUpdateInventory={(i) => {
                    const withOrg = i.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = inventory.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.INVENTORY, [...others, ...withOrg], setInventory);
                  }}
                  onProcessReturnRequest={(id, status) => {
                    const req = returnRequests.find((r) => r.id === id);
                    if (!req) return;

                    const updatedReturns = returnRequests.map((r) => {
                      if (r.id === id) return { ...r, status, orgId: r.orgId || userOrgId };
                      return r;
                    });

                    if (status === 'Approved') {
                      const updatedInventory = inventory.map((i) => {
                        if (i.skuId === req.skuId && i.orgId === userOrgId) {
                          return { ...i, qty: i.qty + req.qty };
                        }
                        return i;
                      });
                      if (!inventory.some((i) => i.skuId === req.skuId && i.orgId === userOrgId)) {
                        updatedInventory.push({ skuId: req.skuId, qty: req.qty, unitPrice: 0, orgId: userOrgId });
                      }

                      syncState(STORAGE_KEYS.INVENTORY, updatedInventory, setInventory);
                      addToast(`Approved stock return: +${req.qty} of ${getSku(skus, req.skuId).name} added back to main warehouse.`, 'success');
                    } else if (status === 'Rejected') {
                      const engEmailKey = req.engEmail.toLowerCase();
                      const updatedEngStock = { ...engineerStock };
                      const currentStock = updatedEngStock[engEmailKey] || [];
                      const nextStock = currentStock.map((item) => {
                        if (item.skuId === req.skuId) {
                          return { ...item, qty: item.qty + req.qty };
                        }
                        return item;
                      });
                      if (!currentStock.some(item => item.skuId === req.skuId)) {
                        nextStock.push({ skuId: req.skuId, qty: req.qty });
                      }
                      updatedEngStock[engEmailKey] = nextStock;

                      syncState(STORAGE_KEYS.ENG_STOCK, updatedEngStock, setEngineerStock);
                      addToast(`Rejected stock return request from ${req.engEmail}. Stock returned to van.`, 'success');
                    }

                    syncState(STORAGE_KEYS.RETURNS, updatedReturns, setReturnRequests);
                  }}
                  purchaseOrders={filteredPurchaseOrders}
                  onUpdatePurchaseOrders={(pos) => {
                    const withOrg = pos.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = purchaseOrders.filter(x => x.orgId !== userOrgId);
                    syncState('fieldops_purchase_orders', [...others, ...withOrg], setPurchaseOrders);
                  }}
                  onAddToast={addToast}
                />
              );
            }

            if (currentUser.role === 'Team Leader') {
              return (
                <TeamLeaderPages
                  currentUser={currentUser}
                  users={filteredUsers}
                  skus={filteredSkus}
                  productivityLogs={filteredLogs}
                  attendance={filteredAttendance}
                  attendanceRequests={filteredAttendanceRequests}
                  onAddAttendanceRequest={(req) => {
                    const withOrg = { ...req, orgId: userOrgId };
                    syncState(STORAGE_KEYS.ATTENDANCE_REQS, [...attendanceRequests, withOrg], setAttendanceRequests);
                  }}
                  onUpdateAttendanceRequests={(reqs) => {
                    const withOrg = reqs.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = attendanceRequests.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.ATTENDANCE_REQS, [...others, ...withOrg], setAttendanceRequests);
                  }}
                  activeTab={activeTab}
                  lpRequests={filteredLpRequests}
                  onAddLpRequest={(lp) => {
                    const withOrg = { ...lp, orgId: userOrgId };
                    syncState(STORAGE_KEYS.LP_REQS, [...lpRequests, withOrg], setLpRequests);
                  }}
                  onUpdateLpRequests={(lp) => {
                    const withOrg = lp.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = lpRequests.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.LP_REQS, [...others, ...withOrg], setLpRequests);
                  }}
                  onUpdateLogStatus={(id, status, note, validatedBy) => {
                    const updated = productivityLogs.map((l) => {
                       if (l.id === id) return { ...l, status, tlNote: note, validatedBy, orgId: l.orgId || userOrgId };
                       return l;
                    });
                    adjustStockForLogChange(productivityLogs, updated);
                    syncState(STORAGE_KEYS.LOGS, updated, setProductivityLogs);
                  }}
                  onAddToast={addToast}
                  selectedTLMonth={selectedTLMonth}
                  setSelectedTLMonth={setSelectedTLMonth}
                />
              );
            }

            if (currentUser.role === 'Engineer') {
              return (
                <EngineerPages
                  currentUser={currentUser}
                  skus={filteredSkus}
                  inventory={filteredInventory}
                  engineerStock={filteredEngineerStock}
                  productivityLogs={filteredLogs}
                  attendance={filteredAttendance}
                  stockRequests={filteredStockRequests}
                  returnRequests={filteredReturnRequests}
                  activeTab={activeTab}
                  onUpdateLogs={(updated) => {
                    const withOrg = updated.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    adjustStockForLogChange(productivityLogs, withOrg);
                    const others = productivityLogs.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.LOGS, [...others, ...withOrg], setProductivityLogs);
                  }}
                  onAddStockRequest={(req) => {
                    const withOrg = { ...req, orgId: userOrgId };
                    syncState(STORAGE_KEYS.STOCK_REQS, [...stockRequests, withOrg], setStockRequests);
                  }}
                  onAddReturnRequest={(req) => {
                    const withOrg = { ...req, orgId: userOrgId };
                    
                    // Deduct stock from VAN immediately
                    const engEmailKey = req.engEmail.toLowerCase();
                    const updatedEngStock = { ...engineerStock };
                    const currentStock = updatedEngStock[engEmailKey] || [];
                    const nextStock = currentStock.map((item) => {
                      if (item.skuId === req.skuId) {
                        return { ...item, qty: Math.max(0, item.qty - req.qty) };
                      }
                      return item;
                    });
                    updatedEngStock[engEmailKey] = nextStock;

                    syncState(STORAGE_KEYS.ENG_STOCK, updatedEngStock, setEngineerStock);
                    syncState(STORAGE_KEYS.RETURNS, [...returnRequests, withOrg], setReturnRequests);
                  }}
                  onUpdateStockRequests={(updated) => {
                    const withOrg = updated.map(x => ({ ...x, orgId: x.orgId || userOrgId }));
                    const others = stockRequests.filter(x => x.orgId !== userOrgId);
                    syncState(STORAGE_KEYS.STOCK_REQS, [...others, ...withOrg], setStockRequests);
                  }}
                  onAddProductivityLog={(log) => {
                    const withOrg = { ...log, orgId: userOrgId };
                    adjustStockForLogChange(productivityLogs, [withOrg]);
                    syncState(STORAGE_KEYS.LOGS, [...productivityLogs, withOrg], setProductivityLogs);
                  }}
                  onAddToast={addToast}
                />
              );
            }

            if (currentUser.role === 'Backend Executive') {
              return (
                <BackendExecutivePages
                  currentUser={currentUser}
                  attendance={filteredAttendance}
                  attendanceRequests={filteredAttendanceRequests}
                  onAddAttendanceRequest={(req) => {
                    const withOrg = { ...req, orgId: userOrgId };
                    syncState(STORAGE_KEYS.ATTENDANCE_REQS, [...attendanceRequests, withOrg], setAttendanceRequests);
                  }}
                  onAddToast={addToast}
                />
              );
            }

            return null;
          })()}
        </main>
      </div>



      {/* Floating Animated Toast Container (Motion implementation) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex items-center gap-3 rounded-xl border px-4.5 py-3.5 shadow-xl min-w-[280px] max-w-sm pointer-events-auto bg-slate-900 border-slate-800 text-white`}
            >
              {t.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 animate-pulse" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              )}
              <span className="text-xs font-semibold leading-normal">{t.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showChangePassword && currentUser && (
          <ChangePasswordModal
            currentUser={currentUser}
            onClose={() => setShowChangePassword(false)}
            onSuccess={handleChangePasswordSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline fallback helper in main App file for standalone safety
function getSku(skus: SKU[], id: string): SKU {
  return skus.find(s => s.id === id) || { id, name: 'Unknown Item', lowStockAlert: 0 };
}
