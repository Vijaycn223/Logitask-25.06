/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
} from './types';

export const INITIAL_ORGANISATIONS: Organisation[] = [
  { id: 'org-001', name: 'Apollo Healthcare Ops', siteCode: 'APO-01' },
  { id: 'org-002', name: 'Titan Tech Services', siteCode: 'TTN-02' },
];

export const INITIAL_USERS: User[] = [
  { email: 'vbcn223@gmail.com', name: 'Super Admin', role: 'Super Admin', password: 'Vijay@890' },
  { email: 'admin@fieldops.com', name: 'Raj Kumar', role: 'Admin', password: 'password', orgId: 'org-001' },
  { email: 'store@fieldops.com', name: 'Priya Sharma', role: 'Store Manager', password: 'password', orgId: 'org-001' },
  { email: 'leader@fieldops.com', name: 'Anand Mehta', role: 'Team Leader', password: 'password', orgId: 'org-001' },
  { email: 'eng01@fieldops.com', name: 'Rahul Singh', role: 'Engineer', password: 'password', orgId: 'org-001' },
  { email: 'eng02@fieldops.com', name: 'Deepa Nair', role: 'Engineer', password: 'password', orgId: 'org-001' },
  { email: 'eng03@fieldops.com', name: 'Suresh Reddy', role: 'Engineer', password: 'password', orgId: 'org-001' },
  { email: 'eng04@fieldops.com', name: 'Kavita Iyer', role: 'Engineer', password: 'password', orgId: 'org-001' },
  { email: 'eng05@fieldops.com', name: 'Arun Patel', role: 'Engineer', password: 'password', orgId: 'org-001' },
];

export const INITIAL_SKUS: SKU[] = [
  { id: 'SKU-001', name: 'AC Filter 1 Ton', lowStockAlert: 50 },
  { id: 'SKU-002', name: 'AC Filter 1.5 Ton', lowStockAlert: 40 },
  { id: 'SKU-003', name: 'Capacitor 25MFD', lowStockAlert: 60 },
  { id: 'SKU-004', name: 'Remote Control Universal', lowStockAlert: 30 },
  { id: 'SKU-005', name: 'Gas Refill Kit R32', lowStockAlert: 20 },
  { id: 'SKU-006', name: 'Copper Pipe 1/4"', lowStockAlert: 80 },
  { id: 'SKU-007', name: 'Drainage Pipe 10m', lowStockAlert: 50 },
  { id: 'SKU-008', name: 'Stabilizer 5kVA', lowStockAlert: 10 },
];

export const INITIAL_MAIN_INVENTORY: InventoryItem[] = [
  { skuId: 'SKU-001', qty: 240, unitPrice: 450 },
  { skuId: 'SKU-002', qty: 180, unitPrice: 550 },
  { skuId: 'SKU-003', qty: 320, unitPrice: 380 },
  { skuId: 'SKU-004', qty: 95, unitPrice: 650 },
  { skuId: 'SKU-005', qty: 60, unitPrice: 1200 },
  { skuId: 'SKU-006', qty: 400, unitPrice: 320 },
  { skuId: 'SKU-007', qty: 220, unitPrice: 280 },
  { skuId: 'SKU-008', qty: 28, unitPrice: 2800 },
];

export const INITIAL_ENGINEER_STOCK: EngineerStock = {
  'eng01@fieldops.com': [
    { skuId: 'SKU-001', qty: 12 },
    { skuId: 'SKU-002', qty: 8 },
    { skuId: 'SKU-003', qty: 15 },
    { skuId: 'SKU-004', qty: 5 },
    { skuId: 'SKU-005', qty: 3 },
  ],
  'eng02@fieldops.com': [
    { skuId: 'SKU-001', qty: 9 },
    { skuId: 'SKU-002', qty: 6 },
    { skuId: 'SKU-006', qty: 20 },
    { skuId: 'SKU-007', qty: 12 },
  ],
  'eng03@fieldops.com': [
    { skuId: 'SKU-003', qty: 18 },
    { skuId: 'SKU-004', qty: 7 },
    { skuId: 'SKU-005', qty: 2 },
    { skuId: 'SKU-008', qty: 1 },
  ],
  'eng04@fieldops.com': [
    { skuId: 'SKU-001', qty: 14 },
    { skuId: 'SKU-002', qty: 10 },
    { skuId: 'SKU-006', qty: 15 },
  ],
  'eng05@fieldops.com': [
    { skuId: 'SKU-003', qty: 20 },
    { skuId: 'SKU-004', qty: 8 },
    { skuId: 'SKU-005', qty: 4 },
  ],
};

