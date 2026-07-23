/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Super Admin' | 'Admin' | 'Store Manager' | 'Team Leader' | 'Engineer' | 'Backend Executive';

export interface Organisation {
  id: string; // e.g. ORG-001
  name: string;
  siteCode: string; // e.g. DEL-01
  createdAt?: string;
  status: 'active' | 'suspended' | 'expired';
  subscriptionPlan: 'free-trial' | 'basic' | 'professional' | 'enterprise';
  subscriptionPeriodEnd?: string; // ISO date string
  logoUrl?: string;
}

export interface User {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  orgId?: string; // organization ID
  invitationStatus?: 'invited' | 'active';
  isSuspended?: boolean;
  sessionVersion?: number;
}

export interface SKU {
  id: string; // e.g. SKU-001
  name: string;
  lowStockAlert: number;
  orgId?: string; // organization ID
}

export interface InventoryItem {
  skuId: string;
  qty: number;
  unitPrice: number;
  orgId?: string; // organization ID
}

export interface VanStockItem {
  skuId: string;
  qty: number;
}

export interface EngineerStock {
  [email: string]: VanStockItem[];
}

export interface AccessorySale {
  skuId: string;
  qty: number;
  saleValue: number;
  adminIncentive?: number; // assigned by Admin on approval
}

export type ProductivityLogStatus = 'Pending' | 'Validated by TL' | 'Validated by SM' | 'Approved' | 'Rejected';

export interface ProductivityLog {
  id: string; // e.g. PL-001
  engEmail: string;
  date: string; // YYYY-MM-DD
  callsClosed: number;
  accessories: AccessorySale[];
  rcpCollected?: number;
  rcpQty?: number;
  status: ProductivityLogStatus;
  tlNote?: string;
  adminNote?: string;
  orgId?: string; // organization ID
  attendanceStatus?: 'Present' | 'Leave';
  validatedBy?: string;
}

export interface AttendanceRecord {
  [email: string]: {
    [date: string]: 'Present' | 'Absent' | 'Leave';
  };
}

export type StockRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Revoke-Pending' | 'Revoked';

export interface StockRequest {
  id: string; // e.g. SR-001
  engEmail: string;
  skuId: string;
  qty: number;
  date: string; // YYYY-MM-DD
  status: StockRequestStatus;
  note?: string;
  orgId?: string; // organization ID
}

export type PurchaseInwardStatus = 'Pending' | 'Approved' | 'Rejected';

export interface PurchaseInward {
  id: string; // e.g. PI-001
  skuId: string;
  qty: number;
  unitPrice: number;
  date: string; // YYYY-MM-DD
  vendor: string;
  invoiceNo: string;
  status: PurchaseInwardStatus;
  orgId?: string; // organization ID
}

export interface RevokeRequest {
  id: string; // e.g. RV-001
  reqId: string; // references initial StockRequest ID
  engEmail: string;
  skuId: string;
  qty: number;
  date: string; // YYYY-MM-DD
  status: 'Revoke-Pending' | 'Revoked' | 'Rejected';
  reason?: string;
  orgId?: string; // organization ID
}

export interface ReturnRequest {
  id: string; // e.g. RR-001
  engEmail: string;
  skuId: string;
  qty: number;
  date: string; // YYYY-MM-DD
  status: 'Pending' | 'Approved' | 'Rejected';
  orgId?: string; // organization ID
}


export type LPRequestStatus = 'Pending' | 'Claim pending' | 'Claim submitted' | 'Claim forwarded' | 'Claim approved' | 'Rejected' | 'Revoke Pending' | 'Cancelled';

export interface LPRequest {
  id: string; // e.g. LP-001
  jobId: string; // Associated Job identifier
  spareCost: number; // Cost of spares
  serviceCost: number; // Cost of service
  tlEmail: string; // TL email who created/escalated the request
  date: string; // YYYY-MM-DD
  status: LPRequestStatus;
  orgId?: string; // organization ID
  description?: string;
  poNumber?: string; // Associated Purchase Order Number
  poReceivedValue?: number;
}

export type AttendanceApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface AttendanceRequest {
  id: string;
  engEmail: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Leave';
  submittedBy: string; // email of TL or SM who marked it
  submittedByRole: 'Team Leader' | 'Store Manager';
  approvedStatus: AttendanceApprovalStatus;
  remarks?: string;
  orgId?: string; // organization ID
}

export type POStatus = 'Dispatch Pending' | 'Dispatched' | 'Payment Received (Pending Approval)' | 'Payment Received';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  poDate: string; // YYYY-MM-DD
  netValue: number;
  gstAmount: number;
  totalValue: number;
  status: POStatus;
  orgId?: string; // organization ID
  registeredBy?: string; // store manager email
  docketNumber?: string; // tracking number assigned on dispatch
}

export interface SupplierDebit {
  id: string; // e.g. SD-001
  date: string; // YYYY-MM-DD
  supplier: string; // vendor name matching vendor from PurchaseInward
  description: string;
  amountPaid: number;
  orgId?: string; // organization ID
}

export interface Vendor {
  id: string; // e.g. VN-001
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  orgId?: string; // organization ID
}

export interface SaleRecord {
  id: string; // e.g. SL-001
  orgId: string;
  date: string; // YYYY-MM-DD
  vendorId: string; // registered vendor VN-ID
  skuId: string;
  qty: number;
  salePrice: number;
  refNumber: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedBy: string; // store manager email
  adminNote?: string;
}


