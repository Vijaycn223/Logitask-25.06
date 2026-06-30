/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, SKU, InventoryItem, StockRequest, PurchaseInward, LPRequest, ProductivityLog, AttendanceRequest, AttendanceRecord, ReturnRequest, EngineerStock } from '../types';
import { getSku, getInvItem, getUser, fmtDate, fmtCur, genId, getMonthRange } from '../utils';
import {
  Boxes,
  Truck,
  Inbox,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  Trash,
  Plus,
  Send,
  Loader,
  RefreshCcw,
  Check,
  FileSpreadsheet,
  Download,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  Clock,
  ArrowRight,
  Calendar,
  ListRestart,
  Search,
  Tag,
  RotateCcw,
  Layers
} from 'lucide-react';


interface StoreManagerPagesProps {
  currentUser: User;
  users: User[];
  skus: SKU[];
  inventory: InventoryItem[];
  engineerStock: EngineerStock;
  stockRequests: StockRequest[];
  purchaseInward: PurchaseInward[];
  activeTab: string;
  lpRequests: LPRequest[];
  productivityLogs: ProductivityLog[];
  attendanceRequests: AttendanceRequest[];
  attendance?: AttendanceRecord;
  returnRequests?: ReturnRequest[];
  onAddAttendanceRequest: (req: AttendanceRequest) => void;
  onUpdateAttendanceRequests: (reqs: AttendanceRequest[]) => void;
  onUpdateLogs: (l: ProductivityLog[]) => void;
  onUpdateLpRequests: (lp: LPRequest[]) => void;
  onAddPurchaseInward: (pi: PurchaseInward) => void;
  onUpdatePurchaseInward?: (pi: PurchaseInward[]) => void;
  onApproveStockRequest: (id: string, status: 'Approved' | 'Rejected') => void;
  onSubmitRevoke: (reqId: string) => void;
  onProcessReturnRequest: (id: string, status: 'Approved' | 'Rejected') => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
  onUpdateSkus: (skus: SKU[]) => void;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}

