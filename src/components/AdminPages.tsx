/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, SKU, InventoryItem, ProductivityLog, AttendanceRecord, PurchaseInward, RevokeRequest, StockRequest, EngineerStock, LPRequest, AttendanceRequest } from '../types';
import { getSku, getInvItem, getUser, fmtDate, fmtCur, genId, getSkuPurchaseUnitPrice, calcAccessoryCost, getMonthRange } from '../utils';
import {
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Layers,
  TrendingDown,
  TrendingUp,
  LayoutDashboard,
  Search,
  Users,
  PhoneCall,
  Tag,
  BookOpen,
  Edit,
  Trash,
  Plus,
  Key,
  Download,
  AlertTriangle,
  RotateCcw,
  Truck,
  UserCheck,
  Award,
  DollarSign,
  Briefcase,
  Sliders,
  Clock,
  X
} from 'lucide-react';

interface AdminPagesProps {
  currentUser: User;
  users: User[];
  skus: SKU[];
  inventory: InventoryItem[];
  productivityLogs: ProductivityLog[];
  attendance: AttendanceRecord;
  attendanceRequests?: AttendanceRequest[];
  onUpdateAttendanceRequests?: (reqs: AttendanceRequest[]) => void;
  purchaseInward: PurchaseInward[];
  revokeRequests: RevokeRequest[];
  stockRequests: StockRequest[];
  engineerStock: EngineerStock;
  lpRequests: LPRequest[];
  activeTab: string;
  onUpdateUsers: (u: User[]) => void;
  onUpdateSkus: (s: SKU[]) => void;
  onUpdateInventory: (i: InventoryItem[]) => void;
  onUpdateLogs: (l: ProductivityLog[]) => void;
  onUpdateAttendance: (a: AttendanceRecord) => void;
  onUpdatePurchaseInward: (pi: PurchaseInward[]) => void;
  onUpdateRevokeRequests: (rv: RevokeRequest[]) => void;
  onUpdateStockRequests: (sr: StockRequest[]) => void;
  onUpdateEngineerStock: (es: EngineerStock) => void;
  onUpdateLpRequests: (lp: LPRequest[]) => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
}

interface AdminPagesInnerProps extends AdminPagesProps {
  triggerModal: (title: string, body: React.ReactNode) => void;
  closeModal: () => void;
}