export const INITIAL_PRODUCTIVITY_LOGS: ProductivityLog[] = [
  {
    id: 'PL-001',
    engEmail: 'eng01@fieldops.com',
    date: '2026-06-01',
    callsClosed: 5,
    accessories: [
      { skuId: 'SKU-001', qty: 2, saleValue: 900, adminIncentive: 60 },
      { skuId: 'SKU-003', qty: 1, saleValue: 380, adminIncentive: 25 },
    ],
    rcpCollected: 4500,
    status: 'Approved',
    tlNote: '',
    adminNote: '',
  },
  {
    id: 'PL-002',
    engEmail: 'eng01@fieldops.com',
    date: '2026-06-02',
    callsClosed: 4,
    accessories: [
      { skuId: 'SKU-004', qty: 1, saleValue: 650, adminIncentive: 50 },
    ],
    rcpCollected: 3100,
    status: 'Approved',
    tlNote: '',
    adminNote: '',
  },
  {
    id: 'PL-003',
    engEmail: 'eng02@fieldops.com',
    date: '2026-06-01',
    callsClosed: 6,
    accessories: [
      { skuId: 'SKU-001', qty: 1, saleValue: 450, adminIncentive: 30 },
    ],
    rcpCollected: 5200,
    status: 'Approved',
    tlNote: '',
    adminNote: '',
  },
  {
    id: 'PL-004',
    engEmail: 'eng01@fieldops.com',
    date: '2026-06-03',
    callsClosed: 3,
    accessories: [
      { skuId: 'SKU-005', qty: 1, saleValue: 1200 },
    ],
    rcpCollected: 2500,
    status: 'Validated by TL',
    tlNote: 'Good work',
    adminNote: '',
  },
  {
    id: 'PL-005',
    engEmail: 'eng02@fieldops.com',
    date: '2026-06-03',
    callsClosed: 7,
    accessories: [
      { skuId: 'SKU-002', qty: 2, saleValue: 1100 },
    ],
    rcpCollected: 6100,
    status: 'Pending',
    tlNote: '',
    adminNote: '',
  },
  {
    id: 'PL-006',
    engEmail: 'eng03@fieldops.com',
    date: '2026-06-02',
    callsClosed: 4,
    accessories: [],
    rcpCollected: 3500,
    status: 'Pending',
    tlNote: '',
    adminNote: '',
  },
  {
    id: 'PL-007',
    engEmail: 'eng04@fieldops.com',
    date: '2026-06-03',
    accessories: [
      { skuId: 'SKU-001', qty: 3, saleValue: 1350 },
    ],
    rcpCollected: 4000,
    callsClosed: 5,
    status: 'Pending',
    tlNote: '',
    adminNote: '',
  },
];

export const INITIAL_ATTENDANCE: AttendanceRecord = {
  'eng01@fieldops.com': {
    '2025-06-01': 'Present',
    '2025-06-02': 'Present',
  },
  'eng02@fieldops.com': {
    '2025-06-01': 'Present',
  },
};

export const INITIAL_STOCK_REQUESTS: StockRequest[] = [
  {
    id: 'SR-001',
    engEmail: 'eng01@fieldops.com',
    skuId: 'SKU-001',
    qty: 10,
    date: '2025-06-03',
    status: 'Approved',
  },
  {
    id: 'SR-002',
    engEmail: 'eng02@fieldops.com',
    skuId: 'SKU-005',
    qty: 5,
    date: '2025-06-03',
    status: 'Pending',
  },
  {
    id: 'SR-003',
    engEmail: 'eng03@fieldops.com',
    skuId: 'SKU-004',
    qty: 8,
    date: '2025-06-04',
    status: 'Pending',
  },
];

export const INITIAL_PURCHASE_INWARD: PurchaseInward[] = [
  {
    id: 'PI-001',
    skuId: 'SKU-001',
    qty: 100,
    unitPrice: 400,
    date: '2025-05-28',
    vendor: 'ABC Traders',
    invoiceNo: 'INV-4521',
    status: 'Approved',
  },
  {
    id: 'PI-002',
    skuId: 'SKU-005',
    qty: 20,
    unitPrice: 1100,
    date: '2025-06-01',
    vendor: 'Cool Gas Pvt Ltd',
    invoiceNo: 'INV-9874',
    status: 'Approved',
  },
];

export const INITIAL_REVOKE_REQUESTS: RevokeRequest[] = [];
