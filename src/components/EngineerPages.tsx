/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, SKU, InventoryItem, EngineerStock, ProductivityLog, StockRequest, AttendanceRecord, ReturnRequest } from '../types';
import { getSku, getInvItem, fmtDate, fmtCur, genId, getMonthRange } from '../utils';
import { Plus, Trash, Send, CheckCircle, AlertTriangle, AlertOctagon, TrendingUp, Calendar, Award, PhoneCall, ListRestart, RotateCcw } from 'lucide-react';

interface EngineerPagesProps {
  currentUser: User;
  skus: SKU[];
  inventory: InventoryItem[];
  engineerStock: EngineerStock;
  productivityLogs: ProductivityLog[];
  attendance: AttendanceRecord;
  stockRequests: StockRequest[];
  returnRequests?: ReturnRequest[];
  activeTab: string;
  onAddStockRequest: (req: StockRequest) => void;
  onAddReturnRequest: (req: ReturnRequest) => void;
  onUpdateStockRequests?: (reqs: StockRequest[]) => void;
  onAddProductivityLog: (log: ProductivityLog) => void;
  onUpdateLogs?: (l: ProductivityLog[]) => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
}

export function EngineerPages({
  currentUser,
  skus,
  inventory,
  engineerStock,
  productivityLogs,
  attendance,
  stockRequests,
  returnRequests = [],
  activeTab,
  onAddStockRequest,
  onAddReturnRequest,
  onUpdateStockRequests,
  onAddProductivityLog,
  onUpdateLogs,
  onAddToast,
}: EngineerPagesProps) {
  const { prefix: currentMonthPrefix, label: currentMonthLabel } = getMonthRange();

  // Helper selectors
  const getLogsForMonth = (mPrefix: string) =>
    productivityLogs.filter((l) => l.engEmail === currentUser.email && l.date.substring(0, 7) === mPrefix);

  const getFilteredLogs = () =>
    productivityLogs.filter((l) => l.engEmail === currentUser.email);

  const calcCallsClosed = (logs: ProductivityLog[]) =>
    logs.filter(l => l.status === 'Approved').reduce((acc, curr) => acc + curr.callsClosed, 0);

  const calcRevenue = (logs: ProductivityLog[]) => {
    let rev = 0;
    logs.filter(l => l.status === 'Approved').forEach(l => {
      l.accessories.forEach(a => { rev += a.saleValue; });
    });
    return rev;
  };

  const calcIncentive = (logs: ProductivityLog[]) => {
    let inc = 0;
    logs.filter(l => l.status === 'Approved').forEach(l => {
      l.accessories.forEach(a => { inc += a.adminIncentive || 0; });
    });
    return inc;
  };

  const countPresentDays = (mPrefix: string) => {
    const userAtt = attendance[currentUser.email] || {};
    return Object.entries(userAtt).filter(([date, val]) => date.substring(0, 7) === mPrefix && val === 'Present').length;
  };

  const calcRcpCollected = (logs: ProductivityLog[]) =>
    logs.filter(l => l.status === 'Approved').reduce((acc, curr) => acc + (curr.rcpCollected || 0), 0);

  // Resubmission modal state
  const [resubmitLog, setResubmitLog] = useState<ProductivityLog | null>(null);
  const [resubmitCalls, setResubmitCalls] = useState('');
  const [resubmitRcp, setResubmitRcp] = useState('');
  const [resubmitRcpQty, setResubmitRcpQty] = useState('');
  const [resubmitLines, setResubmitLines] = useState<AccessoryLine[]>([]);
  const [logsTab, setLogsTab] = useState<'requests' | 'returns'>('requests');

  const handleStartResubmit = (log: ProductivityLog) => {
    setResubmitLog(log);
    setResubmitCalls(String(log.callsClosed));
    setResubmitRcp(String(log.rcpCollected || 0));
    setResubmitRcpQty(String(log.rcpQty || 0));
    setResubmitLines(log.accessories.map(a => ({
      skuId: a.skuId,
      qty: a.qty,
      saleValue: String(a.saleValue)
    })));
  };

  const handleResubmitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitLog || !onUpdateLogs) return;

    const callsClosed = parseInt(resubmitCalls, 10);
    if (isNaN(callsClosed) || callsClosed < 0) {
      onAddToast('Please enter a valid call output', 'error');
      return;
    }

    const rcpVal = parseFloat(resubmitRcp);
    if (resubmitRcp !== '' && (isNaN(rcpVal) || rcpVal < 0)) {
      onAddToast('Please enter a valid RCP collected amount', 'error');
      return;
    }

    const rcpQtyVal = parseInt(resubmitRcpQty, 10);
    if (resubmitRcpQty !== '' && (isNaN(rcpQtyVal) || rcpQtyVal < 0)) {
      onAddToast('Please enter a valid RCP quantity', 'error');
      return;
    }

    // Verify van stocks
    const vanStock = engineerStock[currentUser.email] || [];
    for (const line of resubmitLines) {
      const stockItem = vanStock.find((s) => s.skuId === line.skuId);
      const stockQty = stockItem ? stockItem.qty : 0;
      if (line.qty > stockQty) {
        onAddToast(`Insufficient stocks inside van for ${getSku(skus, line.skuId).name} (Vantrunk: ${stockQty})`, 'error');
        return;
      }
    }

    const updatedLogs = productivityLogs.map(l => {
      if (l.id === resubmitLog.id) {
        return {
          ...l,
          callsClosed,
          rcpCollected: rcpVal || 0,
          rcpQty: rcpQtyVal || 0,
          accessories: resubmitLines.map(line => ({
            skuId: line.skuId,
            qty: line.qty,
            saleValue: typeof line.saleValue === 'number' ? line.saleValue : (parseFloat(line.saleValue) || 0)
          })),
          status: 'Pending' as const,
          tlNote: '',
          adminNote: ''
        };
      }
      return l;
    });

    onUpdateLogs(updatedLogs);
    setResubmitLog(null);
    onAddToast('Productivity log successfully modified and re-submitted!', 'success');
  };

  if (activeTab === 'eng-dashboard') {
    const mtdLogs = getLogsForMonth(currentMonthPrefix);
    const mtdCalls = calcCallsClosed(mtdLogs);
    const mtdRev = calcRevenue(mtdLogs);
    const mtdInc = calcIncentive(mtdLogs);
    const mtdRcp = calcRcpCollected(mtdLogs);
    const mtdPresent = countPresentDays(currentMonthPrefix);

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-950">Welcome, {currentUser.name.split(' ')[0]} 👋</h1>
            <p className="text-sm font-medium text-slate-400">Month-to-date summary for <span className="font-semibold text-slate-600">{currentMonthLabel}</span></p>
          </div>
        </div>

        {/* MTD Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-indigo-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Calls Closed</span>
            <div className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-indigo-500 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">{mtdCalls}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Approved service jobs</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-emerald-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Sales Generated</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">{fmtCur(mtdRev)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Accessories revenue</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-blue-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Total RCP Generated</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">{fmtCur(mtdRcp)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">RCP collected from approved jobs</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-amber-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Attendance</span>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="text-2xl font-extrabold text-slate-950">{mtdPresent} Days</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Marked present on jobs</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-rose-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Incentives Earned</span>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-rose-500 shrink-0" />
              <span className="text-2xl font-extrabold text-[#0782f5]">{fmtCur(mtdInc)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Cash payout from accessories</p>
          </div>
        </div>

        {/* Monthly Table Card */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-slate-950 mb-4 flex items-center justify-between">
            Monthly Log Entries 
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">{mtdLogs.length} total</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Date</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Calls Done</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Accessories Sold</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Revenue (₹)</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">RCP Collected (₹)</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">RCP Qty</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Incentive (₹)</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {mtdLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                      <ListRestart className="mx-auto h-8 w-8 text-indigo-200 mb-2" />
                      No performance logged for this month yet.
                    </td>
                  </tr>
                ) : (
                  mtdLogs
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((l) => {
                      const logRev = l.accessories.reduce((s, a) => s + a.saleValue, 0);
                      const approvedInc = l.status === 'Approved' 
                      ? l.accessories.reduce((s, a) => s + (a.adminIncentive || 0), 0) 
                      : null;

                      return (
                        <tr key={l.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-semibold text-slate-950">{fmtDate(l.date)}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">{l.callsClosed}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                            {l.accessories.length > 0
                              ? l.accessories.map((a) => `${getSku(skus, a.skuId).name} (×${a.qty})`).join(', ')
                              : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-900 font-semibold">{fmtCur(logRev)}</td>
                          <td className="py-3.5 px-4 text-slate-900 font-semibold text-indigo-650">{fmtCur(l.rcpCollected || 0)}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">{l.rcpQty || 0}</td>
                          <td className="py-3.5 px-4">
                            {approvedInc !== null ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                                {fmtCur(approvedInc)}
                              </span>
                            ) : (
                              <span className="text-slate-400">Pending Approval</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                l.status === 'Approved'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : l.status === 'Validated by TL'
                                  ? 'bg-sky-50 border-sky-200 text-sky-850'
                                  : l.status === 'Validated by SM'
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-850'
                                  : l.status === 'Rejected'
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : 'bg-amber-50 border-amber-200 text-amber-800'
                              }`}
                            >
                              {l.status}
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

  // Log Daily Productivity & Approval status tracker unified view
  if (activeTab === 'eng-productivity' || activeTab === 'eng-status') {
    const logs = getFilteredLogs().sort((a, b) => b.date.localeCompare(a.date));
    const firstDay = new Date(currentMonthPrefix + '-01');
    const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
    const userAtt = attendance[currentUser.email] || {};
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const startDow = firstDay.getDay();

    const calCells = [];
    // padding for offsets
    for (let i = 0; i < startDow; i++) {
      calCells.push(<div key={`empty-${i}`} className="aspect-square bg-transparent"></div>);
    }
    const todayStr = new Date().toISOString().split('T')[0];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentMonthPrefix}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const attStatus = userAtt[dateStr];
      const dateObj = new Date(dateStr);
      const isPast = dateObj < new Date();

      let cellClass = 'aspect-square rounded-xl p-1.5 flex flex-col justify-between border text-[11px] font-bold ';
      let statusIndicator = null;

      if (attStatus === 'Present') {
        cellClass += 'bg-emerald-50 border-emerald-300 text-emerald-950';
        statusIndicator = <span className="h-1 w-1 rounded-full bg-emerald-500 self-center"></span>;
      } else if (isPast && !attStatus && dateObj.getDay() !== 0) { // skip sundays for auto-absent visual
        cellClass += 'bg-rose-50 border-rose-200 text-rose-950';
        statusIndicator = <span className="h-1 w-1 rounded-full bg-rose-400 self-center"></span>;
      } else {
        cellClass += 'bg-slate-50 border-slate-200 text-slate-400';
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

    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">Log Productivity & Tracker</h1>
          <p className="text-sm font-medium text-slate-405">Record your daily performance, monitor validation workflows, and view calendar attendance.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Daily Submission Form Card */}
          <div className="lg:col-span-5">
            <LogProductivityTab 
              currentUser={currentUser} 
              skus={skus} 
              engineerStock={engineerStock} 
              onAddProductivityLog={onAddProductivityLog} 
              onAddToast={onAddToast}
            />
          </div>

          {/* Column 2: Quick stats & Attendance calendar */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
                <h2 className="font-display text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Validation summary</h2>
                <div className="space-y-2 divide-y divide-slate-100">
                  {['Pending', 'Validated by TL', 'Validated by SM', 'Approved', 'Rejected'].map((status) => {
                    const count = logs.filter((l) => l.status === status).length;
                    return (
                      <div key={status} className="flex items-center justify-between pt-2 first:pt-0 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            status === 'Approved'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : status === 'Validated by TL'
                              ? 'bg-sky-50 border-sky-150 text-sky-850'
                              : status === 'Validated by SM'
                              ? 'bg-blue-50 border-blue-150 text-blue-800'
                              : status === 'Rejected'
                              ? 'bg-rose-50 border-rose-200 text-rose-800'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                        >
                          {status}
                        </span>
                        <strong className="text-slate-905">{count} entries</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm flex flex-col justify-between text-xs leading-relaxed font-semibold">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-950 mb-1.5">💡 Validation Rules</h3>
                  <p className="text-slate-400 font-medium">Daily productivity logs require progressive operational consent:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 mt-2 text-slate-500 font-medium">
                    <li>Team Leader Validation</li>
                    <li>Store Manager Validation</li>
                    <li>Admin audit & final release</li>
                  </ul>
                </div>
                <p className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 p-2 rounded-lg mt-3">
                  Rejected logs can be corrected and resubmitted below.
                </p>
              </div>
            </div>

            {/* Calendar Widget */}
            <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
              <h2 className="font-display text-sm font-bold text-slate-950 mb-4 flex items-center justify-between">
                Attendance Calendar - {currentMonthLabel}
                <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5">Live verified</span>
              </h2>
              <div className="grid grid-cols-7 gap-1.5 text-center font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                {dayNames.map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calCells}
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Present Day (Logged approved duties)
                </span>
                <span className="flex items-center gap-1.5 text-rose-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400"></span> Absent Day / Off
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Log-out Table */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-slate-950 mb-3">Historical Logs History</h2>
          <div className="overflow-x-auto text-sm font-medium">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Date</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Calls Done</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Revenue (₹)</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Incentive (₹)</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Status</th>
                  <th className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400">Review Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">No logs on record. Log your daily work on the form above.</td>
                  </tr>
                ) : (
                  logs.map((l) => {
                    const rev = l.accessories.reduce((s, a) => s + a.saleValue, 0);
                    const incVal = l.status === 'Approved' ? l.accessories.reduce((s, a) => s + (a.adminIncentive || 0), 0) : null;
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-semibold text-slate-950">{fmtDate(l.date)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{l.callsClosed}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-semibold">{fmtCur(rev)}</td>
                        <td className="py-3.5 px-4 font-bold">
                          {incVal !== null ? <span className="text-rose-600">{fmtCur(incVal)}</span> : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                l.status === 'Approved'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : l.status === 'Validated by TL'
                                  ? 'bg-sky-50 border-sky-150 text-sky-850'
                                  : l.status === 'Validated by SM'
                                  ? 'bg-blue-50 border-blue-150 text-blue-800'
                                  : l.status === 'Rejected'
                                  ? 'bg-rose-50 border-rose-250 text-rose-800'
                                  : 'bg-amber-50 border-amber-200 text-amber-800'
                              }`}
                            >
                              {l.status}
                            </span>
                            {l.status === 'Rejected' && onUpdateLogs && (
                              <button
                                onClick={() => handleStartResubmit(l)}
                                className="inline-flex items-center gap-0.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
                              >
                                <ListRestart className="h-3 w-3" /> Re-submit
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs truncate max-w-xs" title={l.tlNote || l.adminNote}>
                          {l.tlNote ? `TL: "${l.tlNote}"` : l.adminNote ? `SM/Admin: "${l.adminNote}"` : 'No reviews or notes recorded'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit & Resubmit Modal Overlay */}
        {resubmitLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display text-lg font-extrabold text-slate-950">
                    Re-submit Productivity Log ({resubmitLog.id})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Correct details and submit back to Team Leader for verification.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResubmitLog(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  ✕ Close
                </button>
              </div>

              {(resubmitLog.tlNote || resubmitLog.adminNote) && (
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs text-rose-900 leading-relaxed font-semibold">
                  <strong>Rejection Feedback:</strong> "{resubmitLog.tlNote || resubmitLog.adminNote}"
                </div>
              )}

              <form onSubmit={handleResubmitSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
                      Calls Closed
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={resubmitCalls}
                      onChange={(e) => setResubmitCalls(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/20 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
                      RCP Collected (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={resubmitRcp}
                      onChange={(e) => setResubmitRcp(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/20 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
                      RCP Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={resubmitRcpQty}
                      onChange={(e) => setResubmitRcpQty(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/20 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Accessories list */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Accessories Sold On Jobs</span>
                    <button
                      type="button"
                      onClick={() => {
                        const vanStock = engineerStock[currentUser.email] || [];
                        const firstStockAvailableSku = skus.find((s) => {
                          const vsItem = vanStock.find((x) => x.skuId === s.id);
                          return vsItem && vsItem.qty > 0;
                        });
                        const initialSku = firstStockAvailableSku?.id || skus[0]?.id || '';
                        setResubmitLines([...resubmitLines, { skuId: initialSku, qty: 1, saleValue: '' }]);
                      }}
                      className="text-xs font-bold text-indigo-650 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition"
                    >
                      + Add Accessory
                    </button>
                  </div>

                  {resubmitLines.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2 italic border border-dashed border-slate-100 rounded-xl">
                      No accessories listed for this submission.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {resubmitLines.map((ln, idx) => {
                        const vanStock = engineerStock[currentUser.email] || [];
                        const stockItem = vanStock.find((v) => v.skuId === ln.skuId);
                        const stockQty = stockItem ? stockItem.qty : 0;

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <select
                              value={ln.skuId}
                              onChange={(e) => {
                                const updated = [...resubmitLines];
                                updated[idx] = { ...updated[idx], skuId: e.target.value };
                                setResubmitLines(updated);
                              }}
                              className="w-full sm:w-1/2 rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs font-semibold focus:border-indigo-600 outline-none"
                            >
                              {skus
                                .filter((s) => {
                                  const vsItem = vanStock.find((x) => x.skuId === s.id);
                                  const vQty = vsItem ? vsItem.qty : 0;
                                  return vQty > 0 || s.id === ln.skuId;
                                })
                                .map((s) => {
                                  const vsItem = vanStock.find((x) => x.skuId === s.id);
                                  const vQty = vsItem ? vsItem.qty : 0;
                                  return (
                                    <option key={s.id} value={s.id}>
                                      {s.id} - {s.name} (Van Trunk: {vQty})
                                    </option>
                                  );
                                })}
                            </select>

                            <input
                              type="number"
                              min="1"
                              required
                              placeholder="Qty"
                              value={ln.qty}
                              onChange={(e) => {
                                const updated = [...resubmitLines];
                                updated[idx] = { ...updated[idx], qty: parseInt(e.target.value, 10) || 0 };
                                setResubmitLines(updated);
                              }}
                              className="w-full sm:w-20 rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs font-semibold focus:border-indigo-600 outline-none"
                            />

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              placeholder="Price"
                              value={ln.saleValue}
                              onChange={(e) => {
                                const updated = [...resubmitLines];
                                updated[idx] = { ...updated[idx], saleValue: e.target.value };
                                setResubmitLines(updated);
                              }}
                              className="w-full sm:w-24 rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs font-semibold focus:border-indigo-600 outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => setResubmitLines(resubmitLines.filter((_, i) => i !== idx))}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 self-end sm:self-center"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setResubmitLog(null)}
                    className="rounded-xl border border-slate-200 px-4.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
                  >
                    Re-submit Log
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Engineer stock requests
  if (activeTab === 'eng-stock') {
    const stockList = engineerStock[currentUser.email] || [];
    const engRequests = stockRequests.filter((r) => r.engEmail === currentUser.email);
    const myReturns = (returnRequests || []).filter((r) => r.engEmail === currentUser.email);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">My Van Stock</h1>
          <p className="text-sm font-medium text-slate-400">Track items inside your tool trunk and submit allocation requests</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trunk Stock Inventory List */}
          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <h2 className="font-display text-sm font-bold text-slate-950 mb-4">Van Storage Inventory</h2>
            <div className="overflow-x-auto text-sm font-medium">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">SKU Code</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Item Name</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Available Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-slate-400">
                        No stocking assigned to this vehicle yet. Use the requester form on the right.
                      </td>
                    </tr>
                  ) : (
                    stockList.map((s) => {
                      const details = getSku(skus, s.skuId);
                      return (
                        <tr key={s.skuId} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 rounded-lg px-2 py-0.5">
                              {s.skuId}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-900">{details.name}</td>
                          <td className="py-3 px-3 font-bold text-slate-800">{s.qty} units</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Sku Actions (Request / Return) Tabbed Form */}
          <VanStockActionsForm
            currentUser={currentUser}
            skus={skus}
            engineerStock={engineerStock}
            onAddStockRequest={onAddStockRequest}
            onAddReturnRequest={onAddReturnRequest}
            onAddToast={onAddToast}
          />
        </div>

        {/* Requests / Returns Logs */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-slate-950">Van Stock Log History</h2>
            
            {/* Logs Tab Selector */}
            <div className="flex border-b border-slate-100 self-start sm:self-auto">
              <button
                onClick={() => setLogsTab('requests')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition ${
                  logsTab === 'requests'
                    ? 'border-indigo-650 text-indigo-650'
                    : 'border-transparent text-slate-400 hover:text-slate-650'
                }`}
              >
                Allocation Requests ({engRequests.length})
              </button>
              <button
                onClick={() => setLogsTab('returns')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition ${
                  logsTab === 'returns'
                    ? 'border-indigo-650 text-indigo-650'
                    : 'border-transparent text-slate-400 hover:text-slate-650'
                }`}
              >
                Returns ({myReturns.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto text-sm font-medium">
            {logsTab === 'requests' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Request ID</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">SKU Code</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Item Description</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Qty Needed</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Requested Date</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Approval Status</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {engRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No stock requests recorded for your profile.
                      </td>
                    </tr>
                  ) : (
                    engRequests
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((r) => (
                        <tr key={r.id}>
                          <td className="py-3 px-3 text-xs text-slate-400">{r.id}</td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 rounded-lg px-2 py-0.5">
                              {r.skuId}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-900">{getSku(skus, r.skuId).name}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{r.qty} units</td>
                          <td className="py-3 px-3 text-slate-500">{fmtDate(r.date)}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                r.status === 'Approved'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : r.status === 'Rejected'
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : r.status === 'Revoke-Pending'
                                  ? 'bg-violet-50 border-violet-100 text-violet-800'
                                  : r.status === 'Revoked'
                                  ? 'bg-slate-100 border-slate-200 text-slate-650'
                                  : 'bg-amber-50 border-amber-200 text-amber-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {r.status === 'Rejected' && onUpdateStockRequests ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = stockRequests.map((req) => {
                                    if (req.id === r.id) {
                                      return { ...req, status: 'Pending' as const };
                                    }
                                    return req;
                                  });
                                  onUpdateStockRequests(updated);
                                  onAddToast(`Stock Request ${r.id} raised again successfully!`, 'success');
                                }}
                                className="inline-flex items-center gap-0.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
                              >
                                <ListRestart className="h-3 w-3" /> Raise Again
                              </button>
                            ) : (
                              <span className="text-slate-300 font-medium">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Return ID</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">SKU Code</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Item Description</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Qty returning</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Requested Date</th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myReturns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No return requests recorded for your profile.
                      </td>
                    </tr>
                  ) : (
                    myReturns
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((r) => (
                        <tr key={r.id}>
                          <td className="py-3 px-3 text-xs text-slate-400">{r.id}</td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 rounded-lg px-2 py-0.5">
                              {r.skuId}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-900">{getSku(skus, r.skuId).name}</td>
                          <td className="py-3 px-3 font-semibold text-slate-805">-{r.qty} units</td>
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
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Subcomponent: Van Stock Actions Form (Request / Return)
function VanStockActionsForm({
  currentUser,
  skus,
  engineerStock,
  onAddStockRequest,
  onAddReturnRequest,
  onAddToast,
}: {
  currentUser: User;
  skus: SKU[];
  engineerStock: EngineerStock;
  onAddStockRequest: (req: StockRequest) => void;
  onAddReturnRequest: (req: ReturnRequest) => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [activeForm, setActiveForm] = useState<'request' | 'return'>('request');

  const stockList = engineerStock[currentUser.email] || [];
  const availableSkus = stockList.filter(s => s.qty > 0);

  // request form states
  const [requestSkuId, setRequestSkuId] = useState(skus[0]?.id || '');
  const [requestQty, setRequestQty] = useState('');

  // return form states
  const [returnSkuId, setReturnSkuId] = useState(availableSkus[0]?.skuId || '');
  const [returnQty, setReturnQty] = useState('');

  // automatically update return Sku selection when list changes
  useEffect(() => {
    if (availableSkus.length > 0 && !availableSkus.some(s => s.skuId === returnSkuId)) {
      setReturnSkuId(availableSkus[0].skuId);
    }
  }, [availableSkus, returnSkuId]);

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = parseInt(requestQty, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      onAddToast('Please enter a valid request quantity', 'error');
      return;
    }

    const newReq: StockRequest = {
      id: genId('SR'),
      engEmail: currentUser.email,
      skuId: requestSkuId,
      qty: parsedQty,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
    };

    onAddStockRequest(newReq);
    setRequestQty('');
    onAddToast('Stock request sent to store controller successfully!');
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnSkuId) {
      onAddToast('No available stock to return', 'error');
      return;
    }

    const parsedQty = parseInt(returnQty, 10);
    const availableItem = availableSkus.find(s => s.skuId === returnSkuId);
    const maxQty = availableItem ? availableItem.qty : 0;

    if (isNaN(parsedQty) || parsedQty <= 0) {
      onAddToast('Please enter a valid return quantity', 'error');
      return;
    }
    if (parsedQty > maxQty) {
      onAddToast(`Cannot return more than available van stock (${maxQty} units)`, 'error');
      return;
    }

    const newReq: ReturnRequest = {
      id: genId('RR'),
      engEmail: currentUser.email,
      skuId: returnSkuId,
      qty: parsedQty,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
    };

    onAddReturnRequest(newReq);
    setReturnQty('');
    onAddToast('Stock return request submitted for Store Manager approval!');
  };

  return (
    <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveForm('request')}
          className={`flex-1 pb-3 text-xs font-bold border-b-2 tracking-wide uppercase transition ${
            activeForm === 'request'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-655'
          }`}
        >
          Request Stock
        </button>
        <button
          onClick={() => setActiveForm('return')}
          className={`flex-1 pb-3 text-xs font-bold border-b-2 tracking-wide uppercase transition ${
            activeForm === 'return'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-655'
          }`}
        >
          Return Stock
        </button>
      </div>

      {activeForm === 'request' ? (
        <form onSubmit={handleRequestSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
              Select SKU
            </label>
            <select
              value={requestSkuId}
              onChange={(e) => setRequestSkuId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
            >
              {skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} – {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              required
              value={requestQty}
              onChange={(e) => setRequestQty(e.target.value)}
              placeholder="e.g. 10"
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/10 outline-none transition duration-150 hover:bg-slate-900"
          >
            <Send className="h-4 w-4" /> Submit Request
          </button>
        </form>
      ) : (
        <form onSubmit={handleReturnSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
              Select SKU to Return
            </label>
            {availableSkus.length === 0 ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-xs font-semibold text-rose-800 text-center">
                No items available in your van stock to return.
              </div>
            ) : (
              <select
                value={returnSkuId}
                onChange={(e) => setReturnSkuId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
              >
                {availableSkus.map((s) => {
                  const skuItem = getSku(skus, s.skuId);
                  return (
                    <option key={s.skuId} value={s.skuId}>
                      {s.skuId} – {skuItem.name} (Van stock: {s.qty} units)
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {availableSkus.length > 0 && (
            <>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
                  Return Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={returnQty}
                  onChange={(e) => setReturnQty(e.target.value)}
                  placeholder={`Max ${availableSkus.find(s => s.skuId === returnSkuId)?.qty || 0} units`}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/10 outline-none transition duration-150 hover:bg-slate-900"
              >
                <RotateCcw className="h-4 w-4" /> Submit Return Request
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}

// Subcomponent: Log Daily Productivity Tab
interface AccessoryLine {
  skuId: string;
  qty: number;
  saleValue: number | string;
}

function LogProductivityTab({
  currentUser,
  skus,
  engineerStock,
  onAddProductivityLog,
  onAddToast,
}: {
  currentUser: User;
  skus: SKU[];
  engineerStock: EngineerStock;
  onAddProductivityLog: (log: ProductivityLog) => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [calls, setCalls] = useState('');
  const [rcpCollected, setRcpCollected] = useState('');
  const [rcpQty, setRcpQty] = useState('');
  const [lines, setLines] = useState<AccessoryLine[]>([]);

  const vanStock = engineerStock[currentUser.email] || [];

  const [newSkuId, setNewSkuId] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newSaleValue, setNewSaleValue] = useState('');

  useEffect(() => {
    if (!newSkuId && skus.length > 0) {
      const firstStockAvailableSku = skus.find((s) => {
        const vsItem = vanStock.find((x) => x.skuId === s.id);
        return vsItem && vsItem.qty > 0;
      });
      setNewSkuId(firstStockAvailableSku?.id || skus[0]?.id || '');
    }
  }, [skus, vanStock, newSkuId]);

  const handleRemoveLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleAddNewLine = () => {
    if (!newSkuId) {
      onAddToast('Please select a SKU first.', 'error');
      return;
    }
    const qtyInt = parseInt(newQty, 10);
    if (isNaN(qtyInt) || qtyInt <= 0) {
      onAddToast('Quantity sold must be greater than zero.', 'error');
      return;
    }
    const saleValFloat = parseFloat(newSaleValue);
    if (isNaN(saleValFloat) || saleValFloat < 0) {
      onAddToast('Please enter a valid sale value.', 'error');
      return;
    }

    // Check van stock
    const stockItem = vanStock.find((s) => s.skuId === newSkuId);
    const stockQty = stockItem ? stockItem.qty : 0;
    const alreadyAddedQty = lines
      .filter((ln) => ln.skuId === newSkuId)
      .reduce((sum, ln) => sum + Number(ln.qty), 0);

    if (qtyInt + alreadyAddedQty > stockQty) {
      onAddToast(`Insufficient stocks inside van for ${getSku(skus, newSkuId).name} (Trunk: ${stockQty}, Already added: ${alreadyAddedQty})`, 'error');
      return;
    }

    // Add or merge line
    const existingIdx = lines.findIndex((ln) => ln.skuId === newSkuId);
    if (existingIdx > -1) {
      const updated = [...lines];
      updated[existingIdx] = {
        ...updated[existingIdx],
        qty: Number(updated[existingIdx].qty) + qtyInt,
        saleValue: Number(updated[existingIdx].saleValue) + saleValFloat
      };
      setLines(updated);
    } else {
      setLines([...lines, { skuId: newSkuId, qty: qtyInt, saleValue: saleValFloat }]);
    }

    // Reset inputs
    setNewQty('1');
    setNewSaleValue('');
    onAddToast('Accessory added successfully!', 'success');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const callsClosed = parseInt(calls, 10);
    if (isNaN(callsClosed) || callsClosed < 0) {
      onAddToast('Please enter a valid call output code', 'error');
      return;
    }

    const rcpVal = parseFloat(rcpCollected);
    if (rcpCollected !== '' && (isNaN(rcpVal) || rcpVal < 0)) {
      onAddToast('Please enter a valid RCP collected amount', 'error');
      return;
    }

    const rcpQtyVal = parseInt(rcpQty, 10);
    if (rcpQty !== '' && (isNaN(rcpQtyVal) || rcpQtyVal < 0)) {
      onAddToast('Please enter a valid RCP quantity', 'error');
      return;
    }

    // Verify van stocks for each line item
    for (const line of lines) {
      const stockItem = vanStock.find((s) => s.skuId === line.skuId);
      const stockQty = stockItem ? stockItem.qty : 0;
      if (line.qty > stockQty) {
        onAddToast(`Insufficient stocks inside van for ${getSku(skus, line.skuId).name} (Vantrunk: ${stockQty})`, 'error');
        return;
      }
    }

    const newLog: ProductivityLog = {
      id: genId('PL'),
      engEmail: currentUser.email,
      date,
      callsClosed,
      rcpCollected: rcpVal || 0,
      rcpQty: rcpQtyVal || 0,
      accessories: lines.map((l) => ({
        skuId: l.skuId,
        qty: l.qty,
        saleValue: typeof l.saleValue === 'number' ? l.saleValue : (parseFloat(l.saleValue) || 0),
      })),
      status: 'Pending',
      tlNote: '',
      adminNote: '',
    };

    onAddProductivityLog(newLog);
    // Reset
    setCalls('');
    setRcpCollected('');
    setRcpQty('');
    setLines([]);
    onAddToast('Daily performance record saved successfully!');
  };

  return (
    <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
      <h2 id="log-productivity-form-title" className="font-display text-sm font-bold text-slate-950 mb-4 flex items-center gap-2">
        <Plus className="h-4 w-4 text-indigo-600" />
        Log Daily Performance
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
              Calls Closed
            </label>
            <input
              type="number"
              min="0"
              required
              value={calls}
              onChange={(e) => setCalls(e.target.value)}
              placeholder="e.g. 5"
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
              RCP Collected (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={rcpCollected}
              onChange={(e) => setRcpCollected(e.target.value)}
              placeholder="e.g. 4500"
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
              RCP Qty
            </label>
            <input
              type="number"
              min="0"
              required
              value={rcpQty}
              onChange={(e) => setRcpQty(e.target.value)}
              placeholder="e.g. 2"
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xs font-bold text-slate-900 uppercase tracking-wider">
              ACCESSORIES SOLD ON JOBS
            </h3>
            {lines.length === 0 && (
              <span className="text-xs font-bold text-slate-400">
                Add items first to record them
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/50 bg-slate-50/10 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-950">
              <span className="h-2 w-2 rounded-full bg-indigo-650 inline-block"></span>
              NEW SKU ITEM ADDITION
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Product SKU / Availability
                </label>
                <select
                  value={newSkuId}
                  onChange={(e) => setNewSkuId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
                >
                  <option value="">Select SKU...</option>
                  {skus
                    .filter((s) => {
                      const vsItem = vanStock.find((x) => x.skuId === s.id);
                      return vsItem && vsItem.qty > 0;
                    })
                    .map((s) => {
                      return (
                        <option key={s.id} value={s.id}>
                          {s.id} - {s.name}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Qty Sold
                </label>
                <input
                  type="number"
                  min="1"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Sale Value (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newSaleValue}
                  onChange={(e) => setNewSaleValue(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddNewLine}
                  className="w-full flex items-center justify-center rounded-xl bg-indigo-900 hover:bg-slate-900 text-white font-extrabold py-3 text-sm transition shadow-md shadow-indigo-900/10 cursor-pointer h-[46px]"
                >
                  Add
                </button>
              </div>
            </div>

            {newSkuId && (
              <div className="mt-1 flex items-center gap-1">
                {(() => {
                  const vsItem = vanStock.find((x) => x.skuId === newSkuId);
                  const vQty = vsItem ? vsItem.qty : 0;
                  return vQty === 0 ? (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-rose-600 text-left">
                      <AlertOctagon className="h-4 w-4 shrink-0 text-rose-600" /> Zero trunk stocks! Requester form first
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-800 text-left">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 animate-pulse" /> Van Stock Trunk: {vQty} units available
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                ADDED ACCESSORIES ({lines.length})
              </h4>
              <div className="space-y-3">
                {lines.map((ln, idx) => {
                  const skuItem = getSku(skus, ln.skuId);
                  return (
                    <div
                      key={`added-${idx}`}
                      className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800 font-bold">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                          <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-100/50">
                            {ln.skuId}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>{skuItem.name}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-600 font-semibold">Qty: {ln.qty}</span>
                        </div>
                        <div className="text-emerald-700 font-extrabold text-sm pl-4.5">
                          Value: {fmtCur(Number(ln.saleValue))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="rounded-xl border border-slate-200 hover:border-rose-200 p-2 text-slate-400 hover:text-rose-600 transition bg-white cursor-pointer shrink-0"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-bold px-5 py-3 hover:bg-slate-900 shadow-md shadow-indigo-600/10 transition"
          >
            <Send className="h-4 w-4 shrink-0" /> Submit Daily Entry
          </button>
        </div>
      </form>
    </div>
  );
}