function AdminPagesInner({
  currentUser,
  users,
  skus,
  inventory,
  productivityLogs,
  attendance,
  purchaseInward,
  revokeRequests,
  stockRequests,
  engineerStock,
  lpRequests,
  activeTab,
  onUpdateUsers,
  onUpdateSkus,
  onUpdateInventory,
  onUpdateLogs,
  onUpdateAttendance,
  attendanceRequests = [],
  onUpdateAttendanceRequests,
  onUpdatePurchaseInward,
  onUpdateRevokeRequests,
  onUpdateStockRequests,
  onUpdateEngineerStock,
  onUpdateLpRequests,
  onAddToast,
  triggerModal,
  closeModal,
}: AdminPagesInnerProps) {

  // --- 1. PRODUCTIVITY QUEUE STATE & LOGIC ---
  const [adApproveTab, setAdApproveTab] = useState<'pending' | 'processed'>('pending');

  const [vanStockSortKey, setVanStockSortKey] = useState<'profile' | 'sku' | 'description' | 'qty'>('profile');
  const [vanStockSortAsc, setVanStockSortAsc] = useState<boolean>(true);

  const toggleVanStockSort = (key: 'profile' | 'sku' | 'description' | 'qty') => {
    if (vanStockSortKey === key) {
      setVanStockSortAsc(!vanStockSortAsc);
    } else {
      setVanStockSortKey(key);
      setVanStockSortAsc(true);
    }
  };

  // Warehouse stocks sorting
  const [whStockSortKey, setWhStockSortKey] = useState<'sku' | 'name' | 'qty' | 'price' | 'value'>('sku');
  const [whStockSortAsc, setWhStockSortAsc] = useState<boolean>(true);

  const toggleWhStockSort = (key: 'sku' | 'name' | 'qty' | 'price' | 'value') => {
    if (whStockSortKey === key) {
      setWhStockSortAsc(!whStockSortAsc);
    } else {
      setWhStockSortKey(key);
      setWhStockSortAsc(true);
    }
  };

  // Purchase shipments sorting
  const [shipmentSortKey, setShipmentSortKey] = useState<'id' | 'sku' | 'name' | 'qty' | 'vendor' | 'value' | 'status'>('id');
  const [shipmentSortAsc, setShipmentSortAsc] = useState<boolean>(true);

  const toggleShipmentSort = (key: 'id' | 'sku' | 'name' | 'qty' | 'vendor' | 'value' | 'status') => {
    if (shipmentSortKey === key) {
      setShipmentSortAsc(!shipmentSortAsc);
    } else {
      setShipmentSortKey(key);
      setShipmentSortAsc(true);
    }
  };

  // Engineer Performance Roster sorting
  const [perfRosterSortKey, setPerfRosterSortKey] = useState<'name' | 'present' | 'calls' | 'revenue' | 'rcpVal' | 'rcpQty' | 'perCall'>('name');
  const [perfRosterSortAsc, setPerfRosterSortAsc] = useState<boolean>(true);

  const togglePerfRosterSort = (key: 'name' | 'present' | 'calls' | 'revenue' | 'rcpVal' | 'rcpQty' | 'perCall') => {
    if (perfRosterSortKey === key) {
      setPerfRosterSortAsc(!perfRosterSortAsc);
    } else {
      setPerfRosterSortKey(key);
      setPerfRosterSortAsc(true);
    }
  };

  // Processed Records Ledger in LP Approvals sorting
  const [ledgerSortKey, setLedgerSortKey] = useState<'id' | 'job' | 'supervisor' | 'date' | 'spares' | 'services' | 'total' | 'status'>('id');
  const [ledgerSortAsc, setLedgerSortAsc] = useState<boolean>(true);

  const toggleLedgerSort = (key: 'id' | 'job' | 'supervisor' | 'date' | 'spares' | 'services' | 'total' | 'status') => {
    if (ledgerSortKey === key) {
      setLedgerSortAsc(!ledgerSortAsc);
    } else {
      setLedgerSortKey(key);
      setLedgerSortAsc(true);
    }
  };

  // Audit log cargo tracking sorting
  const [cargoSortKey, setCargoSortKey] = useState<'id' | 'item' | 'vendor' | 'date' | 'qty' | 'price' | 'value' | 'status'>('id');
  const [cargoSortAsc, setCargoSortAsc] = useState<boolean>(true);

  const toggleCargoSort = (key: 'id' | 'item' | 'vendor' | 'date' | 'qty' | 'price' | 'value' | 'status') => {
    if (cargoSortKey === key) {
      setCargoSortAsc(!cargoSortAsc);
    } else {
      setCargoSortKey(key);
      setCargoSortAsc(true);
    }
  };

  // Payroll Processed Queue sorting
  const [payrollSortKey, setPayrollSortKey] = useState<'id' | 'name' | 'date' | 'calls' | 'gross' | 'rcpVal' | 'rcpQty' | 'payout' | 'status'>('id');
  const [payrollSortAsc, setPayrollSortAsc] = useState<boolean>(true);

  const togglePayrollSort = (key: 'id' | 'name' | 'date' | 'calls' | 'gross' | 'rcpVal' | 'rcpQty' | 'payout' | 'status') => {
    if (payrollSortKey === key) {
      setPayrollSortAsc(!payrollSortAsc);
    } else {
      setPayrollSortKey(key);
      setPayrollSortAsc(true);
    }
  };

  const renderSortIndicator = (currentKey: string, activeKey: string, ascending: boolean) => {
    if (activeKey === currentKey) {
      return ascending ? ' ▲' : ' ▼';
    }
    return '';
  };

  const handleApproveAttendanceRequest = (reqId: string, approve: boolean) => {
    if (!onUpdateAttendanceRequests) return;
    const targetReq = attendanceRequests.find(r => r.id === reqId);
    if (!targetReq) return;

    const updatedRequests = attendanceRequests.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          approvedStatus: approve ? 'Approved' : 'Rejected' as any
        };
      }
      return r;
    });

    onUpdateAttendanceRequests(updatedRequests);

    if (approve) {
      const dateKey = targetReq.date;
      const engEmail = targetReq.engEmail;
      const nextAttendance: AttendanceRecord = {
        ...attendance,
        [engEmail]: {
          ...(attendance[engEmail] || {}),
          [dateKey]: (targetReq.status === 'Present' ? 'Present' : 'Absent') as 'Present' | 'Absent'
        }
      };
      onUpdateAttendance(nextAttendance);
      onAddToast(`Attendance request ${reqId} approved and recorded to grid ledger!`, 'success');
    } else {
      onAddToast(`Attendance request ${reqId} has been rejected.`, 'success');
    }
  };
  // Local object stores for inputs: { "logId-accessoryIndex": numericIncentiveVal }
  const [localIncentives, setLocalIncentives] = useState<Record<string, string>>({});
  const [adminRejectNotes, setAdminRejectNotes] = useState<Record<string, string>>({});
  // Filter states
  const [processedLogEngFilter, setProcessedLogEngFilter] = useState('');
  const [processedLogStatusFilter, setProcessedLogStatusFilter] = useState('');
  const [selectedDashboardMonth, setSelectedDashboardMonth] = useState(getMonthRange().prefix);
  const [engineerSearchQuery, setEngineerSearchQuery] = useState('');

  // Additional filters for Requests and Reports in AdminPages
  const [pendingLogEngFilter, setPendingLogEngFilter] = useState('');
  const [pendingLogSearch, setPendingLogSearch] = useState('');
  const [pendingLogDateFilter, setPendingLogDateFilter] = useState('');
  const [processedLogSearch, setProcessedLogSearch] = useState('');
  const [processedLogDateFilter, setProcessedLogDateFilter] = useState('');

  // Purchase Inward states for checking
  const [pendingPiSkuFilter, setPendingPiSkuFilter] = useState('');
  const [pendingPiVendorFilter, setPendingPiVendorFilter] = useState('');
  const [pendingPiDateFilter, setPendingPiDateFilter] = useState('');
  const [processedPiSkuFilter, setProcessedPiSkuFilter] = useState('');
  const [processedPiVendorFilter, setProcessedPiVendorFilter] = useState('');
  const [processedPiDateFilter, setProcessedPiDateFilter] = useState('');

  // Revoke Approvals states for checking
  const [pendingRvEngFilter, setPendingRvEngFilter] = useState('');
  const [pendingRvSkuFilter, setPendingRvSkuFilter] = useState('');
  const [pendingRvDateFilter, setPendingRvDateFilter] = useState('');
  const [processedRvEngFilter, setProcessedRvEngFilter] = useState('');
  const [processedRvSkuFilter, setProcessedRvSkuFilter] = useState('');
  const [processedRvDateFilter, setProcessedRvDateFilter] = useState('');

  // Consolidated inventory approvals and stock search states
  const [invApproveSubTab, setInvApproveSubTab] = useState<'purchases' | 'revokes'>('purchases');
  const [processingPurchaseIds, setProcessingPurchaseIds] = useState<string[]>([]);
  const [processingRevokeIds, setProcessingRevokeIds] = useState<string[]>([]);
  const [invSearchQuery, setInvSearchQuery] = useState('');

  // Attendance filter states
  const [pendingAttRoleFilter, setPendingAttRoleFilter] = useState('');
  const [pendingAttEngFilter, setPendingAttEngFilter] = useState('');
  const [pendingAttDateFilter, setPendingAttDateFilter] = useState('');
  const [attBoardRoleFilter, setAttBoardRoleFilter] = useState('');
  const [attBoardSearch, setAttBoardSearch] = useState('');

  const validatedLogs = productivityLogs.filter((l) => l.status === 'Validated by SM').sort((a, b) => a.date.localeCompare(b.date));
  const processedLogs = productivityLogs.filter((l) => l.status === 'Approved' || l.status === 'Rejected').sort((a, b) => b.date.localeCompare(a.date));

  const filteredValidatedLogs = validatedLogs.filter((l) => {
    const matchEng = !pendingLogEngFilter || l.engEmail === pendingLogEngFilter;
    const matchSearch = !pendingLogSearch || l.id.toLowerCase().includes(pendingLogSearch.toLowerCase());
    const matchDate = !pendingLogDateFilter || l.date.includes(pendingLogDateFilter);
    return matchEng && matchSearch && matchDate;
  });

  const unsortedProcessedLogs = processedLogs.filter((l) => {
    const matchEng = !processedLogEngFilter || l.engEmail === processedLogEngFilter;
    const matchStatus = !processedLogStatusFilter || l.status === processedLogStatusFilter;
    const matchSearch = !processedLogSearch || l.id.toLowerCase().includes(processedLogSearch.toLowerCase());
    const matchDate = !processedLogDateFilter || l.date.includes(processedLogDateFilter);
    return matchEng && matchStatus && matchSearch && matchDate;
  });

  const filteredProcessedLogs = [...unsortedProcessedLogs].sort((a, b) => {
    let comparison = 0;
    const engA = getUser(users, a.engEmail);
    const engB = getUser(users, b.engEmail);
    const revA = a.accessories.reduce((s, acc) => s + acc.saleValue, 0);
    const revB = b.accessories.reduce((s, acc) => s + acc.saleValue, 0);
    const incA = a.accessories.reduce((s, acc) => s + (acc.adminIncentive || 0), 0);
    const incB = b.accessories.reduce((s, acc) => s + (acc.adminIncentive || 0), 0);

    if (payrollSortKey === 'id') {
      comparison = a.id.localeCompare(b.id);
    } else if (payrollSortKey === 'name') {
      comparison = engA.name.localeCompare(engB.name);
    } else if (payrollSortKey === 'date') {
      comparison = a.date.localeCompare(b.date);
    } else if (payrollSortKey === 'calls') {
      comparison = a.callsClosed - b.callsClosed;
    } else if (payrollSortKey === 'gross') {
      comparison = revA - revB;
    } else if (payrollSortKey === 'rcpVal') {
      comparison = (a.rcpCollected || 0) - (b.rcpCollected || 0);
    } else if (payrollSortKey === 'rcpQty') {
      comparison = (a.rcpQty || 0) - (b.rcpQty || 0);
    } else if (payrollSortKey === 'payout') {
      comparison = incA - incB;
    } else if (payrollSortKey === 'status') {
      comparison = a.status.localeCompare(b.status);
    }

    return payrollSortAsc ? comparison : -comparison;
  });

  const handleIncentiveChange = (logId: string, accIdx: number, val: string) => {
    setLocalIncentives({
      ...localIncentives,
      [`${logId}-${accIdx}`]: val,
    });
  };

  const getLogWeightedIncentiveTotal = (log: ProductivityLog) => {
    return log.accessories.reduce((sum, item, idx) => {
      const liveInput = localIncentives[`${log.id}-${idx}`];
      if (liveInput !== undefined) {
        return sum + (parseFloat(liveInput) || 0);
      }
      return sum + (item.adminIncentive || 0);
    }, 0);
  };

  const handleAdminApproveLog = (logId: string) => {
    const log = productivityLogs.find((l) => l.id === logId);
    if (!log) return;

    // Deduct stock levels from engineer van & record final incentive values
    const updatedLogs = productivityLogs.map((l) => {
      if (l.id === logId) {
        return {
          ...l,
          status: 'Approved' as const,
          accessories: l.accessories.map((a, idx) => {
            const finalInc = parseFloat(localIncentives[`${logId}-${idx}`]) || 0;
            return { ...a, adminIncentive: finalInc };
          }),
        };
      }
      return l;
    });

    // Mark attendance Present
    const updatedAttendance: AttendanceRecord = {
      ...attendance,
      [log.engEmail]: {
        ...(attendance[log.engEmail] || {}),
        [log.date]: 'Present'
      }
    };

    // Deduct from engineer's van stock
    const updatedEngStock = { ...engineerStock };
    const currentVanStocks = updatedEngStock[log.engEmail] || [];
    const modifiedVanStocks = currentVanStocks.map((item) => {
      const soldItem = log.accessories.find((a) => a.skuId === item.skuId);
      if (soldItem) {
        return { ...item, qty: Math.max(0, item.qty - soldItem.qty) };
      }
      return item;
    });
    updatedEngStock[log.engEmail] = modifiedVanStocks;

    onUpdateLogs(updatedLogs);
    onUpdateAttendance(updatedAttendance);
    onUpdateEngineerStock(updatedEngStock);
    onAddToast(`Productivity approved! Marked Present for ${getUser(users, log.engEmail).name} on job date ${fmtDate(log.date)}.`);
  };

  const handleAdminRejectLog = (logId: string) => {
    const note = adminRejectNotes[logId] || '';
    if (!note) {
      onAddToast('Please fill review note before rejecting', 'error');
      return;
    }
    const updatedLogs = productivityLogs.map((l) => {
      if (l.id === logId) {
        return { ...l, status: 'Rejected' as const, adminNote: note };
      }
      return l;
    });
    onUpdateLogs(updatedLogs);
    onAddToast('Daily log sheet rejected successfully.', 'success');
  };



  const downloadProcessedLogsCSV = () => {
    const header = ['Log ID', 'Engineer Name', 'Email Address', 'Date Created', 'Calls Closed', 'Accessories Revenue Generated Value', 'RCP Collected', 'RCP Qty', 'Incentives Dispatched', 'Status'];
    const rows = filteredProcessedLogs.map((l) => {
      const u = getUser(users, l.engEmail);
      const rev = l.accessories.reduce((s, a) => s + a.saleValue, 0);
      const inc = l.status === 'Approved' ? l.accessories.reduce((s, a) => s + (a.adminIncentive || 0), 0) : 0;
      return [l.id, u.name, l.engEmail, l.date, l.callsClosed, rev, l.rcpCollected || 0, l.rcpQty || 0, inc, l.status];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `productivity_audit_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Productivity Audit report spreadsheet downloaded!');
  };


  // --- 2. PURCHASE APPROVALS STATE & LOGIC ---
  const [piActiveTab, setPiActiveTab] = useState<'pending' | 'processed'>('pending');

  const pendingPurchases = purchaseInward.filter((p) => p.status === 'Pending').sort((a, b) => a.date.localeCompare(b.date));
  const processedPurchases = purchaseInward.filter((p) => p.status !== 'Pending').sort((a, b) => b.date.localeCompare(a.date));

  const handleApprovePurchase = (piId: string) => {
    const pi = purchaseInward.find((p) => p.id === piId);
    if (!pi) return;
    if (processingPurchaseIds.includes(piId)) return;
    setProcessingPurchaseIds((prev) => [...prev, piId]);

    setTimeout(() => {
      // Approve purchase status
      const updatedPurchases = purchaseInward.map((p) => {
        if (p.id === piId) return { ...p, status: 'Approved' as const };
        return p;
      });

      // Credit key main stock levels
      const updatedInventory = inventory.map((i) => {
        if (i.skuId === pi.skuId) {
          return {
            ...i,
            qty: i.qty + pi.qty,
            unitPrice: pi.unitPrice > 0 ? pi.unitPrice : i.unitPrice
          };
        }
        return i;
      });
      if (!inventory.some((i) => i.skuId === pi.skuId)) {
        updatedInventory.push({ skuId: pi.skuId, qty: pi.qty, unitPrice: pi.unitPrice });
      }

      onUpdatePurchaseInward(updatedPurchases);
      onUpdateInventory(updatedInventory);
      onAddToast(`Purchase approved! Stock credited: +${pi.qty} of ${getSku(skus, pi.skuId).name} added onto warehouse shelves.`);
      setProcessingPurchaseIds((prev) => prev.filter((id) => id !== piId));
    }, 1000);
  };

  const handleRejectPurchase = (piId: string) => {
    if (processingPurchaseIds.includes(piId)) return;
    setProcessingPurchaseIds((prev) => [...prev, piId]);

    setTimeout(() => {
      const updatedPurchases = purchaseInward.map((p) => {
        if (p.id === piId) return { ...p, status: 'Rejected' as const };
        return p;
      });
      onUpdatePurchaseInward(updatedPurchases);
      onAddToast('Purchase entry rejected successfully.', 'success');
      setProcessingPurchaseIds((prev) => prev.filter((id) => id !== piId));
    }, 1000);
  };


  // --- 3. REVOKE APPROVALS STATE & LOGIC ---
  const [rvActiveTab, setRvActiveTab] = useState<'pending' | 'processed'>('pending');

  const pendingRevokes = revokeRequests.filter((r) => r.status === 'Revoke-Pending').sort((a, b) => a.date.localeCompare(b.date));
  const processedRevokes = revokeRequests.filter((r) => r.status !== 'Revoke-Pending').sort((a, b) => b.date.localeCompare(a.date));

  const handleApproveRevoke = (rvId: string) => {
    const rv = revokeRequests.find((r) => r.id === rvId);
    if (!rv) return;
    if (processingRevokeIds.includes(rvId)) return;
    setProcessingRevokeIds((prev) => [...prev, rvId]);

    setTimeout(() => {
      // Approve request
      const updatedRevRequests = revokeRequests.map((r) => {
        if (r.id === rvId) return { ...r, status: 'Revoked' as const };
        return r;
      });

      // Deduct logs allocations state
      const updatedStockRequests = stockRequests.map((s) => {
        if (s.id === rv.reqId) return { ...s, status: 'Revoked' as const };
        return s;
      });

      // Deduct allocations from Engineer Van
      const updatedEngStock = { ...engineerStock };
      const list = updatedEngStock[rv.engEmail] || [];
      updatedEngStock[rv.engEmail] = list.map((item) => {
        if (item.skuId === rv.skuId) {
          return { ...item, qty: Math.max(0, item.qty - rv.qty) };
        }
        return item;
      });

      // Return to main warehouse inventory
      const updatedInventory = inventory.map((i) => {
        if (i.skuId === rv.skuId) {
          return { ...i, qty: i.qty + rv.qty };
        }
        return i;
      });
      if (!inventory.some((i) => i.skuId === rv.skuId)) {
        updatedInventory.push({ skuId: rv.skuId, qty: rv.qty, unitPrice: 0 });
      }

      onUpdateRevokeRequests(updatedRevRequests);
      onUpdateStockRequests(updatedStockRequests);
      onUpdateEngineerStock(updatedEngStock);
      onUpdateInventory(updatedInventory);
      onAddToast(`Revoke Approved! Recalled ${rv.qty} units of ${getSku(skus, rv.skuId).name} from ${getUser(users, rv.engEmail).name}'s van back onto warehouse shelves.`);
      setProcessingRevokeIds((prev) => prev.filter((id) => id !== rvId));
    }, 1000);
  };

  const handleRejectRevoke = (rvId: string) => {
    const rv = revokeRequests.find((r) => r.id === rvId);
    if (!rv) return;
    if (processingRevokeIds.includes(rvId)) return;
    setProcessingRevokeIds((prev) => [...prev, rvId]);

    setTimeout(() => {
      const updatedRevRequests = revokeRequests.map((r) => {
        if (r.id === rvId) return { ...r, status: 'Rejected' as const };
        return r;
      });

      // Restore the source request status back to Approved
      const updatedStockRequests = stockRequests.map((s) => {
        if (s.id === rv.reqId) return { ...s, status: 'Approved' as const };
        return s;
      });

      onUpdateRevokeRequests(updatedRevRequests);
      onUpdateStockRequests(updatedStockRequests);
      onAddToast('Revoke proposal rejected. Allocations remain inside engineer van.', 'success');
      setProcessingRevokeIds((prev) => prev.filter((id) => id !== rvId));
    }, 1000);
  };


  // --- 4. ATTENDANCE REGISTER STATS & GAGE ---
  const matrixEngineers = users.filter((u) => u.role === 'Engineer');
  const attendanceUsers = users.filter((u) => u.orgId === currentUser.orgId && (u.role === 'Engineer' || u.role === 'Team Leader' || u.role === 'Store Manager'));

  // Collect list of available months in productivity history to seed select
  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const attendanceMonths = Object.values(attendance || {}).flatMap(userDates => Object.keys(userDates || {}).map(d => d.substring(0, 7)));
  const reqMonths = (attendanceRequests || []).map(r => r.date.substring(0, 7));
  const uniqueLogMonths = [...new Set([
    currentMonthPrefix,
    ...productivityLogs.map((l) => l.date.substring(0, 7)),
    ...attendanceMonths,
    ...reqMonths
  ])].filter(Boolean).sort();

  if (uniqueLogMonths.length === 0) {
    uniqueLogMonths.push('2025-06');
  }
  const latestLogMonth = uniqueLogMonths[uniqueLogMonths.length - 1] || '2025-06';

  const [currentSelectedMonth, setCurrentSelectedMonth] = useState(latestLogMonth);
  const [plMonthSelector, setPlMonthSelector] = useState(latestLogMonth);

  // Ref to keep track of latest month and automatically switch when a new, later month log gets added/approved
  const prevLatestMonthRef = useRef(latestLogMonth);
  useEffect(() => {
    if (latestLogMonth !== prevLatestMonthRef.current) {
      setCurrentSelectedMonth(latestLogMonth);
      setPlMonthSelector(latestLogMonth);
      prevLatestMonthRef.current = latestLogMonth;
    }
  }, [latestLogMonth]);

  const daysInAttendanceMonth = new Date(
    parseInt(currentSelectedMonth.split('-')[0]),
    parseInt(currentSelectedMonth.split('-')[1]),
    0
  ).getDate();

  const attendanceDays = Array.from({ length: daysInAttendanceMonth }, (_, i) => {
    return `${currentSelectedMonth}-${String(i + 1).padStart(2, '0')}`;
  });

  const getLogHistoryForMonth = (email: string, mPrefix: string) => {
    return productivityLogs.filter((l) => l.engEmail === email && l.date.substring(0, 7) === mPrefix);
  };

  const getPresentDaysPercentage = (email: string, mPrefix: string) => {
    const engAtt = attendance[email] || {};
    const presentCount = Object.entries(engAtt).filter(([d, val]) => d.substring(0, 7) === mPrefix && val === 'Present').length;
    return presentCount;
  };

  const downloadAttendanceReportCSV = () => {
    const header = ['Staff Name', 'Email Address', 'Days Present MTD', 'Calls Worked', 'Gross Revenue Released', 'Incentives Paid'];
    const rows = attendanceUsers.map((eng) => {
      const monthLogs = getLogHistoryForMonth(eng.email, currentSelectedMonth);
      const present = getPresentDaysPercentage(eng.email, currentSelectedMonth);
      const callsValue = monthLogs.filter(l => l.status === 'Approved').reduce((s, l) => s + l.callsClosed, 0);
      const revValue = monthLogs.filter(l => l.status === 'Approved').reduce((s, l) => s + l.accessories.reduce((sum, item) => sum + item.saleValue, 0), 0);
      const incValue = monthLogs.filter(l => l.status === 'Approved').reduce((s, l) => s + l.accessories.reduce((sum, item) => sum + (item.adminIncentive || 0), 0), 0);
      return [eng.name, eng.email, present, callsValue, revValue, incValue];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `consolidated_attendance_register_${currentSelectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Consolidated Attendance report downloaded!');
  };

  const downloadRegistryGridCSV = () => {
    const header = [
      'Staff Member',
      'Email',
      'Role',
      ...attendanceDays.map(d => d.split('-')[2])
    ];

    const rows = attendanceUsers.map((eng) => {
      const engAtt = attendance[eng.email] || {};
      const dayMarks = attendanceDays.map((d) => {
        const cellVal = engAtt[d];
        const dateObj = new Date(d);
        const isPast = dateObj <= new Date();

        if (cellVal === 'Present') {
          return 'Present';
        } else if (dateObj.getDay() === 0) {
          return 'Sunday';
        } else if (isPast) {
          return 'Absent';
        } else {
          return '';
        }
      });

      return [eng.name, eng.email, eng.role, ...dayMarks];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `corporate_attendance_registry_${currentSelectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Corporate Attendance Registry Grid downloaded!');
  };


  // --- 5. MAIN WAREHOUSE INVENTORY SUBPLOTS ---
  const [invVendorSelector, setInvVendorSelector] = useState('');
  const [invStatusSelector, setInvStatusSelector] = useState('');
  const [invEngStockSelector, setInvEngStockSelector] = useState('');
  const [activeInventoryTab, setActiveInventoryTab] = useState<'warehouse' | 'shipments' | 'engineer'>('warehouse');



  const inventoryValueSum = inventory.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const getFilteredWarehouseInwards = () => {
    const filtered = purchaseInward.filter((p) => {
      const matchV = !invVendorSelector || p.vendor === invVendorSelector;
      const matchS = !invStatusSelector || p.status === invStatusSelector;
      return matchV && matchS;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      const skA = getSku(skus, a.skuId);
      const skB = getSku(skus, b.skuId);

      if (shipmentSortKey === 'id') {
        comparison = a.id.localeCompare(b.id);
      } else if (shipmentSortKey === 'sku') {
        comparison = a.skuId.localeCompare(b.skuId);
      } else if (shipmentSortKey === 'name') {
        comparison = skA.name.localeCompare(skB.name);
      } else if (shipmentSortKey === 'qty') {
        comparison = a.qty - b.qty;
      } else if (shipmentSortKey === 'vendor') {
        comparison = (a.vendor || '').localeCompare(b.vendor || '');
      } else if (shipmentSortKey === 'value') {
        comparison = (a.qty * a.unitPrice) - (b.qty * b.unitPrice);
      } else if (shipmentSortKey === 'status') {
        comparison = a.status.localeCompare(b.status);
      }

      return shipmentSortAsc ? comparison : -comparison;
    });
  };

  const filteredWarehouseInwards = getFilteredWarehouseInwards();
  const matchedInwardQty = filteredWarehouseInwards.reduce((s, p) => s + p.qty, 0);
  const matchedInwardVal = filteredWarehouseInwards.reduce((s, p) => s + p.qty * p.unitPrice, 0);

  const downloadWarehouseInwardsFilteredCSV = () => {
    const header = ['Entry ID', 'Receipt Date', 'SKU', 'Item Name', 'Quantity Inward', 'Price Point', 'Valuation Value', 'Supplier', 'Invoice No', 'Status'];
    const rows = filteredWarehouseInwards.map((p) => {
      const sk = getSku(skus, p.skuId);
      return [p.id, p.date, p.skuId, sk.name, p.qty, p.unitPrice, p.qty * p.unitPrice, p.vendor, p.invoiceNo, p.status];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `warehouse_shipments_reconcile_${invVendorSelector || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Inwards reconciliation spreadsheet saved successfully!');
  };

  const downloadVanStockDetailedCSV = () => {
    const header = ['Engineer Name', 'Email Address', 'SKU Code ID', 'Item Name', 'Car Trunk holding Qty'];
    const rows: string[][] = [];

    Object.entries(engineerStock).forEach(([email, items]) => {
      if (invEngStockSelector && email !== invEngStockSelector) return;
      const eng = getUser(users, email);
      items.forEach((item) => {
        const sk = getSku(skus, item.skuId);
        rows.push([eng.name, email, item.skuId, sk.name, String(item.qty)]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const label = invEngStockSelector ? getUser(users, invEngStockSelector).name.replace(/\s+/g, '_') : 'all_engineers';
    link.setAttribute('download', `engineer_van_holding_${label}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Active engineer van holdings spreadsheet downloaded!');
  };

  const downloadAvailableStockCSV = () => {
    const header = ['SKU ID', 'Item Description', 'Available Qty', 'Unit Price', 'Total Value'];
    const rows = inventory.map((item) => {
      const sk = getSku(skus, item.skuId);
      return [item.skuId, sk.name, item.qty, item.unitPrice, item.qty * item.unitPrice];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `current_stock_available_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Current stock available report CSV downloaded!');
  };


  // --- 6. P&L REPORT STATE & FILTERING ---
  const [plEngFilter, setPlEngFilter] = useState('');
  const [plSkuFilter, setPlSkuFilter] = useState('');

  const plApprovedLogs = productivityLogs.filter((l) => l.status === 'Approved' && l.date.substring(0, 7) === plMonthSelector);

  const getPlGrossRevenueTotal = () => {
    let rev = 0;
    plApprovedLogs.forEach((l) => {
      l.accessories.forEach((a) => { rev += a.saleValue; });
    });
    return rev;
  };

  const getPlIncentivesPaidTotal = () => {
    let inc = 0;
    plApprovedLogs.forEach((l) => {
      l.accessories.forEach((a) => { inc += a.adminIncentive || 0; });
    });
    return inc;
  };

  const getPlCOGSProductCostTotal = () => {
    let cost = 0;
    plApprovedLogs.forEach((l) => {
      l.accessories.forEach((a) => {
        cost += getSkuPurchaseUnitPrice(purchaseInward, inventory, a.skuId) * a.qty;
      });
    });
    return cost;
  };

  const plRevenue = getPlGrossRevenueTotal();
  const plIncentives = getPlIncentivesPaidTotal();
  const plCOGS = getPlCOGSProductCostTotal();
  const plNetProfits = plRevenue - plIncentives - plCOGS;

  interface AccessorySaleDetail {
    date: string;
    engineer: string;
    skuId: string;
    skuName: string;
    qty: number;
    saleValue: number;
  }

  // Aggregate detailed accessory sales rows
  const getPLAccessoriesReportRows = (): AccessorySaleDetail[] => {
    const list: AccessorySaleDetail[] = [];
    plApprovedLogs.forEach((l) => {
      const eng = getUser(users, l.engEmail);
      l.accessories.forEach((a) => {
        list.push({
          date: l.date,
          engineer: eng.name,
          skuId: a.skuId,
          skuName: getSku(skus, a.skuId).name,
          qty: a.qty,
          saleValue: a.saleValue,
        });
      });
    });
    return list.sort((a, b) => a.date.localeCompare(b.date));
  };

  const allAccDetails = getPLAccessoriesReportRows();
  const filteredAccDetails = allAccDetails.filter((item) => {
    const matchEng = !plEngFilter || item.engineer === plEngFilter;
    const matchSku = !plSkuFilter || item.skuId === plSkuFilter;
    return matchEng && matchSku;
  });

  const downloadPLSummaryCSV = () => {
    const header = ['Engineer Name', 'Email Address', 'Total Gross Revenue (₹)', 'Total Incentives Paid (₹)', 'Weighted Materials Cost (COGS) (₹)', 'Overall Net Profits Contribution (₹)'];
    const rows = matrixEngineers.map((eng) => {
      const engLogs = getLogHistoryForMonth(eng.email, plMonthSelector).filter(l => l.status === 'Approved');
      const rev = engLogs.reduce((s, l) => s + l.accessories.reduce((sum, a) => sum + a.saleValue, 0), 0);
      const inc = engLogs.reduce((s, l) => s + l.accessories.reduce((sum, a) => sum + (a.adminIncentive || 0), 0), 0);
      const cogs = engLogs.reduce((s, l) => s + l.accessories.reduce((sum, a) => sum + (getSkuPurchaseUnitPrice(purchaseInward, inventory, a.skuId) * a.qty), 0), 0);
      return [eng.name, eng.email, rev, inc, cogs, rev - inc - cogs];
    });

    rows.push(['TOTAL CUMULATIVE BOARD', '', String(plRevenue), String(plIncentives), String(plCOGS), String(plNetProfits)]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `monthly_profit_loss_contributions_${plMonthSelector}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Monthly P&L report spreadsheet downloaded!');
  };

  const downloadDetailedAccSalesCSV = () => {
    const header = ['Activity Date', 'Engineer Name', 'SKU Code', 'Item Description', 'Quantity Sold', 'Sale Revenue (₹)', 'Cost per Item unit (₹)'];
    const rows = filteredAccDetails.map((item) => {
      const unitValue = item.qty > 0 ? Math.round(item.saleValue / item.qty) : 0;
      return [item.date, item.engineer, item.skuId, item.skuName, item.qty, item.saleValue, unitValue];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `accessory_sales_audit_${plMonthSelector}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Detailed accessories list downloaded!');
  };


  // --- 7. SKU REGISTRY STATE & LOGIC ---
  const [skuIdInput, setSkuIdInput] = useState('');
  const [skuNameInput, setSkuNameInput] = useState('');
  const [skuAlertInput, setSkuAlertInput] = useState('');

  const handleRegisterNewSku = (e: React.FormEvent) => {
    e.preventDefault();
    const id = skuIdInput.trim().toUpperCase();
    const name = skuNameInput.trim();
    const alertQty = parseInt(skuAlertInput, 10);

    if (!id || !name || isNaN(alertQty) || alertQty < 0) {
      onAddToast('Please complete all SKU fields carefully', 'error');
      return;
    }

    if (skus.find((s) => s.id === id)) {
      onAddToast('SKU ID already exists in registry list!', 'error');
      return;
    }

    const newSku: SKU = { id, name, lowStockAlert: alertQty };
    const updatedSkus = [...skus, newSku];

    // Seed inside key inventories
    const updatedInventory = [...inventory, { skuId: id, qty: 0, unitPrice: 0 }];

    onUpdateSkus(updatedSkus);
    onUpdateInventory(updatedInventory);

    setSkuIdInput('');
    setSkuNameInput('');
    setSkuAlertInput('');
    onAddToast(`SKU ${id} registered into warehouse inventory!`, 'success');
  };

  // Modern modal editing flows for Sku Registry
  const [editSkuName, setEditSkuName] = useState('');
  const [editSkuAlert, setEditSkuAlert] = useState('');

  const submitSkuModalSave = (id: string, name: string, alertVal: string) => {
    const alertQty = parseInt(alertVal, 10);
    if (!name || isNaN(alertQty)) {
      onAddToast('Name or alert counts are invalids', 'error');
      return;
    }
    const updated = skus.map((s) => {
      if (s.id === id) return { ...s, name: name.trim(), lowStockAlert: alertQty };
      return s;
    });
    onUpdateSkus(updated);
    closeModal();
    onAddToast(`SKU details successfully updated for ${id}.`);
  };

  const openSkuEditModal = (sku: SKU) => {
    triggerModal(
      `Modify SKU details – ${sku.id}`,
      <SkuEditModalBody sku={sku} onSave={submitSkuModalSave} onClose={closeModal} />
    );
  };


  // --- 8. USER REGISTRY STATE & LOGIC ---
  const [userNameInput, setUserNameInput] = useState('');
  const [userEmailInput, setUserEmailInput] = useState('');
  const [userRoleInput, setUserRoleInput] = useState<'Engineer' | 'Team Leader' | 'Store Manager'>('Engineer');
  const [userPasswordInput, setUserPasswordInput] = useState('password');

  const generateRandomPassword = () => {
    const symbols = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    const pwd = Array.from({ length: 10 }, () => symbols[Math.floor(Math.random() * symbols.length)]).join('');
    setUserPasswordInput(pwd);
  };

  const handleRegisterNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    const name = userNameInput.trim();
    const email = userEmailInput.trim().toLowerCase();
    const role = userRoleInput;
    const password = userPasswordInput.trim() || 'password';

    if (!name || !email) {
      onAddToast('Please complete name and email address fields', 'error');
      return;
    }

    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      onAddToast('Please enter a valid format email', 'error');
      return;
    }

    if (users.find((u) => u.email === email)) {
      onAddToast('User email already exists in registry!', 'error');
      return;
    }

    const newUser: User = { 
      name, 
      email, 
      role, 
      password, 
      orgId: currentUser.orgId 
    };
    onUpdateUsers([...users, newUser]);

    // Initial assignment of empty stocks for engineers representation
    if (role === 'Engineer' && !engineerStock[email]) {
      const updatedEngStock = { ...engineerStock, [email]: [] };
      onUpdateEngineerStock(updatedEngStock);
    }

    setUserNameInput('');
    setUserEmailInput('');
    setUserRoleInput('Engineer');
    setUserPasswordInput('password');
    onAddToast(`Staff ${name} registered successfully into directory listings!`, 'success');
  };

  const deleteUserRecord = (email: string) => {
    const u = getUser(users, email);
    const updated = users.filter((x) => x.email !== email);
    onUpdateUsers(updated);
    closeModal();
    onAddToast(`User account for ${u.name} deleted successfully from directories rosters.`, 'success');
  };

  const openUserDeleteModal = (email: string) => {
    const u = getUser(users, email);
    triggerModal(
      `Confirm Deletion - ${u.name}`,
      <div className="space-y-4 text-center p-3">
        <AlertTriangle className="mx-auto h-12 w-12 text-rose-500 mb-2" />
        <h3 className="font-display font-black text-slate-900 text-lg">Are you sure?</h3>
        <p className="text-sm font-semibold text-slate-550 leading-relaxed">
          This will delete the roster account for <span className="font-bold text-slate-900">{u.name}</span>. Historical job sheets and performance ledger logs will be retained in databases.
        </p>
        <div className="flex gap-2.5 justify-end pt-4">
          <button onClick={closeModal} className="rounded-lg border border-slate-205 py-2 px-4.5 text-xs font-bold text-slate-600 transition">Cancel</button>
          <button onClick={() => deleteUserRecord(email)} className="rounded-lg bg-rose-600 text-white py-2 px-4.5 text-xs font-bold transition hover:bg-rose-700">Confirm Deletion</button>
        </div>
      </div>
    );
  };

  const saveUserModalChange = (oldEmail: string, name: string, role: string, pass: string) => {
    if (!name) {
      onAddToast('User names are required', 'error');
      return;
    }
    const updated = users.map((u) => {
      if (u.email.toLowerCase() === oldEmail.toLowerCase()) {
        return {
          ...u,
          name: name.trim(),
          role: role as any,
          password: pass.trim() || u.password,
        };
      }
      return u;
    });
    onUpdateUsers(updated);
    closeModal();
    onAddToast(`Profile records saved for ${name}.`);
  };

  const openUserEditModal = (user: User) => {
    triggerModal(
      `Modify Directory Profile – ${user.name}`,
      <UserEditModalBody user={user} onSave={saveUserModalChange} onClose={closeModal} />
    );
  };


  // --- VIEW RENDERING SWITCH ---

  if (activeTab === 'admin-approvals') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-950">Payroll & Incentives Queue</h1>
            <p className="text-sm font-medium text-slate-400">Validate team coordinates and calculate accessories sales commission</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
            {validatedLogs.length} awaiting final approval
          </span>
        </div>

        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setAdApproveTab('pending')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition ${
              adApproveTab === 'pending'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Awaiting Approval ({validatedLogs.length})
          </button>
          <button
            onClick={() => setAdApproveTab('done')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition ${
              adApproveTab === 'done'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Processed ({processedLogs.length})
          </button>
        </div>

        {adApproveTab === 'pending' ? (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200/50 shadow-sm text-xs">
              <div className="flex-1 min-w-[150px]">
                <input
                  type="text"
                  placeholder="Search Job ID..."
                  value={pendingLogSearch}
                  onChange={(e) => setPendingLogSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-indigo-650"
                  id="admin-pending-search"
                />
              </div>
              <select
                value={pendingLogEngFilter}
                onChange={(e) => setPendingLogEngFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 outline-none"
                id="admin-pending-eng-filter"
              >
                <option value="">All Engineers</option>
                {matrixEngineers.map((m) => (
                  <option key={m.email} value={m.email}>{m.name}</option>
                ))}
              </select>
              <input
                type="month"
                value={pendingLogDateFilter}
                onChange={(e) => setPendingLogDateFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 outline-none font-sans"
                id="admin-pending-date-filter"
              />
              {(pendingLogSearch || pendingLogEngFilter || pendingLogDateFilter) && (
                <button
                  onClick={() => {
                    setPendingLogSearch('');
                    setPendingLogEngFilter('');
                    setPendingLogDateFilter('');
                  }}
                  className="px-3 py-2 text-indigo-600 font-bold hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {validatedLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                <CheckCircle className="mx-auto h-12 w-12 text-emerald-100 mb-2" />
                <h3 className="font-bold text-slate-900 text-lg font-display">Payroll fully processed!</h3>
                <p className="text-sm mt-1">Excellent! All matching coordinates sheets are fully closed.</p>
              </div>
            ) : filteredValidatedLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                <CheckCircle className="mx-auto h-12 w-12 text-amber-100 mb-2" />
                <h3 className="font-bold text-slate-900 text-lg font-display">No matching requests</h3>
                <p className="text-sm mt-1">Adjust filter selections above to search for records.</p>
              </div>
            ) : (
              filteredValidatedLogs.map((l) => {
                const logUser = getUser(users, l.engEmail);
                const logRev = l.accessories.reduce((s, a) => s + a.saleValue, 0);
                const isValidated = l.status === 'Validated by SM';

                return (
                  <div key={l.id} className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-950">{logUser.name}</span>
                          <span className="font-mono text-xs font-bold text-slate-450 bg-slate-100 rounded px-1.5 py-0.5">{l.id}</span>
                        </div>
                        <div className="text-xs font-bold text-indigo-650 mt-1 flex flex-wrap gap-2 items-center">
                          <span>{fmtDate(l.date)}</span>
                          <span>•</span>
                          <span>{l.callsClosed} calls closed</span>
                          <span>•</span>
                          <span>Gross Revenue {fmtCur(logRev)}</span>
                          {l.rcpCollected ? (
                            <>
                              <span>•</span>
                              <span>RCP Collected: {fmtCur(l.rcpCollected)}</span>
                            </>
                          ) : null}
                          {l.rcpQty ? (
                            <>
                              <span>•</span>
                              <span>RCP Qty: {l.rcpQty}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <span className="inline-flex self-start items-center gap-1 rounded-full bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                        {isValidated ? 'Validated by Store Manager' : l.status}
                      </span>
                    </div>

                    {/* Team Lead escalation notes */}
                    {l.tlNote && (
                      <div className="rounded-xl bg-slate-50 border border-slate-150 p-3 text-xs text-slate-750 font-semibold flex items-start gap-2">
                        <FileText className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5" />
                        <div>Team Leader Notes: "{l.tlNote}"</div>
                      </div>
                    )}

                    {/* Store Manager validation notes */}
                    {l.adminNote && (
                      <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-3 text-xs text-indigo-950 font-semibold flex items-start gap-2">
                        <FileText className="h-4.5 w-4.5 text-indigo-550 shrink-0 mt-0.5" />
                        <div>Store Manager Notes: "{l.adminNote}"</div>
                      </div>
                    )}

                    {/* Accessories entries and editable incentives per line */}
                    {l.accessories.length > 0 ? (
                      <div className="rounded-xl border border-indigo-200/60 overflow-hidden">
                        <div className="bg-indigo-50/70 border-b border-indigo-150 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wide text-indigo-900">
                          Configure Individual Item Sales Incentives
                        </div>
                        <div className="p-1 divide-y divide-slate-100">
                          {l.accessories.map((a, accIdx) => {
                            const detail = getSku(skus, a.skuId);
                            const keyString = `${l.id}-${accIdx}`;
                            const liveVal = localIncentives[keyString] !== undefined
                              ? localIncentives[keyString]
                              : '';

                            return (
                              <div key={accIdx} className="grid grid-cols-1 md:grid-cols-12 items-center gap-3 py-2 px-3 text-xs font-semibold">
                                <div className="md:col-span-6 text-slate-900">
                                  <span className="font-mono text-[10px] text-indigo-900 bg-indigo-50 border border-indigo-100 rounded px-1 mt-0.5 pr-2 mr-2">{a.skuId}</span>
                                  {detail.name} (Sold ×{a.qty})
                                </div>
                                <div className="md:col-span-3 text-slate-500">Gross Price: {fmtCur(a.saleValue)}</div>
                                <div className="md:col-span-3 flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 capitalize whitespace-nowrap">Cash Incentive ₹</span>
                                  <input
                                    type="text"
                                    placeholder="Enter ₹"
                                    value={liveVal}
                                    onChange={(e) => {
                                      // only digits
                                      const clean = e.target.value.replace(/[^0-9]/g, '');
                                      handleIncentiveChange(l.id, accIdx, clean);
                                    }}
                                    className="w-20 rounded-lg border border-indigo-200 bg-indigo-50/20 px-2.5 py-1 text-xs font-bold text-indigo-750 outline-none text-right focus:border-indigo-650"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="bg-slate-50 py-2 px-3.5 flex justify-between items-center text-xs font-bold border-t border-slate-100 text-slate-500">
                          <span id="payout-incentive-label">Incentive:</span>
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-xs font-extrabold text-amber-700">
                            {fmtCur(getLogWeightedIncentiveTotal(l))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-400 italic font-semibold">
                        No accessories sold on jobs.
                      </div>
                    )}

                    {/* Admin Review Reason Input */}
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-bold tracking-wider text-slate-500">
                        Review Reason / Rejection Feedback (required if rejecting)
                      </label>
                      <input
                        type="text"
                        value={adminRejectNotes[l.id] || ''}
                        onChange={(e) => setAdminRejectNotes({ ...adminRejectNotes, [l.id]: e.target.value })}
                        placeholder="State feedback / instruction for the Engineer..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/25 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-650 focus:bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5">
                      <button
                        onClick={() => handleAdminRejectLog(l.id)}
                        className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 px-4.5 py-2.5 text-xs font-bold transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleAdminApproveLog(l.id)}
                        className="rounded-xl bg-indigo-600 text-white hover:bg-slate-900 px-4.5 py-2.5 text-xs font-bold transition shadow-sm shadow-indigo-600/10"
                      >
                        Confirm Approvals & Incentives
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-950">Processed Directory auditing</h2>
                <p className="text-xs text-slate-400">Export historic closed sheets matching criteria</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search Job ID..."
                  value={processedLogSearch}
                  onChange={(e) => setProcessedLogSearch(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-650"
                  id="admin-processed-search"
                />

                <input
                  type="month"
                  value={processedLogDateFilter}
                  onChange={(e) => setProcessedLogDateFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-650 outline-none font-sans"
                  id="admin-processed-date-filter"
                />

                <select
                  value={processedLogEngFilter}
                  onChange={(e) => setProcessedLogEngFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-600 outline-none"
                >
                  <option value="">All Staff Engineers ({matrixEngineers.length})</option>
                  {matrixEngineers.map((m) => (
                    <option key={m.email} value={m.email}>{m.name}</option>
                  ))}
                </select>

                <select
                  value={processedLogStatusFilter}
                  onChange={(e) => setProcessedLogStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-600 outline-none"
                >
                  <option value="">Approved / Rejected</option>
                  <option value="Approved">Approved Only</option>
                  <option value="Rejected">Rejected Only</option>
                </select>

                <button
                  onClick={downloadProcessedLogsCSV}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  <Download className="h-4 w-4" /> Download dynamic CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto text-sm font-medium">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 select-none">
                    <th
                      onClick={() => togglePayrollSort('id')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      ID{renderSortIndicator('id', payrollSortKey, payrollSortAsc)}
                    </th>
                    <th
                      onClick={() => togglePayrollSort('name')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Staff Profile{renderSortIndicator('name', payrollSortKey, payrollSortAsc)}
                    </th>
                    <th
                      onClick={() => togglePayrollSort('date')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Entry Date{renderSortIndicator('date', payrollSortKey, payrollSortAsc)}
                    </th>
                    <th
                      onClick={() => togglePayrollSort('calls')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Calls Closed{renderSortIndicator('calls', payrollSortKey, payrollSortAsc)}
                    </th>
                    <th
                      onClick={() => togglePayrollSort('gross')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Gross Sales Point{renderSortIndicator('gross', payrollSortKey, payrollSortAsc)}
                    </th>
                    <th
                      onClick={() => togglePayrollSort('rcpVal')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      RCP Collected{renderSortIndicator('rcpVal', payrollSortKey, payrollSortAsc)}
                    </th>
                    <th
                      onClick={() => togglePayrollSort('rcpQty')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      RCP Qty{renderSortIndicator('rcpQty', payrollSortKey, payrollSortAsc)}
                    </th>
                    <th
                      onClick={() => togglePayrollSort('payout')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Payout Cash{renderSortIndicator('payout', payrollSortKey, payrollSortAsc)}
                    </th>
                    <th
                      onClick={() => togglePayrollSort('status')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Audit Status{renderSortIndicator('status', payrollSortKey, payrollSortAsc)}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProcessedLogs.map((l) => {
                    const eng = getUser(users, l.engEmail);
                    const revStr = l.accessories.reduce((s, a) => s + a.saleValue, 0);
                    const incStr = l.accessories.reduce((s, a) => s + (a.adminIncentive || 0), 0);
                    const isRejected = l.status === 'Rejected';

                    return (
                      <tr key={l.id} className={`hover:bg-slate-50/50 ${isRejected ? 'opacity-60' : ''}`}>
                        <td className="py-3 px-3"><span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">{l.id}</span></td>
                        <td className="py-3 px-3"><strong>{eng.name}</strong></td>
                        <td className="py-3 px-3 text-slate-500">{fmtDate(l.date)}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{l.callsClosed} jobs</td>
                        <td className="py-3 px-3 text-slate-650">{fmtCur(revStr)}</td>
                        <td className="py-3 px-3 text-slate-900 font-semibold">{fmtCur(l.rcpCollected || 0)}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{l.rcpQty || 0}</td>
                        <td className="py-3 px-3">
                          {isRejected ? <span className="text-slate-350">—</span> : (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                              {fmtCur(incStr)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                              l.status === 'Approved'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                : 'bg-rose-50 border-rose-100 text-rose-800'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'admin-inventory-approve') {
    const filteredPendingPurchases = pendingPurchases.filter((p) => {
      const matchSku = !pendingPiSkuFilter || p.skuId === pendingPiSkuFilter;
      const matchVendor = !pendingPiVendorFilter || p.vendor === pendingPiVendorFilter;
      const matchDate = !pendingPiDateFilter || p.date.includes(pendingPiDateFilter);
      return matchSku && matchVendor && matchDate;
    });

    const unsortedProcessedPurchases = processedPurchases.filter((p) => {
      const matchSku = !processedPiSkuFilter || p.skuId === processedPiSkuFilter;
      const matchVendor = !processedPiVendorFilter || p.vendor === processedPiVendorFilter;
      const matchDate = !processedPiDateFilter || p.date.includes(processedPiDateFilter);
      return matchSku && matchVendor && matchDate;
    });

    const filteredProcessedPurchases = [...unsortedProcessedPurchases].sort((a, b) => {
      let comparison = 0;
      const skA = getSku(skus, a.skuId);
      const skB = getSku(skus, b.skuId);

      if (cargoSortKey === 'id') {
        comparison = a.id.localeCompare(b.id);
      } else if (cargoSortKey === 'item') {
        comparison = skA.name.localeCompare(skB.name);
      } else if (cargoSortKey === 'vendor') {
        comparison = (a.vendor || '').localeCompare(b.vendor || '');
      } else if (cargoSortKey === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (cargoSortKey === 'qty') {
        comparison = a.qty - b.qty;
      } else if (cargoSortKey === 'price') {
        comparison = a.unitPrice - b.unitPrice;
      } else if (cargoSortKey === 'value') {
        comparison = (a.qty * a.unitPrice) - (b.qty * b.unitPrice);
      } else if (cargoSortKey === 'status') {
        comparison = a.status.localeCompare(b.status);
      }

      return cargoSortAsc ? comparison : -comparison;
    });

    const filteredPendingRevokes = pendingRevokes.filter((r) => {
      const matchEng = !pendingRvEngFilter || r.engEmail === pendingRvEngFilter;
      const matchSku = !pendingRvSkuFilter || r.skuId === pendingRvSkuFilter;
      const matchDate = !pendingRvDateFilter || r.date.includes(pendingRvDateFilter);
      return matchEng && matchSku && matchDate;
    });

    const filteredProcessedRevokes = processedRevokes.filter((r) => {
      const matchEng = !processedRvEngFilter || r.engEmail === processedRvEngFilter;
      const matchSku = !processedRvSkuFilter || r.skuId === processedRvSkuFilter;
      const matchDate = !processedRvDateFilter || r.date.includes(processedRvDateFilter);
      return matchEng && matchSku && matchDate;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-955">Inventory Approvals</h1>
            <p className="text-sm font-medium text-slate-400">Validate incoming stock purchases and recall requests from engineer vans</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-800">
            {pendingPurchases.length + pendingRevokes.length} tickets pending action
          </span>
        </div>

        {/* Inner Sub-tabs */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-white rounded-lg p-1 border border-slate-100 shadow-sm max-w-fit">
          <button
            onClick={() => setInvApproveSubTab('purchases')}
            className={`px-4 py-2 text-xs font-extrabold uppercase rounded-md tracking-wider transition-all duration-200 ${
              invApproveSubTab === 'purchases'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Purchase Shipments ({pendingPurchases.length})
          </button>
          <button
            onClick={() => setInvApproveSubTab('revokes')}
            className={`px-4 py-2 text-xs font-extrabold uppercase rounded-md tracking-wider transition-all duration-200 ${
              invApproveSubTab === 'revokes'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Van Recalls ({pendingRevokes.length})
          </button>
        </div>

        {invApproveSubTab === 'purchases' ? (
          <div className="space-y-6">
            <div className="flex border-b border-slate-200 bg-white/50 p-1.5 rounded-xl border border-slate-150 shadow-xs max-w-fit text-xs">
              <button onClick={() => setPiActiveTab('pending')} className={`px-4.5 py-2 font-bold rounded-lg transition ${piActiveTab === 'pending' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                Pending Approvals ({pendingPurchases.length})
              </button>
              <button onClick={() => setPiActiveTab('processed')} className={`px-4.5 py-2 font-bold rounded-lg transition ${piActiveTab === 'processed' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                Audit History ({processedPurchases.length})
              </button>
            </div>

            {piActiveTab === 'pending' ? (
              <div className="space-y-4">
                {/* Filters Bar */}
                <div className="flex flex-wrap items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200/50 shadow-sm text-xs">
                  <select
                    value={pendingPiSkuFilter}
                    onChange={(e) => setPendingPiSkuFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 outline-none"
                    id="admin-pending-pi-sku"
                  >
                    <option value="">All SKUs</option>
                    {skus.map((s) => (
                      <option key={s.id} value={s.id}>{s.id} – {s.name}</option>
                    ))}
                  </select>
                  <select
                    value={pendingPiVendorFilter}
                    onChange={(e) => setPendingPiVendorFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 outline-none"
                    id="admin-pending-pi-vendor"
                  >
                    <option value="">All Suppliers</option>
                    {[...new Set(purchaseInward.map((v) => v.vendor).filter(Boolean))].sort().map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <input
                    type="month"
                    value={pendingPiDateFilter}
                    onChange={(e) => setPendingPiDateFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 outline-none font-sans"
                    id="admin-pending-pi-date"
                  />
                  {(pendingPiSkuFilter || pendingPiVendorFilter || pendingPiDateFilter) && (
                    <button
                      onClick={() => {
                        setPendingPiSkuFilter('');
                        setPendingPiVendorFilter('');
                        setPendingPiDateFilter('');
                      }}
                      className="px-3 py-2 text-indigo-600 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {pendingPurchases.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                    <CheckCircle className="mx-auto h-12 w-12 text-emerald-100 mb-2" />
                    <h3 className="font-bold text-slate-900 text-lg">Shipments Checked!</h3>
                    <p className="text-sm mt-1 font-semibold">Every proposed supplier cargo delivery has been cleared.</p>
                  </div>
                ) : filteredPendingPurchases.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                    <CheckCircle className="mx-auto h-12 w-12 text-amber-100 mb-2" />
                    <h3 className="font-bold text-slate-900 text-lg">No matching shipments</h3>
                    <p className="text-sm mt-1 select-none">Adjust filter selections above to search for records.</p>
                  </div>
                ) : (
                  filteredPendingPurchases.map((p) => {
                    const skuItem = getSku(skus, p.skuId);
                    const invItem = getInvItem(inventory, p.skuId);
                    const isProcessing = processingPurchaseIds.includes(p.id);

                    return (
                      <div key={p.id} className={`rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4 animate-fade-in transition-all ${isProcessing ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{skuItem.name}</span>
                              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{p.id}</span>
                            </div>
                            <div className="text-xs font-bold text-indigo-650 mt-1 flex flex-wrap gap-2 items-center">
                              <span>SKU: {p.skuId}</span>
                              <span>•</span>
                              <span>Supplier: {p.vendor || 'Unknown'}</span>
                              <span>•</span>
                              <span>Date Inward: {fmtDate(p.date)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 self-start shrink-0">
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-violet-700">
                              Proposed Cargo
                            </span>
                            {isProcessing && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-700 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white animate-pulse">
                                Processing...
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Qty Shipping</div>
                            <div className="text-sm font-extrabold text-slate-955">×{p.qty}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Unit Price</div>
                            <div className="text-sm font-extrabold text-slate-805">{fmtCur(p.unitPrice)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Warehouse stock</div>
                            <div className="text-sm font-extrabold text-slate-500">{invItem.qty} available</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Cargo value</div>
                            <div className="text-sm font-black text-indigo-600">{fmtCur(p.qty * p.unitPrice)}</div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2.5">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleRejectPurchase(p.id)}
                            className="rounded-xl border border-rose-255 bg-rose-50 text-rose-800 hover:bg-rose-100 px-4 py-2 text-xs font-bold transition disabled:opacity-50"
                          >
                            Reject Cargo
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleApprovePurchase(p.id)}
                            className="rounded-xl bg-indigo-600 text-white hover:bg-slate-900 px-4.5 py-2.5 text-xs font-bold transition shadow-sm disabled:opacity-50"
                          >
                            {isProcessing ? 'Processing...' : 'Accept shipment & Credit stock'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="font-display text-sm font-bold text-slate-955">Audit log cargo tracking</h2>
                    <p className="text-xs text-slate-400">Search and audit closed cargo ticket logs</p>
                  </div>
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={processedPiSkuFilter}
                      onChange={(e) => setProcessedPiSkuFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-600 outline-none"
                    >
                      <option value="">All SKUs</option>
                      {skus.map((s) => (
                        <option key={s.id} value={s.id}>{s.id} – {s.name}</option>
                      ))}
                    </select>
                    <select
                      value={processedPiVendorFilter}
                      onChange={(e) => setProcessedPiVendorFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-600 outline-none"
                    >
                      <option value="">All Vendors</option>
                      {[...new Set(purchaseInward.map((v) => v.vendor).filter(Boolean))].sort().map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto text-xs font-medium">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 select-none">
                        <th
                          onClick={() => toggleCargoSort('id')}
                          className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          ID{renderSortIndicator('id', cargoSortKey, cargoSortAsc)}
                        </th>
                        <th
                          onClick={() => toggleCargoSort('item')}
                          className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          Item{renderSortIndicator('item', cargoSortKey, cargoSortAsc)}
                        </th>
                        <th
                          onClick={() => toggleCargoSort('vendor')}
                          className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          Vendor{renderSortIndicator('vendor', cargoSortKey, cargoSortAsc)}
                        </th>
                        <th
                          onClick={() => toggleCargoSort('date')}
                          className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          Inward Date{renderSortIndicator('date', cargoSortKey, cargoSortAsc)}
                        </th>
                        <th
                          onClick={() => toggleCargoSort('qty')}
                          className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          Qty{renderSortIndicator('qty', cargoSortKey, cargoSortAsc)}
                        </th>
                        <th
                          onClick={() => toggleCargoSort('price')}
                          className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          UnitPrice{renderSortIndicator('price', cargoSortKey, cargoSortAsc)}
                        </th>
                        <th
                          onClick={() => toggleCargoSort('value')}
                          className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          Total Value{renderSortIndicator('value', cargoSortKey, cargoSortAsc)}
                        </th>
                        <th
                          onClick={() => toggleCargoSort('status')}
                          className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          Status{renderSortIndicator('status', cargoSortKey, cargoSortAsc)}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredProcessedPurchases.map((p) => {
                        const sk = getSku(skus, p.skuId);
                        const isRejected = p.status === 'Rejected';
                        return (
                          <tr key={p.id} className={`hover:bg-slate-50/50 ${isRejected ? 'opacity-60' : ''}`}>
                            <td className="py-3 px-3"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-150">{p.id}</span></td>
                            <td className="py-3 px-3"><strong>{sk.name}</strong></td>
                            <td className="py-3 px-3">{p.vendor || 'N/A'}</td>
                            <td className="py-3 px-3 text-slate-500">{fmtDate(p.date)}</td>
                            <td className="py-3 px-3 font-bold font-semibold">×{p.qty}</td>
                            <td className="py-3 px-3 text-slate-600">{fmtCur(p.unitPrice)}</td>
                            <td className="py-3 px-3 text-indigo-650 font-bold">{fmtCur(p.qty * p.unitPrice)}</td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase border ${p.status === 'Approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex border-b border-slate-200 bg-white/50 p-1.5 rounded-xl border border-slate-150 shadow-xs max-w-fit text-xs">
              <button onClick={() => setRvActiveTab('pending')} className={`px-4.5 py-2 font-bold rounded-lg transition ${rvActiveTab === 'pending' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                Recall Proposals ({pendingRevokes.length})
              </button>
              <button onClick={() => setRvActiveTab('processed')} className={`px-4.5 py-2 font-bold rounded-lg transition ${rvActiveTab === 'processed' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                Processed Ledgers ({processedRevokes.length})
              </button>
            </div>

            {rvActiveTab === 'pending' ? (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200/50 shadow-sm text-xs">
                  <select
                    value={pendingRvEngFilter}
                    onChange={(e) => setPendingRvEngFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 outline-none"
                  >
                    <option value="">All Engineers</option>
                    {matrixEngineers.map((m) => (
                      <option key={m.email} value={m.email}>{m.name}</option>
                    ))}
                  </select>
                  <select
                    value={pendingRvSkuFilter}
                    onChange={(e) => setPendingRvSkuFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 outline-none"
                  >
                    <option value="">All SKUs</option>
                    {skus.map((s) => (
                      <option key={s.id} value={s.id}>{s.id} – {s.name}</option>
                    ))}
                  </select>
                  <input
                    type="month"
                    value={pendingRvDateFilter}
                    onChange={(e) => setPendingRvDateFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 outline-none font-sans"
                  />
                </div>

                {pendingRevokes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                    <CheckCircle className="mx-auto h-12 w-12 text-emerald-100 mb-2" />
                    <h3 className="font-bold text-slate-900 text-lg">No Recall Audits!</h3>
                    <p className="text-sm mt-1 font-semibold">Excellent! All proposed van recalls are resolved.</p>
                  </div>
                ) : filteredPendingRevokes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                    <CheckCircle className="mx-auto h-12 w-12 text-amber-100 mb-2" />
                    <h3 className="font-bold text-slate-900 text-lg">No matching recall entries</h3>
                    <p className="text-sm mt-1">Adjust filters above to search for logs.</p>
                  </div>
                ) : (
                  filteredPendingRevokes.map((rv) => {
                    const sk = getSku(skus, rv.skuId);
                    const eng = getUser(users, rv.engEmail);
                    const list = engineerStock[rv.engEmail] || [];
                    const activeVanItem = list.find((it) => it.skuId === rv.skuId);
                    const vanQty = activeVanItem ? activeVanItem.qty : 0;
                    const isProcessing = processingRevokeIds.includes(rv.id);

                    return (
                      <div key={rv.id} className={`rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4 animate-fade-in transition-all ${isProcessing ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">Recall: {sk.name}</span>
                              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{rv.id}</span>
                            </div>
                            <div className="text-xs font-bold text-indigo-650 mt-1 flex flex-wrap gap-2 items-center">
                              <span>Engineer: {eng.name} ({rv.engEmail})</span>
                              <span>•</span>
                              <span>Recall Date: {fmtDate(rv.date)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 self-start shrink-0">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-800">
                              Van Recall Ticket
                            </span>
                            {isProcessing && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-700 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white animate-pulse">
                                Processing...
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Qty to Recall</div>
                            <div className="text-sm font-extrabold text-slate-955">×{rv.qty}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Active Van Stock</div>
                            <div className="text-sm font-extrabold text-slate-500">×{vanQty} in van</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Reason / Reference</div>
                            <div className="text-xs text-slate-650 truncate" title={rv.reason}>{rv.reason}</div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2.5">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleRejectRevoke(rv.id)}
                            className="rounded-xl border border-rose-255 bg-rose-50 text-rose-800 hover:bg-rose-100 px-4 py-2 text-xs font-bold transition disabled:opacity-50"
                          >
                            Reject Recall
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleApproveRevoke(rv.id)}
                            className="rounded-xl bg-indigo-600 text-white hover:bg-slate-900 px-4.5 py-2.5 text-xs font-bold transition shadow-sm disabled:opacity-50"
                          >
                            {isProcessing ? 'Processing...' : 'Confirm Recall & Return to Warehouse'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="font-display text-sm font-bold text-slate-955">Van Recalls ledger records</h2>
                    <p className="text-xs text-slate-400">Search and audit closed van recall tickets</p>
                  </div>
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={processedRvEngFilter}
                      onChange={(e) => setProcessedRvEngFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-600 outline-none"
                    >
                      <option value="">All Engineers</option>
                      {matrixEngineers.map((m) => (
                        <option key={m.email} value={m.email}>{m.name}</option>
                      ))}
                    </select>
                    <select
                      value={processedRvSkuFilter}
                      onChange={(e) => setProcessedRvSkuFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-600 outline-none"
                    >
                      <option value="">All SKUs</option>
                      {skus.map((s) => (
                        <option key={s.id} value={s.id}>{s.id} – {s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto text-xs font-medium">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400">ID</th>
                        <th className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400">Item</th>
                        <th className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400">Engineer</th>
                        <th className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400">Recall Date</th>
                        <th className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400">Qty Recalled</th>
                        <th className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400">Reason</th>
                        <th className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredProcessedRevokes.map((r) => {
                        const sk = getSku(skus, r.skuId);
                        const eng = getUser(users, r.engEmail);
                        const isRejected = r.status === 'Rejected';
                        return (
                          <tr key={r.id} className={`hover:bg-slate-50/50 ${isRejected ? 'opacity-60' : ''}`}>
                            <td className="py-3 px-3"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-150">{r.id}</span></td>
                            <td className="py-3 px-3"><strong>{sk.name}</strong></td>
                            <td className="py-3 px-3">{eng.name}</td>
                            <td className="py-3 px-3 text-slate-500">{fmtDate(r.date)}</td>
                            <td className="py-3 px-3 font-bold">×{r.qty}</td>
                            <td className="py-3 px-3 text-slate-550 max-w-xs truncate" title={r.reason}>{r.reason || 'N/A'}</td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide border ${r.status === 'Revoked' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  if (activeTab === 'admin-attendance') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-950">Attendance Register Matrix</h1>
            <p className="text-sm font-medium text-slate-400">Track engineer present days alongside monthly job outcomes metrics</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={currentSelectedMonth}
              onChange={(e) => setCurrentSelectedMonth(e.target.value)}
              className="rounded-xl border border-slate-205 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-650"
            >
              {uniqueLogMonths.map((m) => {
                const parts = m.split('-');
                const lbl = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
                return <option key={m} value={m}>{lbl}</option>;
              })}
            </select>

            <button
              onClick={downloadAttendanceReportCSV}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-650 transition"
            >
              <Download className="h-4 w-4" /> Download matrix CSV
            </button>
          </div>
        </div>

        {/* Pending Attendance Validation Queue */}
        {(() => {
          const pendingAttendanceReqs = attendanceRequests.filter(req => req.approvedStatus === 'Pending');
          if (pendingAttendanceReqs.length === 0) return null;

          return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/20 p-5 shadow-sm space-y-4 animate-scale-up">
              <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                <div>
                  <h2 className="font-display text-sm font-extrabold text-amber-900 uppercase tracking-wider">
                    pending attendance approvals ({pendingAttendanceReqs.length})
                  </h2>
                  <p className="text-xs font-medium text-amber-600">Attendance requests submitted by Team Leaders and Store Managers awaiting validation</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-medium">
                  <thead>
                    <tr className="border-b border-amber-100/60 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
                      <th className="py-2 px-3">Req ID</th>
                      <th className="py-2 px-3">Engineer Name</th>
                      <th className="py-2 px-3">Date Submitted For</th>
                      <th className="py-2 px-3">Submitted By (Role)</th>
                      <th className="py-2 px-3 text-center">Mark Status</th>
                      <th className="py-2 px-3">Remarks / Description</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAttendanceReqs.map((req) => {
                      const engUser = getUser(users, req.engEmail);
                      return (
                        <tr key={req.id} className="border-b border-amber-100/40 hover:bg-amber-100/10 text-slate-800">
                          <td className="py-3 px-3 font-mono font-bold text-slate-500">{req.id}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900">{engUser.name}</span>
                            <span className="block text-[10px] text-slate-400">{req.engEmail}</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">{fmtDate(req.date)}</td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-slate-900">{req.submittedBy}</span>
                            <span className="block text-[10px] font-bold text-indigo-600/80">{req.submittedByRole}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide border ${
                                req.status === 'Present'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-amber-50 border-amber-200 text-amber-800'
                              }`}
                            >
                                {req.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-600 max-w-[180px] truncate" title={req.remarks || ''}>
                            {req.remarks || <span className="text-slate-350 italic">—</span>}
                          </td>
                          <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleApproveAttendanceRequest(req.id, true)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white transition shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveAttendanceRequest(req.id, false)}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white transition shadow-sm"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Matrix Consolidated Board */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
          <h2 className="font-display text-sm font-bold text-slate-950 mb-4">Staff Monthly Performance & Attendance Summary</h2>
          <div className="overflow-x-auto text-sm font-medium">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Staff Profile</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 text-center">Days Present</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 text-center">Days Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {attendanceUsers.map((eng) => {
                  const presentCount = getPresentDaysPercentage(eng.email, currentSelectedMonth);
                  // days in month limit
                  const dayToday = new Date().toISOString().substring(0, 7) === currentSelectedMonth ? new Date().getDate() : daysInAttendanceMonth;
                  const absentCount = Math.max(0, dayToday - presentCount);

                  return (
                    <tr key={eng.email} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <strong>{eng.name}</strong>
                        <span className="block text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{eng.role}</span>
                      </td>
                      <td className="py-3 px-3 text-center text-emerald-800 font-bold">{presentCount} Days</td>
                      <td className="py-3 px-3 text-center text-rose-800 font-bold">{absentCount} Days</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Horizontal calendar grid */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm max-w-full overflow-x-auto">
          <div className="flex flex-row items-center justify-between gap-4 mb-4">
            <h2 className="font-display text-sm font-bold text-slate-950 font-sans">Corporate Attendance Registry Grid</h2>
            <button
              onClick={downloadRegistryGridCSV}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-650 transition shadow-xs"
            >
              <Download className="h-3.5 w-3.5" /> Download Grid CSV
            </button>
          </div>
          <div className="text-sm font-semibold max-w-full overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: '760px' }}>
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2 px-3 text-xs text-slate-400 tracking-widest" style={{ minWidth: '150px' }}>Staff Member</th>
                  {attendanceDays.map((d) => (
                    <th key={d} className="py-1 px-1.5 text-center text-[9px] font-bold text-slate-400" style={{ minWidth: '22px' }}>
                      {d.split('-')[2]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {attendanceUsers.map((eng) => {
                  const engAtt = attendance[eng.email] || {};

                  return (
                    <tr key={eng.email} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <strong>{eng.name}</strong>
                        <span className="block text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{eng.role}</span>
                      </td>
                      {attendanceDays.map((d) => {
                        const cellVal = engAtt[d];
                        const dateObj = new Date(d);
                        const isPast = dateObj <= new Date();

                        return (
                          <td key={d} className="py-1 px-1.5 text-center">
                            {cellVal === 'Present' ? (
                              <span className="font-bold text-emerald-600 text-xs shrink-0 inline-block">✓</span>
                            ) : isPast && dateObj.getDay() !== 0 ? (
                              <span className="font-bold text-rose-450 text-[10px] shrink-0 inline-block">—</span>
                            ) : (
                              <span className="text-slate-200 shrink-0 inline-block font-black">·</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'admin-inventory') {
    const activeStaffEngs = users.filter((x) => x.role === 'Engineer');
    const selectedTruckHoldings = engineerStock[invEngStockSelector] || [];

    // Flatten and sort the items
    const flattenedVanStock = Object.entries(engineerStock).flatMap(([email, items]) => {
      if (invEngStockSelector && email !== invEngStockSelector) return [];
      const userRecord = getUser(users, email);

      return items.map((item) => {
        const sk = getSku(skus, item.skuId);
        return {
          email,
          engineerName: userRecord.name,
          skuId: item.skuId,
          itemName: sk.name,
          qty: item.qty
        };
      });
    });

    const sortedVanStock = [...flattenedVanStock].sort((a, b) => {
      let comparison = 0;
      if (vanStockSortKey === 'profile') {
        comparison = a.engineerName.localeCompare(b.engineerName) || a.email.localeCompare(b.email);
      } else if (vanStockSortKey === 'sku') {
        comparison = a.skuId.localeCompare(b.skuId);
      } else if (vanStockSortKey === 'description') {
        comparison = a.itemName.localeCompare(b.itemName);
      } else if (vanStockSortKey === 'qty') {
        comparison = a.qty - b.qty;
      }
      return vanStockSortAsc ? comparison : -comparison;
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950 font-sans">Main Store Inventory Control</h1>
          <p className="text-sm font-medium text-slate-400">Oversee active supplier cargo sheets and track materials inside engineer trunks</p>
        </div>

        {/* Premium Segmented Tab Switcher (iOS/Material style) */}
        <div className="flex justify-center sm:justify-start">
          <div className="relative flex p-1 bg-blue-50 rounded-xl w-full sm:w-auto gap-1">
            <button
              id="tab-warehouse-stocks"
              onClick={() => setActiveInventoryTab('warehouse')}
              className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition duration-200 w-full sm:w-auto ${
                activeInventoryTab === 'warehouse'
                  ? 'text-slate-900 bg-white shadow-xs font-semibold'
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Warehouse Stocks</span>
            </button>
            <button
              id="tab-purchase-shipments"
              onClick={() => setActiveInventoryTab('shipments')}
              className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition duration-200 w-full sm:w-auto ${
                activeInventoryTab === 'shipments'
                  ? 'text-slate-900 bg-white shadow-xs font-semibold'
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Purchase Shipments</span>
            </button>
            <button
              id="tab-van-recalls"
              onClick={() => setActiveInventoryTab('engineer')}
              className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition duration-200 w-full sm:w-auto ${
                activeInventoryTab === 'engineer'
                  ? 'text-slate-900 bg-white shadow-xs font-semibold'
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Engineer wise stock report</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Warehouse Stocks */}
        {activeInventoryTab === 'warehouse' && (
          <div className="space-y-6 animate-fade-in">
            {/* Board stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
                <span className="text-xs font-bold tracking-wider text-slate-400 block mb-1">Total Capital</span>
                <div className="flex items-center gap-2 text-indigo-750">
                  <span className="text-2xl font-extrabold">{fmtCur(inventoryValueSum)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Live approved asset valuation</p>
              </div>

              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
                <span className="text-xs font-bold tracking-wider text-slate-400 block mb-1">Low Stock Alerts</span>
                <span className={`text-2xl font-extrabold block ${inventory.filter(i => i.qty <= getSku(skus, i.skuId).lowStockAlert).length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {inventory.filter(i => i.qty <= getSku(skus, i.skuId).lowStockAlert).length} lines trigger
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
                <span className="text-xs font-bold tracking-wider text-slate-400 block mb-1">Registered SKUs</span>
                <span className="text-2xl font-extrabold block text-slate-900">{skus.length} SKU cataloged</span>
              </div>

              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
                <span className="text-xs font-bold tracking-wider text-slate-400 block mb-1">Active Suppliers</span>
                <span className="text-2xl font-extrabold block text-slate-900">{new Set(purchaseInward.map(p => p.vendor)).size} Vendor suppliers</span>
              </div>
            </div>

            {/* Current Stock Available Report */}
            <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">Current Stock Available Report</h2>
                  <p className="text-xs text-slate-400">Warehouse stock availability, valuations, and cost bounds</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-455" />
                    <input
                      type="text"
                      placeholder="Search SKU ID or Item..."
                      value={invSearchQuery}
                      onChange={(e) => setInvSearchQuery(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white pl-8 pr-3.5 py-1.5 text-xs font-semibold text-slate-655 outline-none focus:border-indigo-655 w-64"
                    />
                  </div>

                  <button
                    onClick={downloadAvailableStockCSV}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 shadow-sm transition"
                  >
                    <Download className="h-4 w-4" /> Download CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto text-sm font-medium">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 select-none">
                      <th
                        onClick={() => toggleWhStockSort('sku')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        SKU ID{renderSortIndicator('sku', whStockSortKey, whStockSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleWhStockSort('name')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Item Description{renderSortIndicator('name', whStockSortKey, whStockSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleWhStockSort('qty')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Available Qty{renderSortIndicator('qty', whStockSortKey, whStockSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleWhStockSort('price')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Unit Price{renderSortIndicator('price', whStockSortKey, whStockSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleWhStockSort('value')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Total Value{renderSortIndicator('value', whStockSortKey, whStockSortAsc)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-705">
                    {[...inventory.filter((item) => {
                      if (invSearchQuery.trim()) {
                        const q = invSearchQuery.toLowerCase();
                        const sk = getSku(skus, item.skuId);
                        return item.skuId.toLowerCase().includes(q) || sk.name.toLowerCase().includes(q);
                      }
                      return true;
                    })].sort((a, b) => {
                      let comparison = 0;
                      const skA = getSku(skus, a.skuId);
                      const skB = getSku(skus, b.skuId);

                      if (whStockSortKey === 'sku') {
                        comparison = a.skuId.localeCompare(b.skuId);
                      } else if (whStockSortKey === 'name') {
                        comparison = skA.name.localeCompare(skB.name);
                      } else if (whStockSortKey === 'qty') {
                        comparison = a.qty - b.qty;
                      } else if (whStockSortKey === 'price') {
                        comparison = a.unitPrice - b.unitPrice;
                      } else if (whStockSortKey === 'value') {
                        comparison = (a.qty * a.unitPrice) - (b.qty * b.unitPrice);
                      }

                      return whStockSortAsc ? comparison : -comparison;
                    }).map((item) => {
                      const sk = getSku(skus, item.skuId);
                      const totalVal = item.qty * item.unitPrice;
                      return (
                        <tr key={item.skuId} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3"><span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">{item.skuId}</span></td>
                          <td className="py-3 px-3 text-slate-900"><strong>{sk.name}</strong></td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{item.qty} units</td>
                          <td className="py-3 px-3 text-slate-600">{fmtCur(item.unitPrice)}</td>
                          <td className="py-3 px-3 font-bold text-indigo-600">{fmtCur(totalVal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Purchase Shipments */}
        {activeInventoryTab === 'shipments' && (
          <div className="space-y-6 animate-fade-in">
            {/* Supplier shipments report with dynamic filters */}
            <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-955">Purchase Inwards Receipts Audit</h2>
                  <p className="text-xs text-slate-400">Dynamically reconciles incoming deliveries recorded by store managers</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={invVendorSelector}
                    onChange={(e) => setInvVendorSelector(e.target.value)}
                    className="rounded-xl border border-slate-205 bg-white p-2.5 text-xs font-semibold text-slate-655 outline-none"
                  >
                    <option value="">All Suppliers</option>
                    {[...new Set(purchaseInward.map(p => p.vendor).filter(Boolean))].sort().map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>

                  <select
                    value={invStatusSelector}
                    onChange={(e) => setInvStatusSelector(e.target.value)}
                    className="rounded-xl border border-slate-205 bg-white p-2.5 text-xs font-semibold text-slate-655 outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending Audit</option>
                    <option value="Approved">Approved / Credited</option>
                    <option value="Rejected">Rejected / Blocked</option>
                  </select>

                  <button
                    onClick={downloadWarehouseInwardsFilteredCSV}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    <Download className="h-4 w-4" /> Export receipts CSV
                  </button>
                </div>
              </div>

              {(invVendorSelector || invStatusSelector) && (
                <div className="rounded-xl border border-indigo-150 bg-indigo-50/40 p-3 flex flex-wrap gap-x-6 gap-y-1 text-xs font-bold text-indigo-955">
                  <span className="text-indigo-700">Suppliers Matched: {invVendorSelector || 'All Suppliers'}</span>
                  <span>Matched ticket count: {filteredWarehouseInwards.length}</span>
                  <span>Matched material Units: {matchedInwardQty} units</span>
                  <span>Audit cash points: {fmtCur(matchedInwardVal)}</span>
                </div>
              )}

              <div className="overflow-x-auto text-sm font-medium">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 select-none">
                      <th
                        onClick={() => toggleShipmentSort('id')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        ID{renderSortIndicator('id', shipmentSortKey, shipmentSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleShipmentSort('sku')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        SKU{renderSortIndicator('sku', shipmentSortKey, shipmentSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleShipmentSort('name')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Item Description{renderSortIndicator('name', shipmentSortKey, shipmentSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleShipmentSort('qty')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Qty Received{renderSortIndicator('qty', shipmentSortKey, shipmentSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleShipmentSort('vendor')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Invoiced Vendor Supplier{renderSortIndicator('vendor', shipmentSortKey, shipmentSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleShipmentSort('value')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Invoice Sum Value{renderSortIndicator('value', shipmentSortKey, shipmentSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleShipmentSort('status')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Audit Status{renderSortIndicator('status', shipmentSortKey, shipmentSortAsc)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredWarehouseInwards.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400">No shipments match filtration criteria selected.</td>
                      </tr>
                    ) : (
                      filteredWarehouseInwards.map((p) => {
                        const sk = getSku(skus, p.skuId);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 text-xs text-slate-400">{p.id}</td>
                            <td className="py-3 px-3"><span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">{p.skuId}</span></td>
                            <td className="py-3 px-3"><strong>{sk.name}</strong></td>
                            <td className="py-3 px-3 font-semibold text-slate-850">+{p.qty} units</td>
                            <td className="py-3 px-3 font-semibold text-slate-550">{p.vendor}</td>
                            <td className="py-3 px-3 font-bold text-slate-905">{fmtCur(p.qty * p.unitPrice)}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                  p.status === 'Approved'
                                    ? 'bg-emerald-50 border-emerald-110 text-emerald-800'
                                    : p.status === 'Rejected'
                                    ? 'bg-rose-50 border-rose-110 text-rose-800'
                                    : 'bg-amber-50 border-amber-110 text-amber-855'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Engineer wise stock report */}
        {activeInventoryTab === 'engineer' && (
          <div className="space-y-6 animate-fade-in">
            {/* Engineer-wise stocking audit */}
            <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">Engineer Van Stock Audit Reports</h2>
                  <p className="text-xs text-slate-400">Inspect allocations presently sitting inside service trucks trunks</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={invEngStockSelector}
                    onChange={(e) => setInvEngStockSelector(e.target.value)}
                    className="rounded-xl border border-slate-205 bg-white p-2.5 text-xs font-semibold text-slate-655 outline-none focus:border-indigo-600"
                  >
                    <option value="">All Roster Engineers ({activeStaffEngs.length})</option>
                    {activeStaffEngs.map((e) => (
                      <option key={e.email} value={e.email}>{e.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={downloadVanStockDetailedCSV}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-655 hover:bg-slate-50 transition"
                  >
                    <Download className="h-4 w-4" /> Download Van balance CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto text-sm font-medium">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 select-none">
                      <th
                        onClick={() => toggleVanStockSort('profile')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Engineer Profile{renderSortIndicator('profile', vanStockSortKey, vanStockSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleVanStockSort('sku')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        SKU Code{renderSortIndicator('sku', vanStockSortKey, vanStockSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleVanStockSort('description')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Item Description{renderSortIndicator('description', vanStockSortKey, vanStockSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleVanStockSort('qty')}
                        className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Stock Available{renderSortIndicator('qty', vanStockSortKey, vanStockSortAsc)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sortedVanStock.map((item) => {
                      return (
                        <tr key={`${item.email}-${item.skuId}`} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <strong>{item.engineerName}</strong>
                            <br />
                            <span className="text-[10px] text-slate-400">{item.email}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">{item.skuId}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-900">{item.itemName}</td>
                          <td className="py-3 px-3 font-bold text-slate-900">{item.qty} units allocated</td>
                        </tr>
                      );
                    })}
                    {sortedVanStock.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-450">
                          No stocking holds recorded inside this vehicle truck.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'admin-pl') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-950 font-display">Executive P&L audit logs</h1>
            <p className="text-sm font-medium text-slate-400">Analyzes gross product margins contribution across regions</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={plMonthSelector}
              onChange={(e) => setPlMonthSelector(e.target.value)}
              className="rounded-xl border border-slate-205 bg-white px-3.5 py-2 text-xs font-bold text-slate-655 outline-none focus:border-indigo-650"
            >
              {uniqueLogMonths.map((m) => {
                const parts = m.split('-');
                const lbl = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
                return <option key={m} value={m}>{lbl}</option>;
              })}
            </select>

            <button
              onClick={downloadPLSummaryCSV}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-650 transition"
            >
              <Download className="h-4 w-4" /> Download P&L CSV
            </button>
            <button
              onClick={downloadDetailedAccSalesCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-650 transition"
            >
              <Download className="h-4 w-4" /> Accessories Sales CSV
            </button>
          </div>
        </div>

        {/* Business summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold tracking-wider text-slate-400 block mb-1">Gross Revenue</span>
            <span className="text-2xl font-black block text-indigo-750">{fmtCur(plRevenue)}</span>
          </div>

          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold tracking-wider text-slate-400 block mb-1">Payout Incentives</span>
            <span className="text-2xl font-black block text-amber-705">{fmtCur(plIncentives)}</span>
          </div>

          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold tracking-wider text-slate-400 block mb-1">Materials Cost (COGS)</span>
            <span className="text-2xl font-black block text-rose-650">{fmtCur(plCOGS)}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Weighted average cost</p>
          </div>

          <div className={`rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 ${plNetProfits >= 0 ? 'bg-emerald-50/20' : 'bg-rose-50/20'}`}>
            <span className="text-xs font-bold tracking-wider text-slate-400 block mb-1">Net Profit (P&L)</span>
            <span className={`text-2xl font-extrabold block ${plNetProfits >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {plNetProfits >= 0 ? '+' : ''}{fmtCur(plNetProfits)}
            </span>
          </div>
        </div>

        {/* Engineer margins breakdown */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm">
          <h2 className="font-display text-sm font-bold text-slate-905 mb-4 font-sans">Engineer-wise P&L Margin Contribution</h2>
          <div className="overflow-x-auto text-sm font-medium">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Engineer Profile</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Gross Sales</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Incentives</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Materials Cost</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 pb-2 flex justify-end">Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-705">
                {matrixEngineers.map((eng) => {
                  const engLogs = getLogHistoryForMonth(eng.email, plMonthSelector).filter(l => l.status === 'Approved');
                  const rev = engLogs.reduce((s, l) => s + l.accessories.reduce((sum, a) => sum + a.saleValue, 0), 0);
                  const inc = engLogs.reduce((s, l) => s + l.accessories.reduce((sum, a) => sum + (a.adminIncentive || 0), 0), 0);
                  const cogs = engLogs.reduce((s, l) => s + l.accessories.reduce((sum, a) => sum + (getSkuPurchaseUnitPrice(purchaseInward, inventory, a.skuId) * a.qty), 0), 0);
                  const profits = rev - inc - cogs;

                  return (
                    <tr key={eng.email} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3"><strong>{eng.name}</strong><br /><span className="text-[10px] text-slate-400">{eng.email}</span></td>
                      <td className="py-3 px-3">{fmtCur(rev)}</td>
                      <td className="py-3 px-3 text-rose-600 font-bold">{fmtCur(inc)}</td>
                      <td className="py-3 px-3 font-semibold text-slate-500">{fmtCur(cogs)}</td>
                      <td className={`py-3 px-3 text-right font-black ${profits >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {profits >= 0 ? '+' : ''}{fmtCur(profits)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit detailed list */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-950">Approved Accessories Sales Audit</h2>
              <p className="text-xs text-slate-400">Logs individual product dispatches recorded during service routes</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={plEngFilter}
                onChange={(e) => setPlEngFilter(e.target.value)}
                className="rounded-xl border border-slate-202 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-650 outline-none"
              >
                <option value="">All Roster Engineers</option>
                {[...new Set(allAccDetails.map(n => n.engineer))].sort().map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              <select
                value={plSkuFilter}
                onChange={(e) => setPlSkuFilter(e.target.value)}
                className="rounded-xl border border-slate-202 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-650 outline-none"
              >
                <option value="">All Cataloged SKUs</option>
                {[...new Set(allAccDetails.map(s => s.skuId))].sort().map((id) => (
                  <option key={id} value={id}>{id} – {getSku(skus, id).name}</option>
                ))}
              </select>

              <button
                onClick={downloadDetailedAccSalesCSV}
                className="rounded-xl border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Download Audits list Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto text-sm font-medium">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2 px-3 text-xs font-bold text-slate-450">Date</th>
                  <th className="py-2 px-3 text-xs font-bold text-slate-450">Engineer</th>
                  <th className="py-2 px-3 text-xs font-bold text-slate-450">Item Description</th>
                  <th className="py-2 px-3 text-xs font-bold text-slate-450">Sold Units</th>
                  <th className="py-2 px-3 text-xs font-bold text-slate-450" style={{ textAlign: 'right' }}>Invoice Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAccDetails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">No approved dispatches matching criteria.</td>
                  </tr>
                ) : (
                  filteredAccDetails.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-505">{fmtDate(item.date)}</td>
                      <td className="py-2.5 px-3"><strong>{item.engineer}</strong></td>
                      <td className="py-2.5 px-3">{item.skuName} <span className="font-mono text-xs text-indigo-750 bg-indigo-50 rounded px-1.5 py-0.5 ml-2 font-bold">{item.skuId}</span></td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{item.qty} units sold</td>
                      <td className="py-2.5 px-3 text-slate-900 font-bold text-right">{fmtCur(item.saleValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'admin-sku-registry') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950 font-sans">SKU Registry Directory</h1>
          <p className="text-sm font-medium text-slate-400">Introduce new product lines or adjust safety bounds alarm limits</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Creator form */}
          <div className="rounded-2xl border border-slate-205 bg-white p-5 shadow-sm">
            <h2 className="font-display text-sm font-bold text-slate-950 mb-4 font-sans">Catalog New SKU Code</h2>
            <form onSubmit={handleRegisterNewSku} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">SKU ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SKU-009"
                  value={skuIdInput}
                  onChange={(e) => setSkuIdInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-202 bg-white px-3.5 py-3 text-xs font-semibold focus:border-indigo-650 focus:ring-4 focus:ring-indigo-150 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Copper Pipe range"
                  value={skuNameInput}
                  onChange={(e) => setSkuNameInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-202 bg-white px-3.5 py-3 text-xs font-semibold focus:border-indigo-650 focus:ring-4 focus:ring-indigo-150 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Min Stock Level</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 20 (Alarms store coordinator once stocks are lower)"
                  value={skuAlertInput}
                  onChange={(e) => setSkuAlertInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-202 bg-white px-3.5 py-3 text-xs font-semibold focus:border-indigo-650 focus:ring-4 focus:ring-indigo-150 outline-none"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-slate-900 transition"
              >
                <Plus className="h-4.5 w-4.5" /> Catalog SKU Item
              </button>
            </form>
          </div>

          {/* Sku catalogue table lists */}
          <div className="rounded-2xl border border-slate-205 bg-white p-5 shadow-sm max-h-[500px] overflow-y-auto">
            <h2 className="font-display text-sm font-bold text-slate-905 mb-3.5 flex items-center justify-between">
              Active SKU Catalogue list
              <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded border font-semibold">{skus.length} elements</span>
            </h2>
            <div className="overflow-x-auto text-sm font-medium">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2 px-3 text-xs font-bold tracking-widest text-slate-400">SKU Code</th>
                    <th className="py-2 px-3 text-xs font-bold tracking-widest text-slate-400">Label Description</th>
                    <th className="py-2 px-3 text-xs font-bold tracking-widest text-slate-400">Safety Level Limit</th>
                    <th className="py-2 px-3 text-xs font-bold tracking-widest text-slate-400" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {skus.map((sku) => (
                    <tr key={sku.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3"><span className="font-mono text-xs font-bold text-indigo-750 bg-indigo-50 border border-indigo-150 rounded px-1.5 py-0.5">{sku.id}</span></td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{sku.name}</td>
                      <td className="py-3 px-3 text-slate-600">{sku.lowStockAlert} units alert</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => openSkuEditModal(sku)}
                          className="rounded p-1 text-slate-450 hover:bg-indigo-50 hover:text-indigo-650 border border-transparent hover:border-indigo-150 transition"
                        >
                          <Edit className="h-4 w-4 shrink-0" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'admin-lp-approvals') {
    return (
      <AdminLPApprovalsView
        lpRequests={lpRequests}
        users={users}
        onUpdateLpRequests={onUpdateLpRequests}
        onAddToast={onAddToast}
      />
    );
  }

  if (activeTab === 'admin-engineer-dashboard') {
    // 1. Get all line engineers
    const engineers = users.filter((u) => u.role === 'Engineer' && u.orgId === currentUser.orgId);

    // 2. Compute dynamic months from logs and attendance
    const uniqueMonths = Array.from(new Set([
      getMonthRange(0).prefix,
      getMonthRange(-1).prefix,
      ...productivityLogs.map(l => l.date.substring(0, 7)),
    ]))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

    const formatMonthLabel = (mPrefix: string) => {
      const parts = mPrefix.split('-');
      if (parts.length === 2) {
        const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        return dObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      }
      return mPrefix;
    };

    // 3. Process metrics for each engineer for the selected dashboard month
    const processedMetrics = engineers.map((eng) => {
      // Days Present in the select month
      const userAtt = attendance[eng.email] || {};
      const presentDays = Object.entries(userAtt)
        .filter(([date, status]) => date.startsWith(selectedDashboardMonth) && status === 'Present')
        .length;

      // Find APPROVED logs in that month for the engineer
      const engLogs = productivityLogs.filter(
        (l) => l.engEmail === eng.email && l.date.startsWith(selectedDashboardMonth) && l.status === 'Approved'
      );

      // Calls Closed
      const callsClosed = engLogs.reduce((acc, curr) => acc + (curr.callsClosed || 0), 0);

      // Revenue Generated (Accessory saleValue)
      const revenueGenerated = engLogs.reduce((sum, l) => 
        sum + l.accessories.reduce((acc, curr) => acc + (curr.saleValue || 0), 0), 0
      );

      // RCP Generated
      const rcpGenerated = engLogs.reduce((sum, l) => sum + (l.rcpCollected || 0), 0);

      // RCP Qty
      const rcpQty = engLogs.reduce((sum, l) => sum + (l.rcpQty || 0), 0);

      // Per Call Revenue formula indicates: (total revenue generated / Calls closed)
      const perCallRevenue = callsClosed > 0 ? (revenueGenerated / callsClosed) : 0;

      return {
        email: eng.email,
        name: eng.name,
        presentDays,
        callsClosed,
        revenueGenerated,
        rcpGenerated,
        rcpQty,
        perCallRevenue
      };
    });

    // 4. Filter by search query
    const unsortedFilteredMetrics = processedMetrics.filter(m => 
      m.name.toLowerCase().includes(engineerSearchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(engineerSearchQuery.toLowerCase())
    );

    const filteredMetrics = [...unsortedFilteredMetrics].sort((a, b) => {
      let comparison = 0;
      if (perfRosterSortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (perfRosterSortKey === 'present') {
        comparison = a.presentDays - b.presentDays;
      } else if (perfRosterSortKey === 'calls') {
        comparison = a.callsClosed - b.callsClosed;
      } else if (perfRosterSortKey === 'revenue') {
        comparison = a.revenueGenerated - b.revenueGenerated;
      } else if (perfRosterSortKey === 'rcpVal') {
        comparison = a.rcpGenerated - b.rcpGenerated;
      } else if (perfRosterSortKey === 'rcpQty') {
        comparison = a.rcpQty - b.rcpQty;
      } else if (perfRosterSortKey === 'perCall') {
        comparison = a.perCallRevenue - b.perCallRevenue;
      }
      return perfRosterSortAsc ? comparison : -comparison;
    });

    // 5. Aggregate overall metrics for the selected month
    const totalPresentDays = processedMetrics.reduce((sum, m) => sum + m.presentDays, 0);
    const totalCallsClosed = processedMetrics.reduce((sum, m) => sum + m.callsClosed, 0);
    const totalRevenueGenerated = processedMetrics.reduce((sum, m) => sum + m.revenueGenerated, 0);
    const totalRcpGenerated = processedMetrics.reduce((sum, m) => sum + m.rcpGenerated, 0);
    const overallPerCallRevenue = totalCallsClosed > 0 ? (totalRevenueGenerated / totalCallsClosed) : 0;

    return (
      <div className="space-y-6">
        {/* Header containing Page Title and Month selection option */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-950 font-sans">
              Engineer Performance Dashboard
            </h1>
            <p className="text-sm font-medium text-slate-400">
              Month-wise analytics, attendance tracking, and revenue-per-call metrics for line duty engineers
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Select Month:
            </span>
            <select
              value={selectedDashboardMonth}
              onChange={(e) => setSelectedDashboardMonth(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-705 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150 shadow-xs"
            >
              {uniqueMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Aggregate KPI Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/65 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-indigo-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Engineers
            </span>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">
                {processedMetrics.filter(m => m.callsClosed > 0 || m.presentDays > 0).length} / {engineers.length}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Logged activity this month</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/65 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-amber-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Days Present
            </span>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">
                {totalPresentDays} Days
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Cumulative attendance sum</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/65 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-sky-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Calls Closed
            </span>
            <div className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-sky-500 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">
                {totalCallsClosed}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Approved service calls</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/65 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-emerald-500 font-sans">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Revenue Generated
            </span>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">
                {fmtCur(totalRevenueGenerated)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Approved accessories sum</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/65 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-blue-600 font-sans">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total RCP Generated
            </span>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-550 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">
                {fmtCur(totalRcpGenerated)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Sum of approved RCP</p>
          </div>
        </div>

        {/* Main interactive Table Card */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="font-display text-base font-bold text-slate-950 font-sans">
                Engineer Performance Roster
              </h2>
              <p className="text-xs text-slate-400">
                Listing performances recorded during {formatMonthLabel(selectedDashboardMonth)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Roster Month Selection option */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  Month:
                </span>
                <select
                  value={selectedDashboardMonth}
                  onChange={(e) => setSelectedDashboardMonth(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-705 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150 shadow-xs"
                >
                  {uniqueMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Engineer Name Filter search field */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search engineer..."
                  value={engineerSearchQuery}
                  onChange={(e) => setEngineerSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
                />
                {engineerSearchQuery && (
                  <button
                    onClick={() => setEngineerSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 select-none">
                  <th
                    onClick={() => togglePerfRosterSort('name')}
                    className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Engineer Name{renderSortIndicator('name', perfRosterSortKey, perfRosterSortAsc)}
                  </th>
                  <th
                    onClick={() => togglePerfRosterSort('present')}
                    className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-400 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Days Present{renderSortIndicator('present', perfRosterSortKey, perfRosterSortAsc)}
                  </th>
                  <th
                    onClick={() => togglePerfRosterSort('calls')}
                    className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-400 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Calls Closed{renderSortIndicator('calls', perfRosterSortKey, perfRosterSortAsc)}
                  </th>
                  <th
                    onClick={() => togglePerfRosterSort('revenue')}
                    className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Revenue Generated{renderSortIndicator('revenue', perfRosterSortKey, perfRosterSortAsc)}
                  </th>
                  <th
                    onClick={() => togglePerfRosterSort('rcpVal')}
                    className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    RCP Generated{renderSortIndicator('rcpVal', perfRosterSortKey, perfRosterSortAsc)}
                  </th>
                  <th
                    onClick={() => togglePerfRosterSort('rcpQty')}
                    className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    RCP Qty{renderSortIndicator('rcpQty', perfRosterSortKey, perfRosterSortAsc)}
                  </th>
                  <th
                    onClick={() => togglePerfRosterSort('perCall')}
                    className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Per Call Revenue{renderSortIndicator('perCall', perfRosterSortKey, perfRosterSortAsc)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {filteredMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                      No engineers found with logged credentials.
                    </td>
                  </tr>
                ) : (
                  filteredMetrics.map((m) => (
                    <tr key={m.email} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-950">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase border border-indigo-100">
                            {m.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900">{m.name}</span>
                            <span className="block text-[10px] text-slate-400 font-medium">{m.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          {m.presentDays} Days
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {m.callsClosed}
                      </td>

                      <td className="py-3.5 px-4 text-slate-900 font-bold">
                        {fmtCur(m.revenueGenerated)}
                      </td>

                      <td className="py-3.5 px-4 text-indigo-700 font-bold">
                        {fmtCur(m.rcpGenerated)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-800 font-bold">
                        {m.rcpQty || 0}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="block font-bold text-slate-905">{fmtCur(m.perCallRevenue)}</span>
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                            Revenue / Call
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'admin-user-registry') {
    const activeStaffUsersTLSM = users.filter((u) => u.orgId === currentUser.orgId && (u.role === 'Team Leader' || u.role === 'Store Manager'));
    const activeStaffUsersEngs = users.filter((u) => u.orgId === currentUser.orgId && u.role === 'Engineer');

    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950 font-sans">Directory & Staff Registry</h1>
          <p className="text-sm font-medium text-slate-400">Manage user profile access scopes and credentials records</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Sku Creator */}
          <div className="rounded-2xl border border-slate-205 bg-white p-5 shadow-sm">
            <h2 className="font-display text-sm font-bold text-slate-950 mb-4 font-sans">Provision New user Profile</h2>
            <form onSubmit={handleRegisterNewUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Patil"
                  value={userNameInput}
                  onChange={(e) => setUserNameInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-202 bg-white px-3.5 py-3 text-xs font-semibold focus:border-indigo-650 focus:ring-4 focus:ring-indigo-150 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@company.com"
                  value={userEmailInput}
                  onChange={(e) => setUserEmailInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-202 bg-white px-3.5 py-3 text-xs font-semibold focus:border-indigo-650 focus:ring-4 focus:ring-indigo-150 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">User Role</label>
                <select
                  value={userRoleInput}
                  onChange={(e) => setUserRoleInput(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-202 bg-white px-3.5 py-3 text-xs font-semibold focus:border-indigo-650 outline-none"
                >
                  <option value="Engineer">Engineer (Field worker)</option>
                  <option value="Team Leader">Team Leader (Supervisor)</option>
                  <option value="Store Manager">Store Manager (Inventory Controller)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={userPasswordInput}
                    onChange={(e) => setUserPasswordInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-202 bg-white px-3.5 py-2.5 text-xs font-semibold focus:border-indigo-650 outline-none"
                  />
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="rounded-xl border border-slate-202 hover:border-indigo-600 hover:text-indigo-650 px-3.5 py-2.5 text-xs font-bold text-slate-650 flex items-center gap-1 shrink-0"
                    title="Generate safe dynamic passcode"
                  >
                    <Key className="h-4 w-4 shrink-0" /> Generate
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-slate-900 transition"
              >
                <Plus className="h-4.5 w-4.5" /> Provision Profile
              </button>
            </form>
          </div>

          {/* Supervisors list */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-205 bg-white p-5 shadow-sm space-y-3 max-h-[300px] overflow-y-auto">
              <h2 className="font-display text-sm font-bold text-slate-950">Supervisors & Controllers directory</h2>
              <div className="space-y-2.5 divide-y divide-slate-100 text-slate-700">
                {activeStaffUsersTLSM.map((tlsm) => (
                  <div key={tlsm.email} className="flex items-center justify-between pt-2.5 first:pt-0 text-xs font-semibold">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-indigo-650 text-[10px] font-black tracking-widest uppercase border border-slate-150">
                        {tlsm.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <span className="block font-bold text-slate-905">{tlsm.name}</span>
                        <span className="block text-[10px] text-slate-400 capitalize">{tlsm.role} – {tlsm.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openUserEditModal(tlsm)} className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-700"><Edit className="h-3.5 w-3.5 shrink-0" /></button>
                      <button onClick={() => openUserDeleteModal(tlsm.email)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash className="h-3.5 w-3.5 shrink-0" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Engineers dir listings */}
            <div className="rounded-2xl border border-slate-205 bg-white p-5 shadow-sm space-y-3 max-h-[300px] overflow-y-auto">
              <h2 className="font-display text-sm font-bold text-slate-950">Line duty Engineers Roster</h2>
              <div className="space-y-2.5 divide-y divide-slate-100 text-slate-700">
                {activeStaffUsersEngs.map((eng) => (
                  <div key={eng.email} className="flex items-center justify-between pt-2.5 first:pt-0 text-xs font-semibold">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-rose-650 text-[10px] font-black tracking-widest uppercase border border-slate-150">
                        {eng.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <span className="block font-bold text-slate-905">{eng.name}</span>
                        <span className="block text-[10px] text-slate-400">{eng.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openUserEditModal(eng)} className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-700"><Edit className="h-3.5 w-3.5 shrink-0" /></button>
                      <button onClick={() => openUserDeleteModal(eng.email)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash className="h-3.5 w-3.5 shrink-0" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback modal wrapper logic rendering in React
  return (
    <div className="text-center py-12 text-slate-400">Page coming soon.</div>
  );
}

export function AdminPages(props: AdminPagesProps) {
  // Generic Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState<React.ReactNode>(null);

  const triggerModal = (title: string, body: React.ReactNode) => {
    setModalTitle(title);
    setModalBody(body);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalBody(null);
  };

  return (
    <>
      <AdminPagesInner 
        {...props} 
        triggerModal={triggerModal} 
        closeModal={closeModal} 
      />

      {/* Global Generic Modal rendering within React DOM portal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <span className="font-display text-base font-bold text-slate-950 capitalize">{modalTitle}</span>
              <button onClick={closeModal} className="rounded p-1 text-slate-400 hover:bg-slate-100 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>{modalBody}</div>
          </div>
        </div>
      )}
    </>
  );
}

interface AdminLPApprovalsViewProps {
  lpRequests: LPRequest[];
  users: User[];
  onUpdateLpRequests: (requests: LPRequest[]) => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
}

function AdminLPApprovalsView({ lpRequests, users, onUpdateLpRequests, onAddToast }: AdminLPApprovalsViewProps) {
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('');
  const [exportStatus, setExportStatus] = useState('all');
  const [processingLpIds, setProcessingLpIds] = useState<string[]>([]);

  const [ledgerSortKey, setLedgerSortKey] = useState<'id' | 'job' | 'supervisor' | 'date' | 'spares' | 'services' | 'total' | 'status'>('id');
  const [ledgerSortAsc, setLedgerSortAsc] = useState<boolean>(true);

  const toggleLedgerSort = (key: 'id' | 'job' | 'supervisor' | 'date' | 'spares' | 'services' | 'total' | 'status') => {
    if (ledgerSortKey === key) {
      setLedgerSortAsc(!ledgerSortAsc);
    } else {
      setLedgerSortKey(key);
      setLedgerSortAsc(true);
    }
  };

  const renderSortIndicator = (currentKey: string, activeKey: string, ascending: boolean) => {
    if (activeKey === currentKey) {
      return ascending ? ' ▲' : ' ▼';
    }
    return '';
  };

  // Action Handlers with simulated 1000ms delay & Concurrency guards
  const handleApproveLp = (id: string) => {
    if (processingLpIds.includes(id)) return;
    setProcessingLpIds((prev) => [...prev, id]);

    setTimeout(() => {
      const updated = lpRequests.map((lp) => {
        if (lp.id === id) return { ...lp, status: 'Claim pending' as const };
        return lp;
      });
      onUpdateLpRequests(updated);
      onAddToast(`LP Request ${id} approved! Moved to Claim pending.`, 'success');
      setProcessingLpIds((prev) => prev.filter((x) => x !== id));
    }, 1000);
  };

  const handleRejectLp = (id: string) => {
    if (processingLpIds.includes(id)) return;
    setProcessingLpIds((prev) => [...prev, id]);

    setTimeout(() => {
      const updated = lpRequests.map((lp) => {
        if (lp.id === id) return { ...lp, status: 'Rejected' as const };
        return lp;
      });
      onUpdateLpRequests(updated);
      onAddToast(`LP Request ${id} rejected.`, 'success');
      setProcessingLpIds((prev) => prev.filter((x) => x !== id));
    }, 1000);
  };

  const handleApproveClaim = (id: string) => {
    if (processingLpIds.includes(id)) return;
    setProcessingLpIds((prev) => [...prev, id]);

    setTimeout(() => {
      const updated = lpRequests.map((lp) => {
        if (lp.id === id) return { ...lp, status: 'Claim approved' as const };
        return lp;
      });
      onUpdateLpRequests(updated);
      onAddToast(`Claim ${id} released and fully authorized!`, 'success');
      setProcessingLpIds((prev) => prev.filter((x) => x !== id));
    }, 1000);
  };

  const handleRejectClaim = (id: string) => {
    if (processingLpIds.includes(id)) return;
    setProcessingLpIds((prev) => [...prev, id]);

    setTimeout(() => {
      const updated = lpRequests.map((lp) => {
        if (lp.id === id) return { ...lp, status: 'Claim pending' as const };
        return lp;
      });
      onUpdateLpRequests(updated);
      onAddToast(`Claim ${id} rejected and returned back to supervisor queue.`, 'success');
      setProcessingLpIds((prev) => prev.filter((x) => x !== id));
    }, 1000);
  };

  // Date range verification helper
  const isWithinDateRange = (dateStr: string) => {
    if (!dateStr) return true;
    if (startDateFilter && dateStr < startDateFilter) return false;
    if (endDateFilter && dateStr > endDateFilter) return false;
    return true;
  };

  // Filtered dataset subsets based on date selection
  const activeLpRequests = (lpRequests || []).filter((lp) => isWithinDateRange(lp.date));

  // Financial claims calculations (scoped to active date selections)
  const pendingClaimsItems = activeLpRequests.filter((lp) =>
    ['Claim pending', 'Claim submitted', 'Claim forwarded'].includes(lp.status)
  );
  const totalPendingAmount = pendingClaimsItems.reduce((sum, lp) => sum + lp.spareCost + lp.serviceCost, 0);

  const approvedClaimsItems = activeLpRequests.filter((lp) => lp.status === 'Claim approved');
  const totalApprovedAmount = approvedClaimsItems.reduce((sum, lp) => sum + lp.spareCost + lp.serviceCost, 0);

  // Queue records: Pending LP and Claims Forwarded
  const actionQueue = activeLpRequests.filter((lp) =>
    lp.status === 'Pending' || lp.status === 'Claim forwarded'
  ).sort((a, b) => a.date.localeCompare(b.date));

  // Ledger records: Processed/Historical entries (everything outside active queue)
  const unsortedLedgerRecords = activeLpRequests.filter((lp) =>
    lp.status !== 'Pending' && lp.status !== 'Claim forwarded'
  ).filter((lp) => {
    // Status filter
    if (ledgerStatusFilter && lp.status !== ledgerStatusFilter) return false;

    // Live text search
    if (ledgerSearch.trim()) {
      const query = ledgerSearch.toLowerCase();
      const sup = getUser(users, lp.tlEmail);
      return (
        lp.jobId.toLowerCase().includes(query) ||
        lp.id.toLowerCase().includes(query) ||
        sup.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const ledgerRecords = [...unsortedLedgerRecords].sort((a, b) => {
    let comparison = 0;
    const supA = getUser(users, a.tlEmail);
    const supB = getUser(users, b.tlEmail);

    if (ledgerSortKey === 'id') {
      comparison = a.id.localeCompare(b.id);
    } else if (ledgerSortKey === 'job') {
      comparison = a.jobId.localeCompare(b.jobId);
    } else if (ledgerSortKey === 'supervisor') {
      comparison = supA.name.localeCompare(supB.name);
    } else if (ledgerSortKey === 'date') {
      comparison = a.date.localeCompare(b.date);
    } else if (ledgerSortKey === 'spares') {
      comparison = a.spareCost - b.spareCost;
    } else if (ledgerSortKey === 'services') {
      comparison = a.serviceCost - b.serviceCost;
    } else if (ledgerSortKey === 'total') {
      comparison = (a.spareCost + a.serviceCost) - (b.spareCost + b.serviceCost);
    } else if (ledgerSortKey === 'status') {
      comparison = a.status.localeCompare(b.status);
    }

    return ledgerSortAsc ? comparison : -comparison;
  });

  // Target CSV exporter (scoped by date range and selected status)
  const handleDownloadCSV = () => {
    const dataToExport = activeLpRequests.filter((lp) => {
      if (exportStatus !== 'all' && lp.status !== exportStatus) return false;
      return true;
    });

    const header = ['LP Request ID', 'Job ID', 'Supervisor Name', 'Supervisor Email', 'Date Raised', 'Spare Cost (INR)', 'Service Cost (INR)', 'Total Cost (INR)', 'Status'];
    const rows = dataToExport.map((lp) => {
      const u = getUser(users, lp.tlEmail);
      const total = lp.spareCost + lp.serviceCost;
      return [lp.id, lp.jobId, u.name, lp.tlEmail, lp.date, lp.spareCost, lp.serviceCost, total, lp.status];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    
    const statusLabel = exportStatus.replace(/\s+/g, '_');
    const dateLabel = startDateFilter || endDateFilter ? `_${startDateFilter || 'start'}_to_${endDateFilter || 'end'}` : '';
    link.setAttribute('download', `lp_report_${statusLabel}${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast(`LP Approvals CSV report downloaded successfully!`);
  };

  return (
    <div className="space-y-6">
      {/* Header section with exporting controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">Local Purchase Approvals</h1>
          <p className="text-sm font-medium text-slate-400">Review and authorize on-site spare and services logs</p>
        </div>

        {/* CSV Exporter widget */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border border-slate-200/60 rounded-2xl">
          <select
            value={exportStatus}
            onChange={(e) => setExportStatus(e.target.value)}
            className="rounded-xl border border-slate-205 bg-white px-3 py-2 text-xs font-bold text-slate-655 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending LP</option>
            <option value="Claim pending">Claim pending</option>
            <option value="Claim submitted">Claim submitted</option>
            <option value="Claim forwarded">Claim forwarded</option>
            <option value="Claim approved">Claim approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 shadow-sm transition"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Financial Claims Summary Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-xs space-y-1">
          <span className="text-xs font-bold tracking-wider text-indigo-500 uppercase block">Total Claim Pending Amount</span>
          <div className="text-2xl font-black text-indigo-900">{fmtCur(totalPendingAmount)}</div>
          <p className="text-xs text-indigo-400 font-semibold">{pendingClaimsItems.length} transactions pending validation</p>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5 shadow-xs space-y-1">
          <span className="text-xs font-bold tracking-wider text-teal-600 uppercase block">Total Claim Approved Amount</span>
          <div className="text-2xl font-black text-teal-900">{fmtCur(totalApprovedAmount)}</div>
          <p className="text-xs text-teal-505 font-semibold">{approvedClaimsItems.length} claims fully authorized</p>
        </div>
      </div>

      {/* Date Period Filter Panel */}
      <div className="rounded-2xl border border-slate-200/50 bg-white p-4 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
          <div className="flex flex-col gap-1.5">
            <span>Start Date</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-800 outline-none font-sans focus:border-indigo-650"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span>End Date</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-800 outline-none font-sans focus:border-indigo-650"
            />
          </div>
        </div>

        {/* Active Range Clear Notification Bar */}
        {(startDateFilter || endDateFilter) && (
          <div className="rounded-xl border border-indigo-150 bg-indigo-50/40 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs font-bold text-indigo-950 animate-fade-in">
            <span>
              Active Filter Scoped: {startDateFilter ? fmtDate(startDateFilter) : 'Start'} to {endDateFilter ? fmtDate(endDateFilter) : 'End'}
            </span>
            <button
              onClick={() => {
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="text-indigo-600 hover:text-indigo-855 underline font-extrabold cursor-pointer"
            >
              Clear Filter Range
            </button>
          </div>
        )}
      </div>

      {/* Action Required Queue Section */}
      <div className="space-y-4">
        <h2 className="font-display text-base font-extrabold text-slate-900">Approval Queue (Action Required)</h2>

        {actionQueue.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-100 mb-2" />
            <h3 className="font-bold text-slate-900 text-lg">Action Queue Empty!</h3>
            <p className="text-sm mt-1 font-semibold">Every submitted local purchase request or claim has been reconciled.</p>
          </div>
        ) : (
          actionQueue.map((lp) => {
            const requester = getUser(users, lp.tlEmail);
            const total = lp.spareCost + lp.serviceCost;
            const isProcessing = processingLpIds.includes(lp.id);
            const isLpType = lp.status === 'Pending';

            return (
              <div
                key={lp.id}
                className={`rounded-2xl bg-white p-5 shadow-sm space-y-4 transition-all ${
                  isLpType
                    ? 'border border-amber-200 border-l-4 border-l-amber-500'
                    : 'border border-blue-200 border-l-4 border-l-blue-500'
                } ${isProcessing ? 'opacity-70 pointer-events-none bg-slate-50' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-950">Job ID: {lp.jobId}</span>
                      <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 border border-slate-155 rounded px-2 py-0.5">{lp.id}</span>
                    </div>
                    {lp.description && (
                      <div className="text-xs bg-slate-50 border border-slate-150 p-2.5 rounded-xl font-semibold text-slate-700 mt-1.5 max-w bg-indigo-50/5 text-slate-650">
                        <strong>Description:</strong> "{lp.description}"
                      </div>
                    )}
                    <div className="text-xs font-bold text-indigo-650 mt-1">
                      Raised by: {requester.name} ({lp.tlEmail}) on {fmtDate(lp.date)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 self-start shrink-0">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
                      isLpType
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-blue-50 border-blue-205 text-blue-805'
                    }`}>
                      {isLpType ? 'Pending LP Approval' : 'Claim Forwarded'}
                    </span>
                    {isProcessing && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-700 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white animate-pulse">
                        Processing...
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 font-semibold text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Spare Cost</div>
                    <div className="text-sm font-extrabold text-slate-800">{fmtCur(lp.spareCost)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Service Cost</div>
                    <div className="text-sm font-extrabold text-slate-800">{fmtCur(lp.serviceCost)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Purchase Value</div>
                    <div className="text-sm font-black text-indigo-600">{fmtCur(total)}</div>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5">
                  <button
                    disabled={isProcessing}
                    onClick={() => (isLpType ? handleRejectLp(lp.id) : handleRejectClaim(lp.id))}
                    className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 px-4.5 py-2.5 text-xs font-bold transition disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => (isLpType ? handleApproveLp(lp.id) : handleApproveClaim(lp.id))}
                    className="rounded-xl bg-indigo-600 text-white hover:bg-slate-900 px-4.5 py-2.5 text-xs font-bold transition shadow-sm shadow-indigo-600/10 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : isLpType ? 'Approve Local Purchase' : 'Approve & Release Claim'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Processed Records Ledger Table */}
      <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-base font-extrabold text-slate-955">Processed Records Ledger</h2>
            <p className="text-xs text-slate-400">Audit history and transaction tracking for settled purchases and claims</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Job, Request ID, or Supervisor..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs font-semibold text-slate-655 outline-none focus:border-indigo-650 w-64"
              />
            </div>

            <select
              value={ledgerStatusFilter}
              onChange={(e) => setLedgerStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-600 outline-none"
            >
              <option value="">All Processed Statuses</option>
              <option value="Claim pending">Claim pending</option>
              <option value="Claim submitted">Claim submitted</option>
              <option value="Claim approved">Claim approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto text-xs font-medium">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 select-none">
                <th
                  onClick={() => toggleLedgerSort('id')}
                  className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  ID{renderSortIndicator('id', ledgerSortKey, ledgerSortAsc)}
                </th>
                <th
                  onClick={() => toggleLedgerSort('job')}
                  className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Job ID{renderSortIndicator('job', ledgerSortKey, ledgerSortAsc)}
                </th>
                <th
                  onClick={() => toggleLedgerSort('supervisor')}
                  className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Supervisor{renderSortIndicator('supervisor', ledgerSortKey, ledgerSortAsc)}
                </th>
                <th
                  onClick={() => toggleLedgerSort('date')}
                  className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Date Raised{renderSortIndicator('date', ledgerSortKey, ledgerSortAsc)}
                </th>
                <th
                  onClick={() => toggleLedgerSort('spares')}
                  className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Spares{renderSortIndicator('spares', ledgerSortKey, ledgerSortAsc)}
                </th>
                <th
                  onClick={() => toggleLedgerSort('services')}
                  className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Services{renderSortIndicator('services', ledgerSortKey, ledgerSortAsc)}
                </th>
                <th
                  onClick={() => toggleLedgerSort('total')}
                  className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Total Value{renderSortIndicator('total', ledgerSortKey, ledgerSortAsc)}
                </th>
                <th
                  onClick={() => toggleLedgerSort('status')}
                  className="py-2.5 px-3 text-[10px] font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Status{renderSortIndicator('status', ledgerSortKey, ledgerSortAsc)}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {ledgerRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400 bg-slate-50/10 rounded-lg">
                    No ledger records match filters selected.
                  </td>
                </tr>
              ) : (
                ledgerRecords.map((lp) => {
                  const total = lp.spareCost + lp.serviceCost;
                  const supervisor = getUser(users, lp.tlEmail);
                  return (
                    <tr key={lp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-650 bg-slate-105 px-2 py-0.5 rounded border border-slate-150">
                          {lp.id}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-955 font-bold">{lp.jobId}</div>
                        {lp.description && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5 max-w-xs truncate" title={lp.description}>
                            {lp.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold">{supervisor.name}</td>
                      <td className="py-3 px-3 text-slate-500">{fmtDate(lp.date)}</td>
                      <td className="py-3 px-3 text-slate-600">{fmtCur(lp.spareCost)}</td>
                      <td className="py-3 px-3 text-slate-600">{fmtCur(lp.serviceCost)}</td>
                      <td className="py-3 px-3 text-indigo-650 font-bold">{fmtCur(total)}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide border ${
                            lp.status === 'Claim pending'
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : lp.status === 'Claim submitted'
                              ? 'bg-violet-50 border-violet-200 text-violet-805'
                              : lp.status === 'Claim approved'
                              ? 'bg-teal-50 border-teal-250 text-teal-800'
                              : lp.status === 'Rejected'
                              ? 'bg-rose-50 border-rose-200 text-rose-800'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          {lp.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Standalone Modal Sub-Components to avoid nested definitions focus loss

interface SkuEditModalBodyProps {
  sku: SKU;
  onSave: (skuId: string, name: string, alert: string) => void;
  onClose: () => void;
}

function SkuEditModalBody({ sku, onSave, onClose }: SkuEditModalBodyProps) {
  const [n, setN] = useState(sku.name);
  const [a, setA] = useState(String(sku.lowStockAlert));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">SKU Code</label>
        <input type="text" className="w-full rounded-xl bg-slate-150 text-slate-500 font-mono text-sm px-3.5 py-2 hover:cursor-not-allowed" value={sku.id} disabled />
      </div>
      <div>
        <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Item Description</label>
        <input type="text" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600" value={n} onChange={(e) => setN(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Min Stock Level</label>
        <input type="number" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600" value={a} onChange={(e) => setA(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2.5 pt-4">
        <button key="btn-cancel" onClick={onClose} className="rounded-lg border border-slate-200 font-semibold px-4 py-2 text-xs">Cancel</button>
        <button key="btn-save" onClick={() => onSave(sku.id, n, a)} className="rounded-lg bg-indigo-600 font-semibold px-4 py-2 text-xs text-white">Save Changes</button>
      </div>
    </div>
  );
}

interface UserEditModalBodyProps {
  user: User;
  onSave: (oldEmail: string, name: string, role: string, pass: string) => void;
  onClose: () => void;
}

function UserEditModalBody({ user, onSave, onClose }: UserEditModalBodyProps) {
  const [n, setN] = useState(user.name);
  const [r, setR] = useState(user.role);
  const [p, setP] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Email</label>
        <input type="text" className="w-full rounded-xl bg-slate-150 text-slate-500 font-sans text-sm px-3.5 py-2 hover:cursor-not-allowed" value={user.email} disabled />
      </div>
      <div>
        <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Full Name</label>
        <input type="text" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600" value={n} onChange={(e) => setN(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Role</label>
        <select className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600" value={r} onChange={(e) => setR(e.target.value as any)}>
          <option value="Engineer">Engineer</option>
          <option value="Team Leader">Team Leader</option>
          <option value="Store Manager">Store Manager</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">New Password (leave blank to retain "{user.password}")</label>
        <input type="text" placeholder="Set new passcode..." className="w-full rounded-xl border border-slate-250 bg-white p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600" value={p} onChange={(e) => setP(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2.5 pt-4">
        <button onClick={onClose} className="rounded-lg border border-slate-200 font-semibold px-4 py-2 text-xs">Cancel</button>
        <button onClick={() => onSave(user.email, n, r, p)} className="rounded-lg bg-indigo-600 font-semibold px-4 py-2 text-xs text-white">Save changes</button>
      </div>
    </div>
  );
}