export function StoreManagerPages({
  currentUser,
  users,
  skus,
  inventory,
  engineerStock = {},
  stockRequests,
  purchaseInward,
  activeTab,
  lpRequests,
  productivityLogs,
  attendanceRequests = [],
  attendance = {},
  returnRequests = [],
  onAddAttendanceRequest,
  onUpdateAttendanceRequests,
  onUpdateLogs,
  onUpdateLpRequests,
  onAddPurchaseInward,
  onUpdatePurchaseInward,
  onApproveStockRequest,
  onSubmitRevoke,
  onProcessReturnRequest,
  onAddToast,
  onUpdateSkus,
  onUpdateInventory,
}: StoreManagerPagesProps) {
  // Store Manager Approvals Local Tab State
  const [smQueueTab, setSmQueueTab] = useState<'pending' | 'done'>('pending');
  const [smNotes, setSmNotes] = useState<Record<string, string>>({});
  const [processingStockRequestIds, setProcessingStockRequestIds] = useState<string[]>([]);
  const [processingProductivityIds, setProcessingProductivityIds] = useState<string[]>([]);

  // Inventory tab subplots and sorting states
  const [activeInventoryTab, setActiveInventoryTab] = useState<'warehouse' | 'engineer'>('warehouse');
  const [invEngStockSelector, setInvEngStockSelector] = useState('');
  const [invSkuStockSelector, setInvSkuStockSelector] = useState('');
  
  const [vanStockSortKey, setVanStockSortKey] = useState<'name' | 'sku' | 'description' | 'qty' | 'value'>('name');
  const [vanStockSortAsc, setVanStockSortAsc] = useState<boolean>(true);

  const toggleVanStockSort = (key: 'name' | 'sku' | 'description' | 'qty' | 'value') => {
    if (vanStockSortKey === key) {
      setVanStockSortAsc(!vanStockSortAsc);
    } else {
      setVanStockSortKey(key);
      setVanStockSortAsc(true);
    }
  };

  const renderSortIndicator = (currentKey: string, activeKey: string, ascending: boolean) => {
    if (activeKey === currentKey) {
      return ascending ? ' ▲' : ' ▼';
    }
    return '';
  };

  // SKU Registry State
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

  const handleSMApproveStockRequest = (id: string, status: 'Approved' | 'Rejected') => {
    if (processingStockRequestIds.includes(id)) return;
    setProcessingStockRequestIds((prev) => [...prev, id]);

    setTimeout(() => {
      onApproveStockRequest(id, status);
      setProcessingStockRequestIds((prev) => prev.filter((x) => x !== id));
    }, 1000);
  };

  // Search and filter states for SM Validation Queue
  const [smSearchQuery, setSmSearchQuery] = useState('');
  const [smSelectedEng, setSmSelectedEng] = useState('');
  const [smSelectedStatus, setSmSelectedStatus] = useState('');

  // Attendance marking form state
  const [smAttEngEmail, setSmAttEngEmail] = useState('');
  const [smAttDate, setSmAttDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [smAttStatus, setSmAttStatus] = useState<'Present' | 'Leave'>('Present');
  const [smAttRemarks, setSmAttRemarks] = useState('');

  const engineers = users.filter((u) => u.role === 'Engineer');

  const smPendingList = productivityLogs.filter((l) => l.status === 'Validated by TL').sort((a, b) => a.date.localeCompare(b.date));
  const smDoneList = productivityLogs.filter((l) => l.status === 'Validated by SM' || l.status === 'Approved' || l.status === 'Rejected').sort((a, b) => b.date.localeCompare(a.date));

  const filteredSmPendingList = smPendingList.filter((l) => {
    const engineer = getUser(users, l.engEmail);
    const matchesSearch =
      l.id.toLowerCase().includes(smSearchQuery.toLowerCase()) ||
      engineer.name.toLowerCase().includes(smSearchQuery.toLowerCase()) ||
      l.engEmail.toLowerCase().includes(smSearchQuery.toLowerCase()) ||
      l.date.toLowerCase().includes(smSearchQuery.toLowerCase());
    
    const matchesEng = !smSelectedEng || l.engEmail === smSelectedEng;
    return matchesSearch && matchesEng;
  });

  const filteredSmDoneList = smDoneList.filter((l) => {
    const engineer = getUser(users, l.engEmail);
    const matchesSearch =
      l.id.toLowerCase().includes(smSearchQuery.toLowerCase()) ||
      engineer.name.toLowerCase().includes(smSearchQuery.toLowerCase()) ||
      l.engEmail.toLowerCase().includes(smSearchQuery.toLowerCase()) ||
      l.date.toLowerCase().includes(smSearchQuery.toLowerCase());
    
    const matchesEng = !smSelectedEng || l.engEmail === smSelectedEng;
    const matchesStatus = !smSelectedStatus || l.status === smSelectedStatus;
    return matchesSearch && matchesEng && matchesStatus;
  });

  const handleSMAction = (logId: string, action: 'Validated by SM' | 'Rejected') => {
    const note = smNotes[logId] || '';
    if (processingProductivityIds.includes(logId)) return;
    setProcessingProductivityIds((prev) => [...prev, logId]);

    setTimeout(() => {
      const updated = productivityLogs.map(l => {
        if (l.id === logId) {
          return {
            ...l,
            status: action,
            adminNote: note,
          };
        }
        return l;
      });
      onUpdateLogs(updated);
      onAddToast(action === 'Validated by SM' ? 'Entry successfully validated and forwarded to Admin!' : 'Log rejected and sent back to Engineer.', 'success');
      setSmNotes(prev => {
        const copy = { ...prev };
        delete copy[logId];
        return copy;
      });
      setProcessingProductivityIds((prev) => prev.filter((id) => id !== logId));
    }, 1000);
  };

  // Stat calculations
  const pendingRequests = stockRequests.filter((r) => r.status === 'Pending');
  const pendingInward = purchaseInward.filter((p) => p.status === 'Pending');
  const lowStockItems = inventory.filter((i) => i.qty <= getSku(skus, i.skuId).lowStockAlert);
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  // Stock Inward Form State
  const [inwardSku, setInwardSku] = useState(skus[0]?.id || '');
  const [inwardQty, setInwardQty] = useState('');
  const [inwardPrice, setInwardPrice] = useState('');
  const [inwardVendor, setInwardVendor] = useState('');
  const [inwardInv, setInwardInv] = useState('');
  const [inwardDate, setInwardDate] = useState(new Date().toISOString().split('T')[0]);

  // Stock Inward Filter State (the rich requested features)
  const [piVendorFilter, setPiVendorFilter] = useState('');
  const [piStatusFilter, setPiStatusFilter] = useState('');
  const [piFromDateFilter, setPiFromDateFilter] = useState('');
  const [piToDateFilter, setPiToDateFilter] = useState('');

  // Stock Request Tab State
  const [srActiveTab, setSrActiveTab] = useState<'pending' | 'processed' | 'returns'>('pending');

  // Search and filter states for Stock Requests
  const [srSearchQuery, setSrSearchQuery] = useState('');
  const [srSelectedEng, setSrSelectedEng] = useState('');
  const [srSelectedSku, setSrSelectedSku] = useState('');
  const [srSelectedStatus, setSrSelectedStatus] = useState('');

  const processedRequests = stockRequests.filter((r) => r.status !== 'Pending');

  const filteredPendingRequests = pendingRequests.filter((r) => {
    const engineer = getUser(users, r.engEmail);
    const item = getSku(skus, r.skuId);
    const matchesSearch =
      r.id.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      engineer.name.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      r.engEmail.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      r.skuId.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      r.date.toLowerCase().includes(srSearchQuery.toLowerCase());
    
    const matchesEng = !srSelectedEng || r.engEmail === srSelectedEng;
    const matchesSku = !srSelectedSku || r.skuId === srSelectedSku;
    return matchesSearch && matchesEng && matchesSku;
  });

  const filteredReturnRequests = (returnRequests || []).filter((r) => {
    const engineer = getUser(users, r.engEmail);
    const item = getSku(skus, r.skuId);
    const matchesSearch =
      r.id.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      engineer.name.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      r.engEmail.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      r.skuId.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      r.date.toLowerCase().includes(srSearchQuery.toLowerCase());
    
    const matchesEng = !srSelectedEng || r.engEmail === srSelectedEng;
    const matchesSku = !srSelectedSku || r.skuId === srSelectedSku;
    return matchesSearch && matchesEng && matchesSku;
  });

  const filteredProcessedRequests = processedRequests.filter((r) => {
    const engineer = getUser(users, r.engEmail);
    const item = getSku(skus, r.skuId);
    const matchesSearch =
      r.id.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      engineer.name.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      r.engEmail.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      r.skuId.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(srSearchQuery.toLowerCase()) ||
      r.date.toLowerCase().includes(srSearchQuery.toLowerCase());
    
    const matchesEng = !srSelectedEng || r.engEmail === srSelectedEng;
    const matchesSku = !srSelectedSku || r.skuId === srSelectedSku;
    const matchesStatus = !srSelectedStatus || r.status === srSelectedStatus;
    return matchesSearch && matchesEng && matchesSku && matchesStatus;
  });

  // Supplier options for filter dropdown
  const suppliers = [...new Set(purchaseInward.map((p) => p.vendor).filter(Boolean))].sort();

  // Stock Inward filtering statistics
  const getFilteredInwards = () => {
    return purchaseInward.filter((p) => {
      const matchVendor = !piVendorFilter || p.vendor === piVendorFilter;
      const matchStatus = !piStatusFilter || p.status === piStatusFilter;
      const matchFromDate = !piFromDateFilter || p.date >= piFromDateFilter;
      const matchToDate = !piToDateFilter || p.date <= piToDateFilter;
      return matchVendor && matchStatus && matchFromDate && matchToDate;
    });
  };

  const filteredInwards = getFilteredInwards();
  const summaryQtyTotal = filteredInwards.reduce((s, p) => s + p.qty, 0);
  const summaryValTotal = filteredInwards.reduce((s, p) => s + p.qty * p.unitPrice, 0);

  const handleInwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(inwardQty, 10);
    const price = parseFloat(inwardPrice);

    if (isNaN(qty) || qty <= 0) {
      onAddToast('Please enter a valid quantity', 'error');
      return;
    }
    if (isNaN(price) || price < 0) {
      onAddToast('Please enter a valid unit price', 'error');
      return;
    }
    if (!inwardVendor.trim()) {
      onAddToast('Please enter supplier name', 'error');
      return;
    }

    const newInward: PurchaseInward = {
      id: genId('PI'),
      skuId: inwardSku,
      qty,
      unitPrice: price,
      date: inwardDate,
      vendor: inwardVendor.trim(),
      invoiceNo: inwardInv.trim() || 'N/A',
      status: 'Pending', // Awaiting Admin sanction
    };

    onAddPurchaseInward(newInward);
    setInwardQty('');
    setInwardPrice('');
    setInwardVendor('');
    setInwardInv('');
    onAddToast('Purchase entry submitted to Admin office!');
  };

  const downloadInwardCSV = () => {
    const header = ['Entry ID', 'Date', 'SKU ID', 'Item Name', 'Qty', 'Unit Price', 'Total Invoice Value', 'Vendor Supplier', 'Invoice No', 'Status'];
    const rows = filteredInwards.map((p) => {
      const sk = getSku(skus, p.skuId);
      return [p.id, p.date, p.skuId, sk.name, p.qty, p.unitPrice, p.qty * p.unitPrice, p.vendor, p.invoiceNo, p.status];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `purchase_inward_report_${piVendorFilter || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Purchase Inward CSV downloaded!');
  };

  const downloadStoreInventoryCSV = () => {
    const header = ['SKU ID', 'Item Name', 'Warehouse Stock Qty', 'Low Stock Alert Threshold', 'Avg Cost per unit', 'Cumulative Capital Value', 'Threshold Status'];
    const rows = inventory.map((i) => {
      const sk = getSku(skus, i.skuId);
      const isLow = i.qty <= sk.lowStockAlert;
      return [i.skuId, sk.name, i.qty, sk.lowStockAlert, i.unitPrice, i.qty * i.unitPrice, isLow ? 'LOW STOCK ALERT' : 'SAFETY OK'];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'store_inventory_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Inventory report downloaded!');
  };

  if (activeTab === 'store-dashboard') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">Store Dashboard</h1>
          <p className="text-sm font-medium text-slate-400">Warehouse inventory levels, inbound supplies, and allocations status</p>
        </div>

        {/* Highlight Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Stock Requests</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-extrabold ${pendingRequests.length > 0 ? 'text-indigo-650' : 'text-slate-950'}`}>
                {pendingRequests.length} Pending
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Van allocations awaiting release</p>
          </div>

          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Purchase Inward</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-slate-950">{pendingInward.length} unapproved</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Pending Admin reconciliation</p>
          </div>

          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Alert SKU Lines</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-extrabold ${lowStockItems.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {lowStockItems.length} Low
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Below safety thresholds</p>
          </div>

          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Asset Capital Valuation</span>
            <div className="flex items-center gap-2 text-indigo-750">
              <span className="text-2xl font-extrabold">{fmtCur(totalInventoryValue)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Overall raw warehouse value</p>
          </div>
        </div>

        {/* Dynamic Warning Alerts Banner */}
        {pendingInward.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex items-start gap-3 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Reconciliation Notice:</strong> There are <span className="font-bold underline">{pendingInward.length} inbound purchase entries</span> waiting for Admin's approval. Approved tickets instantly credit the main warehouse counts.
            </div>
          </div>
        )}

        {lowStockItems.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 flex items-start gap-3 text-sm text-rose-800">
            <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Low Inventory Threshold Triggered!</strong> The following SKU lines are critically low: <span className="font-bold font-mono text-xs">{lowStockItems.map(i => getSku(skus, i.skuId).name).join(', ')}</span>. Prepare supplier purchase lists.
            </div>
          </div>
        )}

        {/* Recent Inwards Cards */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
          <h2 className="font-display text-sm font-bold text-slate-950 mb-4">Recent Inbound Purchase Logs</h2>
          <div className="overflow-x-auto text-sm font-medium">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Date</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">SKU Code</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Item Name</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Qty Received</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Vendor Supplier</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseInward.slice(-5).reverse().map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-slate-500">{fmtDate(p.date)}</td>
                    <td className="py-3 px-3"><span className="font-mono text-xs bg-slate-150 rounded px-1.5 py-0.5">{p.skuId}</span></td>
                    <td className="py-3 px-3 text-slate-900">{getSku(skus, p.skuId).name}</td>
                    <td className="py-3 px-3 font-bold text-indigo-650">+{p.qty} units</td>
                    <td className="py-3 px-3 text-slate-700">{p.vendor}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          p.status === 'Approved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : p.status === 'Rejected'
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Record Purchase Inward
  if (activeTab === 'store-inward') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">Inbound Receipts</h1>
          <p className="text-sm font-medium text-slate-400">Log incoming shipments of items and assign to Admin checkout</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* New Receipt Form */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm h-fit">
            <h2 className="font-display text-sm font-bold text-slate-950 mb-3.5">Record Supplier Cargo Receipt</h2>
            <form onSubmit={handleInwardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">SKU</label>
                <select
                  value={inwardSku}
                  onChange={(e) => setInwardSku(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold focus:border-indigo-600 outline-none"
                >
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>{s.id} – {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inwardQty}
                    onChange={(e) => setInwardQty(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inwardPrice}
                    onChange={(e) => setInwardPrice(e.target.value)}
                    placeholder="e.g. 450"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Vendor</label>
                <input
                  type="text"
                  required
                  value={inwardVendor}
                  onChange={(e) => setInwardVendor(e.target.value)}
                  placeholder="e.g. ABC Trading Co"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Invoice Ref</label>
                  <input
                    type="text"
                    value={inwardInv}
                    onChange={(e) => setInwardInv(e.target.value)}
                    placeholder="e.g. INV-1002"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={inwardDate}
                    onChange={(e) => setInwardDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-slate-900 transition"
              >
                <Send className="h-4 w-4" /> Submit for Admin Sanction
              </button>
            </form>
          </div>

          {/* Current Stock Inventory Levels */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm max-h-[480px] overflow-y-auto">
            <h2 className="font-display text-sm font-bold text-slate-950 mb-3">Warehouse Stock Balance (Live Approved)</h2>
            <div className="overflow-x-auto text-sm font-medium">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">SKU Code</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Item Name</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Warehouse Stocks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((i) => {
                    const sk = getSku(skus, i.skuId);
                    const isLow = i.qty <= sk.lowStockAlert;
                    return (
                      <tr key={i.skuId}>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 rounded px-1.5 py-0.5">
                            {i.skuId}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-900">{sk.name}</td>
                        <td className="py-2.5 px-3">
                          {isLow ? (
                            <span className="font-bold text-rose-600 flex items-center gap-1">
                              {i.qty} units <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 font-semibold px-1 rounded">LOW</span>
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800">{i.qty} units</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Filtrations List */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-950">Detailed Purchase Inbound History</h2>
              <p className="text-xs text-slate-400">Filter and reconcile incoming shipments matching vendor titles</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={piVendorFilter}
                onChange={(e) => setPiVendorFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-600 outline-none"
              >
                <option value="">All Suppliers ({suppliers.length})</option>
                {suppliers.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              <select
                value={piStatusFilter}
                onChange={(e) => setPiStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-600 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">From</span>
                <input
                  type="date"
                  value={piFromDateFilter}
                  onChange={(e) => setPiFromDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Till</span>
                <input
                  type="date"
                  value={piToDateFilter}
                  onChange={(e) => setPiToDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer"
                />
              </div>

              {(piVendorFilter || piStatusFilter || piFromDateFilter || piToDateFilter) && (
                <button
                  onClick={() => {
                    setPiVendorFilter('');
                    setPiStatusFilter('');
                    setPiFromDateFilter('');
                    setPiToDateFilter('');
                  }}
                  className="rounded-xl border border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-500 transition cursor-pointer"
                >
                  Clear Filters
                </button>
              )}

              <button
                onClick={downloadInwardCSV}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
              >
                <FileSpreadsheet className="h-4 w-4" /> Download filtered CSV
              </button>
            </div>
          </div>

          {/* Supplier-wise Matching statistics summary bar if filtrations active */}
          {(piVendorFilter || piStatusFilter || piFromDateFilter || piToDateFilter) && (
            <div className="mb-4 rounded-xl border border-indigo-150 bg-indigo-50/40 p-3 flex flex-wrap gap-x-6 gap-y-1 text-xs font-bold text-indigo-950">
              <span className="text-indigo-700">Suppliers Matched: {piVendorFilter || 'All'}</span>
              <span>Matched Count: {filteredInwards.length}</span>
              <span>Matching units: {summaryQtyTotal} units</span>
              <span>Approx total: {fmtCur(summaryValTotal)}</span>
              {piFromDateFilter && <span>From: {piFromDateFilter}</span>}
              {piToDateFilter && <span>Till: {piToDateFilter}</span>}
            </div>
          )}

          <div className="overflow-x-auto text-sm font-medium">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Receipt ID</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Date</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Product SKU</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Item Name</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Qty</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Unit Price</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Vendor / Supplier</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Invoice No</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Approval Status</th>
                  <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInwards.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-xs text-slate-400">{p.id}</td>
                    <td className="py-2.5 px-3 text-slate-500">{fmtDate(p.date)}</td>
                    <td className="py-2.5 px-3"><span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">{p.skuId}</span></td>
                    <td className="py-2.5 px-3 text-slate-900">{getSku(skus, p.skuId).name}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">+{p.qty}</td>
                    <td className="py-2.5 px-3 text-slate-600">{fmtCur(p.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-slate-900 font-bold">{p.vendor}</td>
                    <td className="py-2.5 px-3 text-slate-500">{p.invoiceNo}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold border ${
                          p.status === 'Approved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : p.status === 'Rejected'
                            ? 'bg-rose-50 border-rose-250 text-rose-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {p.status === 'Rejected' && onUpdatePurchaseInward ? (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = purchaseInward.map((item) => {
                              if (item.id === p.id) {
                                return { ...item, status: 'Pending' as const };
                              }
                              return item;
                            });
                            onUpdatePurchaseInward(updated);
                            onAddToast(`Purchase inward entry ${p.id} raised again successfully!`, 'success');
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-[10px] font-extrabold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
                        >
                          <ListRestart className="h-3 w-3" /> Raise Again
                        </button>
                      ) : (
                        <span className="text-slate-300 font-medium">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Stock Requests Flow Management
  if (activeTab === 'store-requests') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-950">Engineer Stock Requests</h1>
            <p className="text-sm font-medium text-slate-400">Fulfill truck item allocations or recall excess materials</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
            {pendingRequests.length} pending
          </span>
        </div>

        {/* Selection Headers */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setSrActiveTab('pending')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition ${
              srActiveTab === 'pending'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Awaiting Fulfillment ({pendingRequests.length})
          </button>
          <button
            onClick={() => setSrActiveTab('processed')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition ${
              srActiveTab === 'processed'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Processed ({processedRequests.length})
          </button>
          <button
            onClick={() => setSrActiveTab('returns')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition ${
              srActiveTab === 'returns'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Van Returns ({(returnRequests || []).filter(r => r.status === 'Pending').length} pending)
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/50 p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="relative">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Search Requests</label>
            <div className="relative">
              <input
                type="text"
                value={srSearchQuery}
                onChange={(e) => setSrSearchQuery(e.target.value)}
                placeholder="Request ID, Sku, item name, Eng..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 text-slate-800"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter by Engineer</label>
            <select
              value={srSelectedEng}
              onChange={(e) => setSrSelectedEng(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 text-slate-850"
            >
              <option value="">All Engineers</option>
              {engineers.map((e) => (
                <option key={e.email} value={e.email}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter by Item SKU</label>
            <select
              value={srSelectedSku}
              onChange={(e) => setSrSelectedSku(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 text-slate-850"
            >
              <option value="">All Items</option>
              {skus.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
              ))}
            </select>
          </div>
          {srActiveTab === 'processed' ? (
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter by Status</label>
              <select
                value={srSelectedStatus}
                onChange={(e) => setSrSelectedStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 text-slate-850"
              >
                <option value="">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Revoke-Pending">Revoke-Pending</option>
                <option value="Revoked">Revoked</option>
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSrSearchQuery('');
                  setSrSelectedEng('');
                  setSrSelectedSku('');
                }}
                className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 transition"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {srActiveTab === 'pending' && (
          <div className="space-y-4">
            {filteredPendingRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                <Check className="mx-auto h-12 w-12 text-emerald-100 mb-2" />
                <h3 className="font-bold text-slate-900 text-lg">
                  {pendingRequests.length > 0 ? 'No matching stock requests' : 'Inventory Dispatched!'}
                </h3>
                <p className="text-sm mt-1">
                  {pendingRequests.length > 0
                    ? 'Try adjusting your search query or filters.'
                    : 'Excellent job! Every requested item allocation has been handled.'}
                </p>
              </div>
            ) : (
              filteredPendingRequests.map((r) => {
                const reqUser = getUser(users, r.engEmail);
                const item = getSku(skus, r.skuId);
                const mainInv = getInvItem(inventory, r.skuId);
                const hasSufficient = mainInv.qty >= r.qty;

                return (
                  <div key={r.id} className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-950">{reqUser.name}</span>
                          <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            {r.id}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-indigo-600 mt-1">
                          {fmtDate(r.date)} – Requested: <span className="underline">{r.qty} units of {item.name}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 self-start">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                          Pending Dispatch
                        </span>
                        {processingStockRequestIds.includes(r.id) && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-550 border border-amber-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white animate-pulse">
                            Processing...
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-xs font-semibold">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Available Warehouse Stock</span>
                        <span className={`text-sm font-bold ${hasSufficient ? 'text-slate-950' : 'text-rose-600'}`}>
                          {mainInv.qty} units
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Requested Allocation Range</span>
                        <span className="text-sm font-bold text-slate-800">{r.qty} units</span>
                      </div>
                    </div>

                    {!hasSufficient && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 flex items-start gap-2 text-xs text-rose-850">
                        <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Stockout Block:</strong> Fulfilling is disabled because warehouse balance is below request level. Register purchase inward.
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2.5">
                      <button
                        type="button"
                        disabled={processingStockRequestIds.includes(r.id)}
                        onClick={() => handleSMApproveStockRequest(r.id, 'Rejected')}
                        className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 px-4 py-2.5 text-xs font-bold tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reject Request
                      </button>
                      <button
                        type="button"
                        disabled={!hasSufficient || processingStockRequestIds.includes(r.id)}
                        onClick={() => handleSMApproveStockRequest(r.id, 'Approved')}
                        className="rounded-xl bg-emerald-600 text-white hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-xs font-bold tracking-wide transition"
                      >
                        {processingStockRequestIds.includes(r.id) ? 'Processing...' : 'Approve & Dispatch'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {srActiveTab === 'processed' && (
          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <h2 className="font-display text-sm font-bold text-slate-950 mb-4">Historical Requests Ledger</h2>
            <div className="overflow-x-auto text-sm font-medium">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Request ID</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Engineer Profile</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">SKU Code</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Item Description</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Qty</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Date Processed</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Status</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400" style={{ textAlign: 'right' }}>Van Recall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProcessedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-slate-400">
                        {processedRequests.length > 0 ? 'No results matching your filters.' : 'No historical requests found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredProcessedRequests.map((r) => {
                      const isApproved = r.status === 'Approved';
                      return (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-xs text-slate-400">{r.id}</td>
                        <td className="py-3 px-3"><strong>{getUser(users, r.engEmail).name}</strong></td>
                        <td className="py-3 px-3"><span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">{r.skuId}</span></td>
                        <td className="py-3 px-3 text-slate-900">{getSku(skus, r.skuId).name}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{r.qty} units</td>
                        <td className="py-3 px-3 text-slate-500">{fmtDate(r.date)}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                              r.status === 'Approved'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                : r.status === 'Rejected'
                                ? 'bg-rose-50 border-rose-250 text-rose-805'
                                : r.status === 'Revoke-Pending'
                                ? 'bg-violet-50 border-violet-150 text-violet-800'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isApproved ? (
                            <button
                              onClick={() => {
                                onSubmitRevoke(r.id);
                                onAddToast('Van revoke proposal submitted to Admin office!');
                              }}
                              className="inline-flex items-center gap-1 rounded bg-amber-50 hover:bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700 border border-amber-200 transition"
                            >
                              <RefreshCcw className="h-3 w-3" /> Revoke
                            </button>
                          ) : (
                            <span className="text-slate-350">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  }) )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {srActiveTab === 'returns' && (
          <div className="space-y-4">
            {filteredReturnRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                <RotateCcw className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                <h3 className="font-bold text-slate-900 text-lg">No return requests found</h3>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or wait for engineers to submit return requests.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm overflow-x-auto text-sm font-medium">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Request ID</th>
                      <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Engineer</th>
                      <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">SKU Code</th>
                      <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Item Name</th>
                      <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Qty returning</th>
                      <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Date</th>
                      <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Status</th>
                      <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredReturnRequests.map((r) => {
                      const engUser = getUser(users, r.engEmail);
                      const details = getSku(skus, r.skuId);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 text-xs text-slate-400">{r.id}</td>
                          <td className="py-3 px-3">
                            <strong>{engUser.name}</strong>
                            <span className="block text-[10px] text-slate-400">{r.engEmail}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 rounded-lg px-2 py-0.5">
                              {r.skuId}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-900">{details.name}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">-{r.qty} units</td>
                          <td className="py-3 px-3 text-slate-500">{fmtDate(r.date)}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                r.status === 'Approved'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : r.status === 'Rejected'
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : 'bg-amber-50 border-amber-200 text-amber-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {r.status === 'Pending' ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => onProcessReturnRequest(r.id, 'Approved')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-900 transition shadow-xs"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onProcessReturnRequest(r.id, 'Rejected')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-900 transition shadow-xs"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-350">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Local Purchase Claims validations (Store Manager Workflow)
  if (activeTab === 'store-lp') {
    const claimsPending = (lpRequests || []).filter((lp) => lp.status === 'Claim submitted');
    const claimsProcessed = (lpRequests || []).filter((lp) =>
      ['Claim forwarded', 'Claim approved', 'Rejected'].includes(lp.status)
    );

    const handleValidateClaim = (id: string) => {
      const updated = lpRequests.map((lp) => {
        if (lp.id === id) return { ...lp, status: 'Claim forwarded' as const };
        return lp;
      });
      onUpdateLpRequests(updated);
      onAddToast(`Claim ${id} validated successfully and forwarded to Admin for final approval.`, 'success');
    };

    const handleRejectClaim = (id: string) => {
      const updated = lpRequests.map((lp) => {
        if (lp.id === id) return { ...lp, status: 'Claim pending' as const };
        return lp;
      });
      onUpdateLpRequests(updated);
      onAddToast(`Claim ${id} rejected and returned to Team Leader's queue.`, 'success');
    };

    const downloadLPClaimsCSV = (type: 'pending' | 'ledger') => {
      const list = type === 'pending' ? claimsPending : claimsProcessed;
      const header = ['ID', 'Job ID', 'Supervisor Name', 'Supervisor Email', 'Date', 'Spare Cost (INR)', 'Service Cost (INR)', 'Total Cost (INR)', 'Status'];
      const rows = list.map((lp) => {
        const u = getUser(users, lp.tlEmail);
        const total = lp.spareCost + lp.serviceCost;
        return [lp.id, lp.jobId, u.name, lp.tlEmail, lp.date, lp.spareCost, lp.serviceCost, total, lp.status];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `store_manager_${type === 'pending' ? 'pending_lp_claims' : 'lp_claims_ledger'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onAddToast(`LP Claims ${type === 'pending' ? 'Pending Queue' : 'Ledger'} CSV downloaded!`);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-950">Local Purchase Claims Validation</h1>
            <p className="text-sm font-medium text-slate-400">Validate local purchase claims from Team Leaders before routing to Admin for final release</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadLPClaimsCSV('pending')}
              disabled={claimsPending.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              <Download className="h-4 w-4" /> Download Pending CSV
            </button>
            <button
              onClick={() => downloadLPClaimsCSV('ledger')}
              disabled={claimsProcessed.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              <Download className="h-4 w-4" /> Download Ledger CSV
            </button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Submitted Claims</span>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-500 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">{claimsPending.length} pending validation</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Claims Forwarded</span>
            <div className="flex items-center gap-2 text-indigo-600">
              <ArrowRight className="h-5 w-5 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">
                {lpRequests.filter(lp => lp.status === 'Claim forwarded').length} in transit
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Claims Released (Approved)</span>
            <div className="flex items-center gap-2 text-emerald-600">
              <Check className="h-5 w-5 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">
                {lpRequests.filter(lp => lp.status === 'Claim approved').length} approved
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Action Area (Pending Validation) */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="font-display text-sm font-bold text-slate-950">Pending Validation Queue</h2>
            
            {claimsPending.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/20 p-8 text-center text-slate-400 space-y-2">
                <p className="font-bold text-xs">Awaiting Claims from Team Leaders</p>
                <p className="text-[11px] text-slate-400">All submitted claims are validated and forwarded successfully.</p>
              </div>
            ) : (
              claimsPending.map((lp) => {
                const totalCost = lp.spareCost + lp.serviceCost;
                return (
                  <div key={lp.id} className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4 hover:border-slate-300 transition">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[10px] font-bold text-slate-450 uppercase tracking-wider bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
                          {lp.id}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 font-medium">Job:</span>
                          <strong className="text-xs text-slate-900">{lp.jobId}</strong>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border border-indigo-200 text-indigo-800">
                        Pending Store Validation
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Spare Cost</span>
                        <span className="font-bold text-slate-800">{fmtCur(lp.spareCost)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-450 block">Service Cost</span>
                        <span className="font-bold text-slate-800">{fmtCur(lp.serviceCost)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-400 block">Total Cost</span>
                        <span className="font-extrabold text-indigo-700">{fmtCur(totalCost)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Submitted by: <strong>{getUser(users, lp.tlEmail).name}</strong></span>
                      <span>Date: {fmtDate(lp.date)}</span>
                    </div>

                    {lp.description && (
                      <div className="text-xs bg-slate-50 border border-slate-100 p-2 rounded-lg text-slate-600 font-medium">
                        <span className="font-bold text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Description</span>
                        {lp.description}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectClaim(lp.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 transition"
                      >
                        <ThumbsDown className="h-4 w-4" /> Reject Claim
                      </button>
                      <button
                        onClick={() => handleValidateClaim(lp.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 transition"
                      >
                        <ThumbsUp className="h-4 w-4" /> Validate & Forward
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Validation History Area */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="font-display text-sm font-bold text-slate-950">Store Claims Validation Ledger</h2>

            <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-2.5 px-2 text-slate-400 font-bold tracking-wider">ID</th>
                      <th className="py-2.5 px-2 text-slate-400 font-bold tracking-wider">TL / Job ID</th>
                      <th className="py-2.5 px-2 text-slate-400 font-bold tracking-wider">Total Cost</th>
                      <th className="py-2.5 px-2 text-slate-400 font-bold tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {claimsProcessed.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400 bg-slate-50/20 rounded-xl">
                          No processed claims history located.
                        </td>
                      </tr>
                    ) : (
                      claimsProcessed.map((lp) => {
                        const total = lp.spareCost + lp.serviceCost;
                        return (
                          <tr key={lp.id} className="hover:bg-slate-50/40">
                            <td className="py-3 px-2 font-mono text-slate-400">{lp.id}</td>
                            <td className="py-3 px-2">
                              <div>
                                <span className="block text-slate-955">{getUser(users, lp.tlEmail).name}</span>
                                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">{lp.jobId}</span>
                                {lp.description && (
                                  <span className="block text-[10px] text-slate-400 font-normal truncate max-w-xs" title={lp.description}>
                                    {lp.description}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-indigo-600">{fmtCur(total)}</td>
                            <td className="py-3 px-2">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide border ${
                                  lp.status === 'Claim approved'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : lp.status === 'Claim forwarded'
                                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                                    : 'bg-rose-50 border-rose-200 text-rose-800'
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
        </div>
      </div>
    );
  }

  // Main Warehouse Report Visualizations
  if (activeTab === 'store-inventory') {
    const activeStaffEngs = users.filter((x) => x.role === 'Engineer' && x.orgId === currentUser.orgId);

    // Compute dynamic months or van stock items
    const flattenedVanStock = Object.entries(engineerStock).flatMap(([email, items]) => {
      const userRecord = getUser(users, email);
      if (userRecord.orgId !== currentUser.orgId) return [];

      return items.map((item) => {
        const sk = getSku(skus, item.skuId);
        const invItem = getInvItem(inventory, item.skuId);
        const value = item.qty * invItem.unitPrice;
        return {
          email,
          engineerName: userRecord.name,
          skuId: item.skuId,
          itemName: sk.name,
          qty: item.qty,
          value
        };
      });
    });

    const filteredVanStock = flattenedVanStock.filter((item) => {
      const matchEng = !invEngStockSelector || item.email === invEngStockSelector;
      const matchSku = !invSkuStockSelector || item.skuId === invSkuStockSelector;
      return matchEng && matchSku;
    });

    const sortedVanStock = [...filteredVanStock].sort((a, b) => {
      let comparison = 0;
      if (vanStockSortKey === 'name') {
        comparison = a.engineerName.localeCompare(b.engineerName) || a.email.localeCompare(b.email);
      } else if (vanStockSortKey === 'sku') {
        comparison = a.skuId.localeCompare(b.skuId);
      } else if (vanStockSortKey === 'description') {
        comparison = a.itemName.localeCompare(b.itemName);
      } else if (vanStockSortKey === 'qty') {
        comparison = a.qty - b.qty;
      } else if (vanStockSortKey === 'value') {
        comparison = a.value - b.value;
      }
      return vanStockSortAsc ? comparison : -comparison;
    });

    const downloadVanStockDetailedCSV = () => {
      const header = ['Engineer Name', 'Engineer Email', 'SKU ID', 'SKU Description', 'Available Qty', 'Value (INR)'];
      const rows = filteredVanStock.map((item) => [
        item.engineerName,
        item.email,
        item.skuId,
        item.itemName,
        item.qty,
        item.value
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `engineer_wise_stock_report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onAddToast('Engineer wise stock report downloaded!');
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-955 font-sans">Store Inventory Report</h1>
            <p className="text-sm font-medium text-slate-400">Oversee warehouse shelf levels and track materials inside engineer vehicles</p>
          </div>
          {activeInventoryTab === 'warehouse' ? (
            <button
              onClick={downloadStoreInventoryCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4.5 w-4.5 text-slate-500" /> Export full levels to CSV
            </button>
          ) : (
            <button
              onClick={downloadVanStockDetailedCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4.5 w-4.5 text-slate-500" /> Export van stocks to CSV
            </button>
          )}
        </div>

        {/* Premium Segmented Tab Switcher (iOS/Material style matching Admin tab track color) */}
        <div className="flex justify-center sm:justify-start">
          <div className="flex flex-wrap gap-1 bg-white rounded-lg p-1 border border-slate-100 shadow-sm w-full sm:w-auto">
            <button
              id="tab-warehouse-stocks"
              onClick={() => setActiveInventoryTab('warehouse')}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-extrabold uppercase rounded-md tracking-wider transition-all duration-200 w-full sm:w-auto cursor-pointer ${
                activeInventoryTab === 'warehouse'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Warehouse Stocks</span>
            </button>
            <button
              id="tab-van-recalls"
              onClick={() => setActiveInventoryTab('engineer')}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-extrabold uppercase rounded-md tracking-wider transition-all duration-200 w-full sm:w-auto cursor-pointer ${
                activeInventoryTab === 'engineer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Engineer wise stock report</span>
            </button>
          </div>
        </div>

        {activeInventoryTab === 'warehouse' ? (
          <div className="space-y-6 animate-fade-in">
            {/* Highlight Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Total SKU Lines</span>
                <div className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span className="text-2xl font-extrabold text-slate-955">{inventory.length} registered</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Stocks counts</span>
                <div className="flex items-center gap-2 text-indigo-650">
                  <span className="text-2xl font-extrabold">{inventory.reduce((sum, item) => sum + item.qty, 0)} units</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Alert SKU Lines</span>
                <span className={`text-2xl font-extrabold block ${lowStockItems.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {lowStockItems.length} lines below bounds
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Warehouse Value</span>
                <span className="text-2xl font-extrabold block text-slate-900">{fmtCur(totalInventoryValue)}</span>
              </div>
            </div>

            {/* Detailed Warehouse Levels Visual Table */}
            <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm">
              <h2 className="font-display text-sm font-bold text-slate-950 mb-4">Detailed Stock Meter levels</h2>
              <div className="overflow-x-auto text-sm font-medium">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">SKU Code</th>
                      <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Product Title</th>
                      <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Warehouse Stock</th>
                      <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Min Stock Limit</th>
                      <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Unit Cost</th>
                      <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400" style={{ textAlign: 'right' }}>Capital Valuation (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory.map((i) => {
                      const sk = getSku(skus, i.skuId);
                      const isLow = i.qty <= sk.lowStockAlert;
                      const value = i.qty * i.unitPrice;
                      const progressPct = Math.min(100, (i.qty / 400) * 100);

                      return (
                        <tr key={i.skuId} className="hover:bg-slate-50/50">
                          <td className="py-4.5 px-4">
                            <span className="font-mono text-xs font-bold text-indigo-755 bg-indigo-50 border border-indigo-150 rounded px-2 py-0.5">
                              {i.skuId}
                            </span>
                          </td>
                          <td className="py-4.5 px-4">
                            <div>
                              <span className="block text-slate-905 font-bold">{sk.name}</span>
                              <span className="block text-[10px] text-slate-400 font-semibold uppercase">{isLow ? 'Alert out-of-bounds' : 'Safety counts secure'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div>
                              <strong className={isLow ? 'text-rose-600' : 'text-slate-900'}>{i.qty} units</strong>
                              <div className="h-1.5 w-24 bg-slate-150 rounded-full overflow-hidden mt-1 bg-slate-100">
                                <div
                                  className={`h-full rounded-full ${isLow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${progressPct}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{sk.lowStockAlert} Alert qty</td>
                          <td className="py-3.5 px-4 text-slate-500">{fmtCur(i.unitPrice)}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">{fmtCur(value)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Engineer-wise stocking report */}
            <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">Engineer Van Stock Audit Reports</h2>
                  <p className="text-xs text-slate-400">Inspect allocations presently sitting inside engineer trunks</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={invEngStockSelector}
                    onChange={(e) => setInvEngStockSelector(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-650"
                  >
                    <option value="">All Engineers ({activeStaffEngs.length})</option>
                    {activeStaffEngs.map((e) => (
                      <option key={e.email} value={e.email}>{e.name}</option>
                    ))}
                  </select>

                  <select
                    value={invSkuStockSelector}
                    onChange={(e) => setInvSkuStockSelector(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-650"
                  >
                    <option value="">All SKUs ({skus.length})</option>
                    {skus.map((s) => (
                      <option key={s.id} value={s.id}>{s.id} – {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto text-sm font-medium">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 select-none">
                      <th
                        onClick={() => toggleVanStockSort('name')}
                        className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Engineer Name{renderSortIndicator('name', vanStockSortKey, vanStockSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleVanStockSort('sku')}
                        className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        SKU ID{renderSortIndicator('sku', vanStockSortKey, vanStockSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleVanStockSort('description')}
                        className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        SKU Description{renderSortIndicator('description', vanStockSortKey, vanStockSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleVanStockSort('qty')}
                        className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Available Qty{renderSortIndicator('qty', vanStockSortKey, vanStockSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleVanStockSort('value')}
                        className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                        style={{ textAlign: 'right' }}
                      >
                        Value{renderSortIndicator('value', vanStockSortKey, vanStockSortAsc)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sortedVanStock.map((item) => {
                      return (
                        <tr key={`${item.email}-${item.skuId}`} className="hover:bg-slate-50/50">
                          <td className="py-4.5 px-4 whitespace-nowrap">
                            <strong>{item.engineerName}</strong>
                            <br />
                            <span className="text-[10px] text-slate-400 font-semibold">{item.email}</span>
                          </td>
                          <td className="py-4.5 px-4">
                            <span className="font-mono text-xs font-bold text-indigo-755 bg-indigo-50 border border-indigo-150 rounded px-2 py-0.5">
                              {item.skuId}
                            </span>
                          </td>
                          <td className="py-4.5 px-4 text-slate-900">{item.itemName}</td>
                          <td className="py-4.5 px-4 font-bold text-slate-900">{item.qty} units allocated</td>
                          <td className="py-4.5 px-4 text-right font-bold text-slate-900">{fmtCur(item.value)}</td>
                        </tr>
                      );
                    })}
                    {sortedVanStock.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">
                          No matching engineer stock records found.
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

  if (activeTab === 'store-approvals') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">Store Approvals Queue</h1>
          <p className="text-sm font-medium text-slate-400">Validate Engineer logging performance following Team Leader validation</p>
        </div>

        {/* Local Queue Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setSmQueueTab('pending')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition ${
              smQueueTab === 'pending'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Pending Validation ({smPendingList.length})
          </button>
          <button
            onClick={() => setSmQueueTab('done')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition ${
              smQueueTab === 'done'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Processed History ({smDoneList.length})
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/50 p-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="relative">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Search Logs</label>
            <div className="relative">
              <input
                type="text"
                value={smSearchQuery}
                onChange={(e) => setSmSearchQuery(e.target.value)}
                placeholder="Log ID, Eng name, email, date..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 text-slate-800"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter by Engineer</label>
            <select
              value={smSelectedEng}
              onChange={(e) => setSmSelectedEng(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 text-slate-850"
            >
              <option value="">All Engineers</option>
              {engineers.map((e) => (
                <option key={e.email} value={e.email}>{e.name}</option>
              ))}
            </select>
          </div>
          {smQueueTab === 'done' ? (
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter by Status</label>
              <select
                value={smSelectedStatus}
                onChange={(e) => setSmSelectedStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 text-slate-850"
              >
                <option value="">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Validated by SM">Validated by SM</option>
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSmSearchQuery('');
                  setSmSelectedEng('');
                }}
                className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 transition"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {smQueueTab === 'pending' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSmPendingList.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 font-semibold text-sm">
                {smPendingList.length > 0 ? 'No results found matching your filters.' : 'No performance entries are awaiting Store Manager validation.'}
              </div>
            ) : (
              filteredSmPendingList.map((l) => {
                const totalRevenue = l.accessories.reduce((sum, item) => sum + (item.saleValue || 0), 0);
                const engineer = getUser(users, l.engEmail);
                return (
                  <div key={l.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md block w-fit mb-1">
                          {l.id}
                        </span>
                        <h3 className="font-display text-sm font-extrabold text-slate-900">
                          {engineer.name}
                        </h3>
                        <span className="text-xs text-slate-450 block">{engineer.email}</span>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <div>
                          <span className="text-xs font-semibold text-slate-400 block">Duty Date</span>
                          <strong className="text-sm text-slate-800">{fmtDate(l.date)}</strong>
                        </div>
                        {processingProductivityIds.includes(l.id) && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-550 border border-amber-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white animate-pulse">
                            Processing...
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-slate-50/50 rounded-xl p-3 border border-slate-100/75 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Calls Closed</span>
                        <strong className="text-sm font-extrabold text-slate-805">{l.callsClosed} jobs</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">RCP Collected</span>
                        <strong className="text-sm font-extrabold text-emerald-700">{fmtCur(l.rcpCollected || 0)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">RCP Qty</span>
                        <strong className="text-sm font-extrabold text-amber-750">{l.rcpQty || 0}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Acc. Revenue</span>
                        <strong className="text-sm font-extrabold text-indigo-750">{fmtCur(totalRevenue)}</strong>
                      </div>
                    </div>

                    {/* Accessories Detailed List */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-bold text-slate-500 block">Accessories Logged:</span>
                      {l.accessories.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No accessories reported.</p>
                      ) : (
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {l.accessories.map((a, idx) => {
                            const skuDetails = getSku(skus, a.skuId);
                            return (
                              <div key={`${a.skuId}-${idx}`} className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-xs">
                                <span className="font-semibold text-slate-800">{skuDetails.name}</span>
                                <span className="font-bold text-slate-900">{a.qty} units × {fmtCur(a.saleValue)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {l.tlNote && (
                      <div className="text-xs bg-indigo-50 border border-indigo-100/50 text-indigo-950 p-2.5 rounded-xl font-semibold">
                        <strong>Team Leader Review Notes:</strong> "{l.tlNote}"
                      </div>
                    )}

                    {/* Feedback Formulation */}
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-bold tracking-wider text-slate-500">
                        Authorization Feedback / rejection reason
                      </label>
                      <textarea
                        value={smNotes[l.id] || ''}
                        onChange={(e) => setSmNotes({ ...smNotes, [l.id]: e.target.value })}
                        placeholder="Provide review feedback (mandatory if rejecting)..."
                        className="w-full h-16 rounded-xl border border-slate-205 bg-slate-50/25 p-2.5 text-xs font-medium outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={processingProductivityIds.includes(l.id)}
                        onClick={() => {
                          if (!smNotes[l.id]) {
                            onAddToast('Please fill feedback note before rejecting', 'error');
                            return;
                          }
                          handleSMAction(l.id, 'Rejected');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-205 bg-rose-50 text-rose-800 hover:bg-rose-100 px-4 py-2 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ThumbsDown className="h-4 w-4" /> Reject
                      </button>
                      <button
                        type="button"
                        disabled={processingProductivityIds.includes(l.id)}
                        onClick={() => handleSMAction(l.id, 'Validated by SM')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ThumbsUp className="h-4 w-4" /> {processingProductivityIds.includes(l.id) ? 'Processing...' : 'Validate Log'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <h2 className="font-display text-sm font-bold text-slate-950 mb-4">Processed Validation History</h2>
            <div className="overflow-x-auto text-sm font-medium">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">ID</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Engineer</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Log Date</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Calls Closed</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">RCP Collected</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">RCP Qty</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Status</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Feedback Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSmDoneList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-slate-400">
                        {smDoneList.length > 0 ? 'No results matching your filters.' : 'No logs have been validated or rejected yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSmDoneList.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <span className="font-mono text-xs text-slate-650 bg-slate-100 px-2 py-0.5 rounded-md">{d.id}</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">{getUser(users, d.engEmail).name}</td>
                        <td className="py-3 px-3 text-slate-500">{fmtDate(d.date)}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{d.callsClosed} calls</td>
                        <td className="py-3 px-3 text-slate-900 font-semibold">{fmtCur(d.rcpCollected || 0)}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{d.rcpQty || 0}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                              d.status === 'Approved'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                : d.status === 'Validated by SM'
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-805'
                                : 'bg-rose-50 border-rose-200 text-rose-850'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs font-semibold text-slate-600 max-w-xs truncate" title={d.adminNote}>
                          {d.adminNote || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'store-attendance') {
    const myAttendanceRequests = attendanceRequests.filter(req => req.submittedBy === currentUser.email);
    const { prefix: currentMonthPrefix, label: currentMonthLabel } = getMonthRange();

    const firstDay = new Date(currentMonthPrefix + '-01');
    const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
    const userAtt = attendance[currentUser.email] || {};
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const startDow = firstDay.getDay();

    const calCells = [];
    for (let i = 0; i < startDow; i++) {
      calCells.push(<div key={`empty-${i}`} className="aspect-square bg-transparent"></div>);
    }
    const todayStr = new Date().toISOString().split('T')[0];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentMonthPrefix}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const attStatusVal = userAtt[dateStr];
      const dateObj = new Date(dateStr);
      const isPast = dateObj < new Date();

      let cellClass = 'aspect-square rounded-xl p-1.5 flex flex-col justify-between border text-[11px] font-bold ';
      let statusIndicator = null;

      if (attStatusVal === 'Present') {
        cellClass += 'bg-emerald-50 border-emerald-300 text-emerald-950';
        statusIndicator = <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 self-center"></span>;
      } else if (attStatusVal === 'Absent') {
        cellClass += 'bg-amber-50 border-amber-250 text-amber-950';
        statusIndicator = <span className="h-1.5 w-1.5 rounded-full bg-amber-500 self-center"></span>;
      } else if (isPast && !attStatusVal && dateObj.getDay() !== 0) {
        cellClass += 'bg-slate-100 border-slate-200 text-slate-400';
      } else {
        cellClass += 'bg-slate-50 border-slate-100 text-slate-400';
      }

      if (isToday) {
        cellClass += ' ring-2 ring-indigo-600 ring-offset-1';
      }

      calCells.push(
        <div key={`day-${d}`} className={cellClass}>
          <span>{d}</span>
          {statusIndicator}
        </div>
      );
    }

    const presentCount = Object.entries(userAtt).filter(
      ([date, val]) => date.substring(0, 7) === currentMonthPrefix && val === 'Present'
    ).length;

    const leaveCount = Object.entries(userAtt).filter(
      ([date, val]) => date.substring(0, 7) === currentMonthPrefix && val === 'Absent'
    ).length;

    const pendingRequests = myAttendanceRequests.filter(req => req.approvedStatus === 'Pending').length;

    const handleMarkAttendanceSM = (e: React.FormEvent) => {
      e.preventDefault();

      const isAlreadyRequested = attendanceRequests.some(
        req => req.engEmail.toLowerCase() === currentUser.email.toLowerCase() && req.date === smAttDate && req.approvedStatus !== 'Rejected'
      );

      if (isAlreadyRequested) {
        onAddToast(`Your attendance request for ${smAttDate} is already submitted or approved.`, 'error');
        return;
      }

      const recordId = `AR-${Date.now().toString().slice(-6)}`;
      const newRequest: AttendanceRequest = {
        id: recordId,
        engEmail: currentUser.email,
        date: smAttDate,
        status: smAttStatus,
        submittedBy: currentUser.email,
        submittedByRole: 'Store Manager',
        approvedStatus: 'Pending',
        remarks: smAttRemarks,
      };

      onAddAttendanceRequest(newRequest);
      setSmAttRemarks('');
      onAddToast('Your attendance request has been submitted to Admin successfully!', 'success');
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">Mark Attendance Portal</h1>
          <p className="text-sm font-medium text-slate-400">Mark your own daily attendance, track approval validation, and view live stats</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Submission Form and Summary */}
          <div className="lg:col-span-4 space-y-6">
            {/* Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-150 pb-3 mb-4">Mark Daily Attendance</h2>
              <form onSubmit={handleMarkAttendanceSM} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Staff Member</label>
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-700 truncate">
                    {currentUser.name} ({currentUser.email})
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={smAttDate}
                    onChange={(e) => setSmAttDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-250 bg-slate-50/50 p-2.5 text-sm text-slate-800 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Mark status</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                        smAttStatus === 'Present'
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-650'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="Present"
                        checked={smAttStatus === 'Present'}
                        onChange={() => setSmAttStatus('Present')}
                        className="sr-only"
                      />
                      <span>Present</span>
                    </label>
                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                        smAttStatus === 'Leave'
                          ? 'border-amber-500 bg-amber-50/50 text-amber-800 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-650'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="Leave"
                        checked={smAttStatus === 'Leave'}
                        onChange={() => setSmAttStatus('Leave')}
                        className="sr-only"
                      />
                      <span>Leave</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Remarks / Description</label>
                  <input
                    type="text"
                    value={smAttRemarks}
                    onChange={(e) => setSmAttRemarks(e.target.value)}
                    placeholder="Enter attendance remarks or reasons..."
                    className="w-full rounded-xl border border-slate-250 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-slate-900 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-md shadow-indigo-600/10 transition"
                >
                  Submit Attendance Request
                </button>
              </form>
            </div>

            {/* Attendance Summary Panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Attendance Summary ({currentMonthLabel})</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <span className="block text-xl font-extrabold text-emerald-800">{presentCount}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Present</span>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <span className="block text-xl font-extrabold text-amber-800">{leaveCount}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">On Leave</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                  <span className="block text-xl font-extrabold text-indigo-800">{pendingRequests}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600">Pending</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Live Calendar & Ledgers */}
          <div className="lg:col-span-8 space-y-6">
            {/* Calendar Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600" /> Live Duty Calendar
                </h3>
                <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                  {currentMonthLabel}
                </span>
              </div>
              
              <div className="grid grid-cols-7 gap-1.5 text-center font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                {dayNames.map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1.5">
                {calCells}
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Present
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span> Approved Leave
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-slate-100 border border-slate-200 rounded-xs"></span> Scheduled Off / Pending
                </span>
              </div>
            </div>

            {/* Submitted list block */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Store Attendance Submission Ledger</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-3">Req ID</th>
                      <th className="py-3 px-3">Staff Name</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Proposed Status</th>
                      <th className="py-3 px-3">Remarks / Description</th>
                      <th className="py-3 px-3">Approval status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAttendanceRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                          No attendance requests submitted yet.
                        </td>
                      </tr>
                    ) : (
                      myAttendanceRequests.map((req) => {
                        const engineer = getUser(users, req.engEmail);
                        return (
                          <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/30 text-sm">
                            <td className="py-3 px-3 font-mono text-slate-500 text-xs">{req.id}</td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900">{engineer.name}</span>
                              <span className="block text-[11px] text-slate-400">{req.engEmail}</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-650">{fmtDate(req.date)}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
                                  req.status === 'Present'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-amber-50 border-amber-200 text-amber-800'
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-600 max-w-[200px] truncate" title={req.remarks || ''}>
                              {req.remarks || <span className="text-slate-350 italic">—</span>}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
                                  req.approvedStatus === 'Approved'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : req.approvedStatus === 'Rejected'
                                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                                    : 'bg-amber-50 border-amber-200 text-amber-850'
                                }`}
                              >
                                {req.approvedStatus}
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
        </div>
      </div>
    );
  }

  if (activeTab === 'store-sku-registry') {
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {skus.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3"><span className="font-mono text-xs font-bold text-indigo-750 bg-indigo-50 border border-indigo-150 rounded px-1.5 py-0.5">{item.id}</span></td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3 px-3 text-slate-600">{item.lowStockAlert} units alert</td>
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

  return null;
}
