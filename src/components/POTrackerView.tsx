import React, { useState } from 'react';
import { PurchaseOrder, User } from '../types';
import { ClipboardList, Plus, Search, Check, ArrowRight, TrendingUp, DollarSign, Percent, ShieldCheck, Download } from 'lucide-react';
import { writeDocument } from '../dbService';

interface POTrackerViewProps {
  currentUser: User;
  purchaseOrders: PurchaseOrder[];
  onUpdatePurchaseOrders: (pos: PurchaseOrder[]) => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
  mode: 'Store Manager' | 'Admin';
}

type SortField = 'poNumber' | 'poDate' | 'registeredBy' | 'netValue' | 'gstAmount' | 'totalValue' | 'status' | 'docketNumber';

export function POTrackerView({
  currentUser,
  purchaseOrders,
  onUpdatePurchaseOrders,
  onAddToast,
  mode,
}: POTrackerViewProps) {
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('poDate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Form states (Only relevant for Store Manager)
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [netValueInput, setNetValueInput] = useState('');
  const [gstAmountInput, setGstAmountInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action states for inline button loading/disabling (concurrency protection)
  const [processingPoIds, setProcessingPoIds] = useState<string[]>([]);

  // Automatically compute default 18% GST on Net Value change
  const handleNetValueChange = (val: string) => {
    setNetValueInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      const computedGst = Math.round(num * 0.18 * 100) / 100;
      setGstAmountInput(computedGst.toString());
    } else {
      setGstAmountInput('');
    }
  };

  const netVal = parseFloat(netValueInput) || 0;
  const gstVal = parseFloat(gstAmountInput) || 0;
  const totalVal = Math.round((netVal + gstVal) * 100) / 100;

  // Handle PO Registration
  const handleRegisterPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poNumber.trim()) {
      onAddToast('Please enter a valid Purchase Order number.', 'error');
      return;
    }
    if (netVal <= 0) {
      onAddToast('Net Value must be greater than 0.', 'error');
      return;
    }

    // Check for duplicate PO Number
    const duplicate = purchaseOrders.some(
      (po) => po.poNumber.trim().toLowerCase() === poNumber.trim().toLowerCase()
    );
    if (duplicate) {
      onAddToast(`Purchase Order number "${poNumber}" is already registered.`, 'error');
      return;
    }

    setIsSubmitting(true);
    const newId = `PO-${Date.now()}`;
    const newPO: PurchaseOrder = {
      id: newId,
      poNumber: poNumber.trim(),
      poDate,
      netValue: netVal,
      gstAmount: gstVal,
      totalValue: totalVal,
      status: 'Dispatch Pending',
      orgId: currentUser.orgId || 'org-001',
      registeredBy: currentUser.email,
    };

    try {
      await writeDocument('purchaseOrders', newId, newPO);
      onUpdatePurchaseOrders([...purchaseOrders, newPO]);
      onAddToast(`Purchase Order ${newPO.poNumber} registered successfully!`, 'success');
      // Reset form
      setPoNumber('');
      setNetValueInput('');
      setGstAmountInput('');
      setPoDate(new Date().toISOString().substring(0, 10));
    } catch (err) {
      console.error(err);
      onAddToast('Failed to register Purchase Order.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Status Transitions (Store Manager)
  const handleTransitionStatus = async (po: PurchaseOrder, nextStatus: 'Dispatched' | 'Payment Received (Pending Approval)') => {
    let docketNum = po.docketNumber || '';
    if (nextStatus === 'Dispatched') {
      const input = window.prompt(`Enter Docket/Tracking Number for PO ${po.poNumber}:`);
      if (input === null) return; // Cancelled
      if (!input.trim()) {
        onAddToast('Docket Number is required to dispatch the PO.', 'error');
        return;
      }
      docketNum = input.trim();
    }

    setProcessingPoIds((prev) => [...prev, po.id]);
    
    // Simulate database concurrency safeguard delay
    setTimeout(async () => {
      const updatedPO: PurchaseOrder = {
        ...po,
        status: nextStatus,
        ...(nextStatus === 'Dispatched' ? { docketNumber: docketNum } : {}),
      };

      try {
        await writeDocument('purchaseOrders', po.id, updatedPO);
        onUpdatePurchaseOrders(purchaseOrders.map((x) => (x.id === po.id ? updatedPO : x)));
        onAddToast(`PO ${po.poNumber} status updated to ${nextStatus}.`, 'success');
      } catch (err) {
        console.error(err);
        onAddToast('Failed to update PO status.', 'error');
      } finally {
        setProcessingPoIds((prev) => prev.filter((id) => id !== po.id));
      }
    }, 1000);
  };

  // Handle Admin Approvals
  const handleApprovePO = async (po: PurchaseOrder) => {
    setProcessingPoIds((prev) => [...prev, po.id]);

    // Simulate database write delay
    setTimeout(async () => {
      const updatedPO: PurchaseOrder = {
        ...po,
        status: 'Payment Received',
      };

      try {
        await writeDocument('purchaseOrders', po.id, updatedPO);
        onUpdatePurchaseOrders(purchaseOrders.map((x) => (x.id === po.id ? updatedPO : x)));
        onAddToast(`Clearance approved for Purchase Order ${po.poNumber}!`, 'success');
      } catch (err) {
        console.error(err);
        onAddToast('Failed to approve PO clearance.', 'error');
      } finally {
        setProcessingPoIds((prev) => prev.filter((id) => id !== po.id));
      }
    }, 1000);
  };

  // Column sort helper
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="text-slate-300 ml-1">⇅</span>;
    return sortAsc ? <span className="text-indigo-600 ml-1">▲</span> : <span className="text-indigo-600 ml-1">▼</span>;
  };

  // Filter & Sort POs
  const filteredPOs = purchaseOrders.filter((po) => {
    const term = searchQuery.toLowerCase();
    return (
      po.poNumber.toLowerCase().includes(term) ||
      (po.registeredBy && po.registeredBy.toLowerCase().includes(term))
    );
  });

  const sortedPOs = [...filteredPOs].sort((a, b) => {
    let valA: any = a[sortField] ?? '';
    let valB: any = b[sortField] ?? '';

    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      return sortAsc ? valA - valB : valB - valA;
    }
  });

  // Financial Dashboard Metrics (Only for Admin Mode)
  const dispatchPendingPOValue = purchaseOrders
    .filter((po) => po.status === 'Dispatch Pending')
    .reduce((sum, po) => sum + po.totalValue, 0);

  const dispatchedPOValue = purchaseOrders
    .filter((po) => po.status === 'Dispatched')
    .reduce((sum, po) => sum + po.totalValue, 0);

  const paymentReceivedPOValue = purchaseOrders
    .filter((po) => po.status === 'Payment Received')
    .reduce((sum, po) => sum + po.totalValue, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const downloadPurchaseOrdersCSV = () => {
    const header = mode === 'Admin' 
      ? ['PO Number', 'PO Date', 'Store Manager', 'Net Value', 'GST Amount', 'Total Value', 'Docket Number', 'Status']
      : ['PO Number', 'PO Date', 'Net Value', 'GST Amount', 'Total Value', 'Docket Number', 'Status'];
    const rows = sortedPOs.map((po) => {
      const row = [
        po.poNumber,
        po.poDate,
        ...(mode === 'Admin' ? [po.registeredBy || 'System'] : []),
        po.netValue,
        po.gstAmount,
        po.totalValue,
        po.docketNumber || '—',
        po.status
      ];
      return row;
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `purchase_orders_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Purchase Orders report CSV downloaded!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-display text-xl font-extrabold text-slate-900">Purchase Order Tracker</h2>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            {mode === 'Store Manager' 
              ? 'Register new corporate purchase orders and manage their fulfillment dispatch stages.'
              : 'Audit registered purchase order workflows, collect GST tax details, and authorize payment clearances.'}
          </p>
        </div>
      </div>

      {/* Admin Dashboards */}
      {mode === 'Admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-amber-100 uppercase tracking-wider">Dispatch Pending PO Total Value</span>
              <div className="text-2xl font-black font-display">{formatCurrency(dispatchPendingPOValue)}</div>
              <p className="text-[10px] text-amber-50 text-slate-200">Value of POs in dispatch pending state</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-5 shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-blue-100 uppercase tracking-wider">Dispatched PO Total Value</span>
              <div className="text-2xl font-black font-display">{formatCurrency(dispatchedPOValue)}</div>
              <p className="text-[10px] text-blue-50 text-slate-200">Value of POs in dispatched state</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Percent className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl p-5 shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-teal-100 uppercase tracking-wider">Payment Received PO Total Value</span>
              <div className="text-2xl font-black font-display">{formatCurrency(paymentReceivedPOValue)}</div>
              <p className="text-[10px] text-teal-50 text-slate-200">Finalized and closed PO valuation total</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Main Split Layout for Store Manager OR single table view for Admin */}
      <div className={`grid grid-cols-1 ${mode === 'Store Manager' ? 'lg:grid-cols-12' : 'grid-cols-1'} gap-6`}>
        
        {/* PO Registration Form Panel (Only for Store Manager Mode) */}
        {mode === 'Store Manager' && (
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs h-fit space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Register Purchase Order</h3>
            </div>

            <form onSubmit={handleRegisterPO} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">PO Number</label>
                <input
                  type="text"
                  required
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="e.g. PO/2026/005"
                  className="w-full text-xs font-semibold rounded-xl border border-slate-200 py-2.5 px-3 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">PO Date</label>
                <input
                  type="date"
                  required
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-200 py-2.5 px-3 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Net Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={netValueInput}
                    onChange={(e) => handleNetValueChange(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 py-2.5 px-3 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">GST Amount (18%) (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    readOnly
                    value={gstAmountInput}
                    placeholder="Auto-calculated"
                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-500 py-2.5 px-3 outline-none cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* Dynamic Real-Time Valuation Badge */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Real-Time Valuation</span>
                <span className="text-xl font-black font-display text-indigo-700">{formatCurrency(totalVal)}</span>
                <span className="text-[9px] text-indigo-400 font-semibold">(Net: {formatCurrency(netVal)} + GST: {formatCurrency(gstVal)})</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold rounded-xl text-xs transition shadow-md shadow-indigo-600/10"
              >
                <Plus className="h-4 w-4" />
                <span>{isSubmitting ? 'Registering...' : 'Register Purchase Order'}</span>
              </button>
            </form>
          </div>
        )}

        {/* PO Ledger List Panel */}
        <div className={`${mode === 'Store Manager' ? 'lg:col-span-8' : 'w-full'} bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Purchase Order Ledger</h3>
            
            <div className="flex items-center gap-2 max-w-md w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={mode === 'Store Manager' ? "Search PO Number..." : "Search PO No or email..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none transition focus:border-indigo-600"
                />
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={downloadPurchaseOrdersCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer select-none border border-slate-200/50"
                title="Download Purchase Orders CSV"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 select-none">
                  <th 
                    onClick={() => handleSort('poNumber')}
                    className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition whitespace-nowrap text-left"
                  >
                    PO Number {getSortIcon('poNumber')}
                  </th>
                  <th 
                    onClick={() => handleSort('poDate')}
                    className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition whitespace-nowrap text-left"
                  >
                    PO Date {getSortIcon('poDate')}
                  </th>
                  {mode === 'Admin' && (
                    <th 
                      onClick={() => handleSort('registeredBy')}
                      className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition whitespace-nowrap text-left"
                    >
                      Store Manager {getSortIcon('registeredBy')}
                    </th>
                  )}
                  <th 
                    onClick={() => handleSort('netValue')}
                    className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition whitespace-nowrap text-right"
                  >
                    Net Value {getSortIcon('netValue')}
                  </th>
                  <th 
                    onClick={() => handleSort('gstAmount')}
                    className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition whitespace-nowrap text-right"
                  >
                    GST Amount {getSortIcon('gstAmount')}
                  </th>
                  <th 
                    onClick={() => handleSort('totalValue')}
                    className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition whitespace-nowrap text-right"
                  >
                    Total Value {getSortIcon('totalValue')}
                  </th>
                  <th 
                    onClick={() => handleSort('docketNumber')}
                    className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition whitespace-nowrap text-left"
                  >
                    Docket Number {getSortIcon('docketNumber')}
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition whitespace-nowrap text-left"
                  >
                    Status {getSortIcon('status')}
                  </th>
                  <th className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPOs.length === 0 ? (
                  <tr>
                    <td colSpan={mode === 'Admin' ? 9 : 8} className="p-8 text-center text-xs font-semibold text-slate-400">
                      No Purchase Orders found.
                    </td>
                  </tr>
                ) : (
                  sortedPOs.map((po) => {
                    const isProcessing = processingPoIds.includes(po.id);
                    return (
                      <tr key={po.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3.5 text-xs font-bold text-slate-900 whitespace-nowrap text-left">{po.poNumber}</td>
                        <td className="p-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap text-left">{po.poDate}</td>
                        {mode === 'Admin' && (
                          <td className="p-3.5 text-xs font-semibold text-slate-600 whitespace-nowrap text-left">{po.registeredBy || 'System'}</td>
                        )}
                        <td className="p-3.5 text-xs font-bold text-slate-900 text-right whitespace-nowrap">{formatCurrency(po.netValue)}</td>
                        <td className="p-3.5 text-xs font-semibold text-slate-500 text-right whitespace-nowrap">{formatCurrency(po.gstAmount)}</td>
                        <td className="p-3.5 text-xs font-black text-slate-900 text-right whitespace-nowrap">{formatCurrency(po.totalValue)}</td>
                        <td className="p-3.5 text-xs font-semibold text-slate-600 whitespace-nowrap text-left">{po.docketNumber || '—'}</td>
                        <td className="p-3.5 text-xs whitespace-nowrap text-left">
                          {po.status === 'Dispatch Pending' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 border border-amber-200 text-amber-800 uppercase tracking-wider">
                              Dispatch Pending
                            </span>
                          )}
                          {po.status === 'Dispatched' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-50 border border-blue-200 text-blue-800 uppercase tracking-wider">
                              Dispatched
                            </span>
                          )}
                          {po.status === 'Payment Received (Pending Approval)' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-50 border border-purple-200 text-purple-800 uppercase tracking-wider animate-pulse">
                              Pending Approval
                            </span>
                          )}
                          {po.status === 'Payment Received' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 border border-emerald-200 text-emerald-800 uppercase tracking-wider">
                              Payment Received
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-xs text-center whitespace-nowrap">
                          {mode === 'Store Manager' ? (
                            <>
                              {po.status === 'Dispatch Pending' && (
                                <button
                                  onClick={() => handleTransitionStatus(po, 'Dispatched')}
                                  disabled={isProcessing}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg text-[10px] transition shadow-xs cursor-pointer select-none"
                                >
                                  {isProcessing ? 'Processing...' : (
                                    <>
                                      <span>Dispatch</span>
                                      <ArrowRight className="h-3 w-3" />
                                    </>
                                  )}
                                </button>
                              )}
                              {po.status === 'Dispatched' && (
                                <button
                                  onClick={() => handleTransitionStatus(po, 'Payment Received (Pending Approval)')}
                                  disabled={isProcessing}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold rounded-lg text-[10px] transition shadow-xs cursor-pointer select-none"
                                >
                                  {isProcessing ? 'Processing...' : (
                                    <>
                                      <span>Receive Payment</span>
                                      <Check className="h-3 w-3" />
                                    </>
                                  )}
                                </button>
                              )}
                              {(po.status === 'Payment Received (Pending Approval)' || po.status === 'Payment Received') && (
                                <span className="text-[11px] text-slate-400 font-bold">—</span>
                              )}
                            </>
                          ) : (
                            <>
                              {po.status === 'Payment Received (Pending Approval)' ? (
                                <button
                                  onClick={() => handleApprovePO(po)}
                                  disabled={isProcessing}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-lg text-[10px] transition shadow-xs cursor-pointer select-none"
                                >
                                  {isProcessing ? 'Approving...' : (
                                    <>
                                      <Check className="h-3 w-3" />
                                      <span>Approve Clearance</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-bold">—</span>
                              )}
                            </>
                          )}
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
  );
}
