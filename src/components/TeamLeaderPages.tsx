/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, SKU, ProductivityLog, AttendanceRecord, LPRequest, AttendanceRequest } from '../types';
import { getSku, getUser, fmtDate, fmtCur, getMonthRange } from '../utils';
import { ThumbsUp, ThumbsDown, CheckCircle, Clock, FileText, Award, Calendar, PhoneCall, DollarSign, Plus, ListRestart, Search, Users, Download, X } from 'lucide-react';

interface TeamLeaderPagesProps {
  currentUser: User;
  users: User[];
  skus: SKU[];
  productivityLogs: ProductivityLog[];
  attendance: AttendanceRecord;
  attendanceRequests: AttendanceRequest[];
  onAddAttendanceRequest: (req: AttendanceRequest) => void;
  onUpdateAttendanceRequests: (reqs: AttendanceRequest[]) => void;
  activeTab: string;
  lpRequests: LPRequest[];
  onAddLpRequest: (lp: LPRequest) => void;
  onUpdateLpRequests: (lp: LPRequest[]) => void;
  onUpdateLogStatus: (id: string, status: 'Validated by TL' | 'Rejected', note: string) => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
}

export function TeamLeaderPages({
  currentUser,
  users,
  skus,
  productivityLogs,
  attendance,
  attendanceRequests = [],
  onAddAttendanceRequest,
  onUpdateAttendanceRequests,
  activeTab,
  lpRequests,
  onAddLpRequest,
  onUpdateLpRequests,
  onUpdateLogStatus,
  onAddToast,
}: TeamLeaderPagesProps) {
  const { prefix: currentMonthPrefix, label: currentMonthLabel } = getMonthRange();
  const engineers = users.filter((u) => u.role === 'Engineer');

  // Stats calculation
  const getLogsForEngMonth = (email: string, mPrefix: string) =>
    productivityLogs.filter((l) => l.engEmail === email && l.date.substring(0, 7) === mPrefix);

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

  const calcRcpCollected = (logs: ProductivityLog[]) =>
    logs.filter(l => l.status === 'Approved').reduce((acc, curr) => acc + (curr.rcpCollected || 0), 0);

  const calcRcpQty = (logs: ProductivityLog[]) =>
    logs.filter(l => l.status === 'Approved').reduce((acc, curr) => acc + (curr.rcpQty || 0), 0);

  const countPresentDays = (email: string, mPrefix: string) => {
    const userAtt = attendance[email] || {};
    return Object.entries(userAtt).filter(([date, val]) => date.substring(0, 7) === mPrefix && val === 'Present').length;
  };

  // TL Approvals Local Tab State
  const [tlQueueTab, setTlQueueTab] = useState<'pending' | 'done'>('pending');
  // Local notes state for textareas
  const [tlNotes, setTlNotes] = useState<Record<string, string>>({});
  const [processingProductivityIds, setProcessingProductivityIds] = useState<string[]>([]);
  const [selectedTLMonth, setSelectedTLMonth] = useState(currentMonthPrefix);

  const getMonthLabel = (mPrefix: string) => {
    if (mPrefix === currentMonthPrefix) return currentMonthLabel;
    try {
      const [year, month] = mPrefix.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    } catch {
      return mPrefix;
    }
  };

  // Search and filter states for TL Validation Queue
  const [tlSearchQuery, setTlSearchQuery] = useState('');
  const [tlSelectedEng, setTlSelectedEng] = useState('');
  const [tlSelectedStatus, setTlSelectedStatus] = useState('');

  // Attendance Marking State
  const [attEngEmail, setAttEngEmail] = useState('');
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState<'Present' | 'Leave'>('Present');
  const [attRemarks, setAttRemarks] = useState('');
  // Sorting states
  const [consolidatedSortKey, setConsolidatedSortKey] = useState<'profile' | 'present' | 'calls' | 'revenue' | 'perCall' | 'rcpValue' | 'rcpQty'>('profile');
  const [consolidatedSortAsc, setConsolidatedSortAsc] = useState<boolean>(true);

  const [processedSortKey, setProcessedSortKey] = useState<'id' | 'engineer' | 'date' | 'calls' | 'rcp' | 'rcpQty' | 'status'>('date');
  const [processedSortAsc, setProcessedSortAsc] = useState<boolean>(false);

  const [attendanceSortKey, setAttendanceSortKey] = useState<'id' | 'name' | 'date' | 'proposed' | 'remarks' | 'status'>('date');
  const [attendanceSortAsc, setAttendanceSortAsc] = useState<boolean>(false);

  const [lpClaimsSortKey, setLpClaimsSortKey] = useState<'id' | 'jobId' | 'spareCost' | 'serviceCost' | 'total' | 'status'>('id');
  const [lpClaimsSortAsc, setLpClaimsSortAsc] = useState<boolean>(false);

  const renderSortIndicator = (currentKey: string, activeKey: string, ascending: boolean) => {
    if (activeKey !== currentKey) {
      return <span className="ml-1 text-slate-300 select-none text-[10px]">⇅</span>;
    }
    return ascending ? (
      <span className="ml-1 text-indigo-650 select-none text-[10px]">▲</span>
    ) : (
      <span className="ml-1 text-indigo-650 select-none text-[10px]">▼</span>
    );
  };

  const pendingList = productivityLogs.filter((l) => l.status === 'Pending').sort((a, b) => a.date.localeCompare(b.date));
  const doneList = productivityLogs.filter((l) => l.status === 'Validated by TL' || l.status === 'Validated by SM' || l.status === 'Approved' || l.status === 'Rejected').sort((a, b) => b.date.localeCompare(a.date));

  const filteredPendingList = pendingList.filter((l) => {
    const engineer = getUser(users, l.engEmail);
    const matchesSearch =
      l.id.toLowerCase().includes(tlSearchQuery.toLowerCase()) ||
      engineer.name.toLowerCase().includes(tlSearchQuery.toLowerCase()) ||
      l.engEmail.toLowerCase().includes(tlSearchQuery.toLowerCase()) ||
      l.date.toLowerCase().includes(tlSearchQuery.toLowerCase());
    
    const matchesEng = !tlSelectedEng || l.engEmail === tlSelectedEng;
    return matchesSearch && matchesEng;
  });

  const filteredDoneList = doneList.filter((l) => {
    const engineer = getUser(users, l.engEmail);
    const matchesSearch =
      l.id.toLowerCase().includes(tlSearchQuery.toLowerCase()) ||
      engineer.name.toLowerCase().includes(tlSearchQuery.toLowerCase()) ||
      l.engEmail.toLowerCase().includes(tlSearchQuery.toLowerCase()) ||
      l.date.toLowerCase().includes(tlSearchQuery.toLowerCase());
    
    const matchesEng = !tlSelectedEng || l.engEmail === tlSelectedEng;
    const matchesStatus = !tlSelectedStatus || l.status === tlSelectedStatus;
    return matchesSearch && matchesEng && matchesStatus;
  });

  const handleTLAction = (logId: string, action: 'Validated by TL' | 'Rejected') => {
    const note = tlNotes[logId] || '';
    if (processingProductivityIds.includes(logId)) return;
    setProcessingProductivityIds((prev) => [...prev, logId]);

    setTimeout(() => {
      onUpdateLogStatus(logId, action, note);
      onAddToast(action === 'Validated by TL' ? 'Entry successfully validated and forwarded to Store Manager!' : 'Log rejected.', 'success');
      // Clear local note
      setTlNotes(prev => {
        const copy = { ...prev };
        delete copy[logId];
        return copy;
      });
      setProcessingProductivityIds((prev) => prev.filter((id) => id !== logId));
    }, 1000);
  };

  if (activeTab === 'tl-dashboard') {
    const toggleConsolidatedSort = (key: typeof consolidatedSortKey) => {
      if (consolidatedSortKey === key) {
        setConsolidatedSortAsc(!consolidatedSortAsc);
      } else {
        setConsolidatedSortKey(key);
        setConsolidatedSortAsc(true);
      }
    };

    const consolidatedData = engineers.map((eng) => {
      const logs = getLogsForEngMonth(eng.email, selectedTLMonth);
      const present = countPresentDays(eng.email, selectedTLMonth);
      const calls = calcCallsClosed(logs);
      const rev = calcRevenue(logs);
      const perCallRevenue = calls > 0 ? rev / calls : 0;
      const rcpCollected = calcRcpCollected(logs);
      const rcpQty = calcRcpQty(logs);

      return {
        eng,
        present,
        calls,
        rev,
        perCallRevenue,
        rcpCollected,
        rcpQty
      };
    });

    const sortedConsolidated = [...consolidatedData].sort((a, b) => {
      let comparison = 0;
      if (consolidatedSortKey === 'profile') {
        comparison = a.eng.name.localeCompare(b.eng.name) || a.eng.email.localeCompare(b.eng.email);
      } else if (consolidatedSortKey === 'present') {
        comparison = a.present - b.present;
      } else if (consolidatedSortKey === 'calls') {
        comparison = a.calls - b.calls;
      } else if (consolidatedSortKey === 'revenue') {
        comparison = a.rev - b.rev;
      } else if (consolidatedSortKey === 'perCall') {
        comparison = a.perCallRevenue - b.perCallRevenue;
      } else if (consolidatedSortKey === 'rcpValue') {
        comparison = a.rcpCollected - b.rcpCollected;
      } else if (consolidatedSortKey === 'rcpQty') {
        comparison = a.rcpQty - b.rcpQty;
      }
      return consolidatedSortAsc ? comparison : -comparison;
    });

    const handleDownloadCSV = () => {
      const headers = [
        "Engineer Name",
        "Engineer Email",
        "Days Present",
        "Calls Done",
        "Accessories Revenue (INR)",
        "Per Call Revenue (INR)",
        "RCP Value (INR)",
        "RCP Qty"
      ];

      const rows = sortedConsolidated.map(item => [
        `"${item.eng.name.replace(/"/g, '""')}"`,
        `"${item.eng.email.replace(/"/g, '""')}"`,
        item.present,
        item.calls,
        item.rev,
        item.perCallRevenue.toFixed(2),
        item.rcpCollected,
        item.rcpQty
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(e => e.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Engineer_Consolidated_Performance_${selectedTLMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-955">Team Performance Report</h1>
            <p className="text-sm font-medium text-slate-400">Consolidated active duty reports for <span className="font-semibold text-slate-650">{getMonthLabel(selectedTLMonth)}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Month</span>
            <input
              type="month"
              value={selectedTLMonth}
              onChange={(e) => setSelectedTLMonth(e.target.value || currentMonthPrefix)}
              className="rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-650 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {/* Board Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Team Engineers</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-slate-950">{engineers.length} Active</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Under your regional wing</p>
          </div>

          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Verified Jobs</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-slate-950">
                {productivityLogs.filter(l => l.date.substring(0, 7) === selectedTLMonth && l.status === 'Approved').reduce((s, l) => s + l.callsClosed, 0)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">MTD approved calls</p>
          </div>

          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Awaiting Validation</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-extrabold ${pendingList.length > 0 ? 'text-amber-600' : 'text-slate-955'}`}>
                {pendingList.length} Tasks
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Awaiting validation actions</p>
          </div>

          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Current Cumulative Sales</span>
            <div className="flex items-center gap-2 text-rose-600">
              <span className="text-2xl font-extrabold">{fmtCur(productivityLogs.filter(l => l.date.substring(0, 7) === selectedTLMonth && l.status === 'Approved').reduce((sum, l) => {
                return sum + l.accessories.reduce((accS, item) => accS + item.saleValue, 0);
              }, 0))}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Total accessories dispatched</p>
          </div>
        </div>

        {/* Engineer-wise Consolidation Table */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 select-none">
            <h2 className="font-display text-base font-bold text-slate-950">Engineer-wise Consolidated Performance</h2>
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 outline-none transition focus:border-indigo-650 focus:ring-2 focus:ring-indigo-100 cursor-pointer shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              Download CSV
            </button>
          </div>
          <div className="overflow-x-auto text-sm font-medium">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 select-none">
                  <th
                    onClick={() => toggleConsolidatedSort('profile')}
                    className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Engineer Profile{renderSortIndicator('profile', consolidatedSortKey, consolidatedSortAsc)}
                  </th>
                  <th
                    onClick={() => toggleConsolidatedSort('present')}
                    className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Days Present{renderSortIndicator('present', consolidatedSortKey, consolidatedSortAsc)}
                  </th>
                  <th
                    onClick={() => toggleConsolidatedSort('calls')}
                    className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Calls Done{renderSortIndicator('calls', consolidatedSortKey, consolidatedSortAsc)}
                  </th>
                  <th
                    onClick={() => toggleConsolidatedSort('revenue')}
                    className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Accessories Revenue (₹){renderSortIndicator('revenue', consolidatedSortKey, consolidatedSortAsc)}
                  </th>
                  <th
                    onClick={() => toggleConsolidatedSort('perCall')}
                    className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Per Call Revenue{renderSortIndicator('perCall', consolidatedSortKey, consolidatedSortAsc)}
                  </th>
                  <th
                    onClick={() => toggleConsolidatedSort('rcpValue')}
                    className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    RCP Value{renderSortIndicator('rcpValue', consolidatedSortKey, consolidatedSortAsc)}
                  </th>
                  <th
                    onClick={() => toggleConsolidatedSort('rcpQty')}
                    className="py-3 px-4 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    RCP Qty{renderSortIndicator('rcpQty', consolidatedSortKey, consolidatedSortAsc)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedConsolidated.map((item) => {
                  const eng = item.eng;
                  return (
                    <tr key={eng.email} className="hover:bg-slate-50/50">
                      <td className="py-4.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 uppercase border border-slate-200/40">
                            {eng.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-950">{eng.name}</span>
                            <span className="block text-xs text-slate-400">{eng.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4.5 px-4 font-bold text-slate-750">{item.present} days</td>
                      <td className="py-4.5 px-4 font-bold text-slate-955">{item.calls}</td>
                      <td className="py-4.5 px-4 text-slate-900 font-semibold">{fmtCur(item.rev)}</td>
                      <td className="py-4.5 px-4 font-semibold text-slate-900">{fmtCur(item.perCallRevenue)}</td>
                      <td className="py-4.5 px-4 font-semibold text-indigo-650">{fmtCur(item.rcpCollected)}</td>
                      <td className="py-4.5 px-4 font-bold text-slate-800">{item.rcpQty}</td>
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

  if (activeTab === 'tl-approvals') {
    const toggleProcessedSort = (key: typeof processedSortKey) => {
      if (processedSortKey === key) {
        setProcessedSortAsc(!processedSortAsc);
      } else {
        setProcessedSortKey(key);
        setProcessedSortAsc(true);
      }
    };

    const sortedDoneList = [...filteredDoneList].sort((a, b) => {
      let comparison = 0;
      const aEng = getUser(users, a.engEmail);
      const bEng = getUser(users, b.engEmail);
      if (processedSortKey === 'id') {
        comparison = a.id.localeCompare(b.id);
      } else if (processedSortKey === 'engineer') {
        comparison = aEng.name.localeCompare(bEng.name) || a.engEmail.localeCompare(b.engEmail);
      } else if (processedSortKey === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (processedSortKey === 'calls') {
        comparison = a.callsClosed - b.callsClosed;
      } else if (processedSortKey === 'rcp') {
        comparison = (a.rcpCollected || 0) - (b.rcpCollected || 0);
      } else if (processedSortKey === 'rcpQty') {
        comparison = (a.rcpQty || 0) - (b.rcpQty || 0);
      } else if (processedSortKey === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return processedSortAsc ? comparison : -comparison;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-950">Field Validation Queue</h1>
            <p className="text-sm font-medium text-slate-400">Verify client signatures & calls accuracy prior to payroll approval</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
            {pendingList.length} pending jobs
          </span>
        </div>

        {/* Selection Tab headers */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setTlQueueTab('pending')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition ${
              tlQueueTab === 'pending'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Awaiting Validation ({pendingList.length})
          </button>
          <button
            onClick={() => setTlQueueTab('done')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition ${
              tlQueueTab === 'done'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Processed History ({doneList.length})
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/50 p-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="relative">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Search Logs</label>
            <div className="relative">
              <input
                type="text"
                value={tlSearchQuery}
                onChange={(e) => setTlSearchQuery(e.target.value)}
                placeholder="Log ID, Eng name, email, date..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 text-slate-800"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter by Engineer</label>
            <select
              value={tlSelectedEng}
              onChange={(e) => setTlSelectedEng(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 text-slate-850"
            >
              <option value="">All Engineers</option>
              {engineers.map((e) => (
                <option key={e.email} value={e.email}>{e.name}</option>
              ))}
            </select>
          </div>
          {tlQueueTab === 'done' ? (
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter by Status</label>
              <select
                value={tlSelectedStatus}
                onChange={(e) => setTlSelectedStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 text-slate-850"
              >
                <option value="">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Validated by TL">Validated by TL</option>
                <option value="Validated by SM">Validated by SM</option>
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setTlSearchQuery('');
                  setTlSelectedEng('');
                }}
                className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 transition"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {tlQueueTab === 'pending' ? (
          <div className="space-y-4">
            {filteredPendingList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                <CheckCircle className="mx-auto h-12 w-12 text-emerald-100 mb-2" />
                <h3 className="font-bold text-slate-900 text-lg">
                  {pendingList.length > 0 ? 'No matching logs found' : 'All Done!'}
                </h3>
                <p className="text-sm mt-1">
                  {pendingList.length > 0
                    ? 'Try adjusting your search query or filters.'
                    : 'Excellent job! Every submitted engineer log has been validated.'}
                </p>
              </div>
            ) : (
              filteredPendingList.map((l) => {
                const logUser = getUser(users, l.engEmail);
                const logRev = l.accessories.reduce((s, a) => s + a.saleValue, 0);
                const isLeave = l.attendanceStatus === 'Leave';

                return (
                  <div key={l.id} className={`rounded-2xl border p-5 shadow-sm space-y-4 transition ${isLeave ? 'border-amber-250 bg-amber-50/20 shadow-amber-50/5' : 'border-slate-200/50 bg-white'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-bold text-slate-900">{logUser.name}</span>
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 rounded-lg px-2 py-0.5">
                            {l.id}
                          </span>
                          {isLeave && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800 animate-pulse">
                              Leave Marked
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-indigo-655 mt-1">
                          {isLeave ? (
                            <span className="text-amber-850 font-extrabold">
                              📅 Duty Date: {fmtDate(l.date)} (Leave Record Validation)
                            </span>
                          ) : (
                            <>
                              {fmtDate(l.date)} – {l.callsClosed} Service Calls – {fmtCur(logRev)} Accessories Value
                              {l.rcpCollected ? ` – ${fmtCur(l.rcpCollected)} RCP Collected` : ''}
                              {l.rcpQty ? ` (Qty: ${l.rcpQty})` : ''}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 self-start">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-550 border border-amber-600 px-2.5 py-0.5 text-xs font-bold text-white">
                          Awaiting Validation
                        </span>
                        {processingProductivityIds.includes(l.id) && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-550 border border-amber-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white animate-pulse">
                            Processing...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Accessories listed row */}
                    {!isLeave && l.accessories.length > 0 && (
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1.5 font-semibold">
                        {l.accessories.map((a, aIdx) => (
                          <div key={aIdx} className="flex items-center gap-1 border-r last:border-r-0 border-slate-200 pr-4">
                            <strong>{getSku(skus, a.skuId).name}</strong> ×{a.qty} = {fmtCur(a.saleValue)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Feedback note line */}
                    <div>
                      <label className="block text-[11px] font-bold tracking-wider text-slate-500 mb-1">
                        Review Note (optional)
                      </label>
                      <input
                        type="text"
                        value={tlNotes[l.id] || ''}
                        onChange={(e) => setTlNotes({ ...tlNotes, [l.id]: e.target.value })}
                        placeholder="Add coordinates matching or special details..."
                        className="w-full rounded-xl border border-slate-205 bg-slate-50/20 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5">
                      <button
                        type="button"
                        disabled={processingProductivityIds.includes(l.id)}
                        onClick={() => handleTLAction(l.id, 'Rejected')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 px-4.5 py-2.5 text-xs font-bold tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ThumbsDown className="h-4 w-4" /> Reject
                      </button>
                      <button
                        type="button"
                        disabled={processingProductivityIds.includes(l.id)}
                        onClick={() => handleTLAction(l.id, 'Validated by TL')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white hover:bg-slate-900 px-4.5 py-2.5 text-xs font-bold tracking-wide transition shadow-sm shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ThumbsUp className="h-4 w-4" /> {processingProductivityIds.includes(l.id) ? 'Processing...' : 'Validate'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
            <h2 className="font-display text-sm font-bold text-slate-955 mb-4">Processed Validation History</h2>
            <div className="overflow-x-auto text-sm font-medium">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 select-none">
                    <th
                      onClick={() => toggleProcessedSort('id')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      ID{renderSortIndicator('id', processedSortKey, processedSortAsc)}
                    </th>
                    <th
                      onClick={() => toggleProcessedSort('engineer')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Engineer{renderSortIndicator('engineer', processedSortKey, processedSortAsc)}
                    </th>
                    <th
                      onClick={() => toggleProcessedSort('date')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Log Date{renderSortIndicator('date', processedSortKey, processedSortAsc)}
                    </th>
                    <th
                      onClick={() => toggleProcessedSort('calls')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Calls Done{renderSortIndicator('calls', processedSortKey, processedSortAsc)}
                    </th>
                    <th
                      onClick={() => toggleProcessedSort('rcp')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      RCP Collected{renderSortIndicator('rcp', processedSortKey, processedSortAsc)}
                    </th>
                    <th
                      onClick={() => toggleProcessedSort('rcpQty')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      RCP Qty{renderSortIndicator('rcpQty', processedSortKey, processedSortAsc)}
                    </th>
                    <th
                      onClick={() => toggleProcessedSort('status')}
                      className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Status{renderSortIndicator('status', processedSortKey, processedSortAsc)}
                    </th>
                    <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Feedback Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedDoneList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-slate-400">
                        {doneList.length > 0 ? 'No results matching filters.' : 'No logs have been processed by your profile yet.'}
                      </td>
                    </tr>
                  ) : (
                    sortedDoneList.map((d) => {
                      const isLeave = d.attendanceStatus === 'Leave';
                      return (
                        <tr key={d.id} className={`hover:bg-slate-50/50 ${isLeave ? 'bg-amber-50/15' : ''}`}>
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs text-slate-650 bg-slate-100 px-2 py-0.5 rounded-md">{d.id}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <strong>{getUser(users, d.engEmail).name}</strong>
                              {isLeave && (
                                <span className="inline-flex items-center rounded bg-amber-100 border border-amber-200 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-800">
                                  Leave
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-500">{fmtDate(d.date)}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {isLeave ? (
                              <span className="text-amber-800 font-bold uppercase text-[10px]">Leave marked</span>
                            ) : (
                              `${d.callsClosed} calls`
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-900 font-semibold">
                            {isLeave ? <span className="text-slate-350 italic">—</span> : fmtCur(d.rcpCollected || 0)}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800">
                            {isLeave ? <span className="text-slate-350 italic">—</span> : d.rcpQty || 0}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                d.status === 'Approved'
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                  : d.status === 'Validated by TL'
                                  ? 'bg-sky-50 border-sky-100 text-sky-850'
                                  : d.status === 'Validated by SM'
                                  ? 'bg-blue-50 border-blue-100 text-blue-800'
                                  : 'bg-rose-50 border-rose-200 text-rose-850'
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs font-semibold text-slate-600 max-w-xs truncate" title={d.tlNote}>
                            {d.tlNote || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'tl-lp-requests') {
    return (
      <TeamLeaderLPRequestsView
        currentUser={currentUser}
        lpRequests={lpRequests}
        onAddLpRequest={onAddLpRequest}
        onUpdateLpRequests={onUpdateLpRequests}
        onAddToast={onAddToast}
      />
    );
  }

  if (activeTab === 'tl-attendance') {
    const myAttendanceRequests = attendanceRequests.filter(req => req.submittedBy === currentUser.email);

    const toggleAttendanceSort = (key: typeof attendanceSortKey) => {
      if (attendanceSortKey === key) {
        setAttendanceSortAsc(!attendanceSortAsc);
      } else {
        setAttendanceSortKey(key);
        setAttendanceSortAsc(true);
      }
    };

    const sortedAttendanceRequests = [...myAttendanceRequests].sort((a, b) => {
      let comparison = 0;
      const aEng = getUser(users, a.engEmail);
      const bEng = getUser(users, b.engEmail);
      if (attendanceSortKey === 'id') {
        comparison = a.id.localeCompare(b.id);
      } else if (attendanceSortKey === 'name') {
        comparison = aEng.name.localeCompare(bEng.name) || a.engEmail.localeCompare(b.engEmail);
      } else if (attendanceSortKey === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (attendanceSortKey === 'proposed') {
        comparison = a.status.localeCompare(b.status);
      } else if (attendanceSortKey === 'remarks') {
        comparison = (a.remarks || '').localeCompare(b.remarks || '');
      } else if (attendanceSortKey === 'status') {
        comparison = a.approvedStatus.localeCompare(b.approvedStatus);
      }
      return attendanceSortAsc ? comparison : -comparison;
    });

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
      } else if (attStatusVal === 'Absent' || attStatusVal === 'Leave') {
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
      ([date, val]) => date.substring(0, 7) === currentMonthPrefix && (val === 'Absent' || val === 'Leave')
    ).length;

    const pendingRequests = myAttendanceRequests.filter(req => req.approvedStatus === 'Pending').length;

    const handleMarkAttendance = (e: React.FormEvent) => {
      e.preventDefault();

      const isAlreadyRequested = attendanceRequests.some(
        req => req.engEmail.toLowerCase() === currentUser.email.toLowerCase() && req.date === attDate && req.approvedStatus !== 'Rejected'
      );

      if (isAlreadyRequested) {
        onAddToast(`Your attendance request for ${attDate} is already submitted or approved.`, 'error');
        return;
      }

      const recordId = `AR-${Date.now().toString().slice(-6)}`;
      const newRequest: AttendanceRequest = {
        id: recordId,
        engEmail: currentUser.email,
        date: attDate,
        status: attStatus,
        submittedBy: currentUser.email,
        submittedByRole: 'Team Leader',
        approvedStatus: 'Pending',
        remarks: attRemarks,
      };

      onAddAttendanceRequest(newRequest);
      setAttRemarks('');
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
              <form onSubmit={handleMarkAttendance} className="space-y-4">
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
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-250 bg-slate-50/50 p-2.5 text-sm text-slate-800 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Mark status</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                        attStatus === 'Present'
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-650'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="Present"
                        checked={attStatus === 'Present'}
                        onChange={() => setAttStatus('Present')}
                        className="sr-only"
                      />
                      <span>Present</span>
                    </label>
                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                        attStatus === 'Leave'
                          ? 'border-amber-500 bg-amber-50/50 text-amber-800 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-650'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="Leave"
                        checked={attStatus === 'Leave'}
                        onChange={() => setAttStatus('Leave')}
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
                    value={attRemarks}
                    onChange={(e) => setAttRemarks(e.target.value)}
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
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">My Attendance Submission Ledger</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                      <th
                        onClick={() => toggleAttendanceSort('id')}
                        className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Req ID{renderSortIndicator('id', attendanceSortKey, attendanceSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleAttendanceSort('name')}
                        className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Staff Name{renderSortIndicator('name', attendanceSortKey, attendanceSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleAttendanceSort('date')}
                        className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Date{renderSortIndicator('date', attendanceSortKey, attendanceSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleAttendanceSort('proposed')}
                        className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Proposed Status{renderSortIndicator('proposed', attendanceSortKey, attendanceSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleAttendanceSort('remarks')}
                        className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Remarks / Description{renderSortIndicator('remarks', attendanceSortKey, attendanceSortAsc)}
                      </th>
                      <th
                        onClick={() => toggleAttendanceSort('status')}
                        className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Approval status{renderSortIndicator('status', attendanceSortKey, attendanceSortAsc)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAttendanceRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                          No attendance requests submitted yet.
                        </td>
                      </tr>
                    ) : (
                      sortedAttendanceRequests.map((req) => {
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

  if (activeTab === 'tl-engineer-attendance') {
    return (
      <TLEngineerAttendanceView
        engineers={engineers}
        productivityLogs={productivityLogs}
        onAddToast={onAddToast}
      />
    );
  }

  return null;
}

interface TLEngineerAttendanceViewProps {
  engineers: User[];
  productivityLogs: ProductivityLog[];
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
}

function TLEngineerAttendanceView({ engineers, productivityLogs, onAddToast }: TLEngineerAttendanceViewProps) {
  // Month state: format YYYY-MM
  const todayObj = new Date();
  const currentMonthStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonthStr, setSelectedMonthStr] = useState(currentMonthStr);

  const [selectedYear, selectedMonth] = selectedMonthStr.split('-').map(Number);

  // Calculate days in the selected month
  const numDays = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: numDays }, (_, i) => i + 1);

  // Month till date last day
  const isCurrentMonth = todayObj.getFullYear() === selectedYear && (todayObj.getMonth() + 1) === selectedMonth;
  const mtdLastDay = isCurrentMonth ? todayObj.getDate() : numDays;

  // Search and filter for the tables
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to determine day status
  const getDayStatus = (email: string, day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const log = productivityLogs.find(
      (l) => l.engEmail.toLowerCase() === email.toLowerCase() && l.date === dateStr
    );
    if (log) {
      if (log.attendanceStatus === 'Leave') {
        return { marker: 'L' as const, log };
      }
      if (log.status === 'Pending') {
        return { marker: '?' as const, log };
      }
      return { marker: '✓' as const, log };
    }

    return { marker: '.' as const, log: null };
  };

  // Process data for all engineers
  const engineersAttendanceData = engineers.map(eng => {
    const daysData = daysArray.map(day => {
      const { marker, log } = getDayStatus(eng.email, day);
      return { day, marker, log };
    });

    // Dynamic totals for the entire month
    const totalPresent = daysData.filter(d => d.marker === '✓' || (d.marker === '?' && d.log?.attendanceStatus !== 'Leave')).length;
    const totalLeave = daysData.filter(d => d.marker === 'L' || (d.marker === '?' && d.log?.attendanceStatus === 'Leave')).length;
    const totalUnmarked = daysData.filter(d => d.marker === '.').length;

    // Month till date totals (days 1 to mtdLastDay)
    const mtdData = daysData.filter(d => d.day <= mtdLastDay);
    const mtdPresent = mtdData.filter(d => d.marker === '✓' || (d.marker === '?' && d.log?.attendanceStatus !== 'Leave')).length;
    const mtdLeave = mtdData.filter(d => d.marker === 'L' || (d.marker === '?' && d.log?.attendanceStatus === 'Leave')).length;
    const mtdNoUpdate = mtdData.filter(d => d.marker === '.').length;

    return {
      ...eng,
      daysData,
      totalPresent,
      totalLeave,
      totalUnmarked,
      mtdPresent,
      mtdLeave,
      mtdNoUpdate
    };
  });

  // Filtered list based on search query
  const filteredData = engineersAttendanceData.filter(eng =>
    eng.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eng.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">Engineer Attendance</h1>
          <p className="text-sm font-medium text-slate-400">Monitor monthly duty grids and check month-till-date summary reports</p>
        </div>

        {/* Month Selector & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-450" />
            <span className="text-xs font-bold text-slate-455 uppercase">Select Month</span>
            <input
              type="month"
              value={selectedMonthStr}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonthStr(e.target.value);
                }
              }}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs w-64 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search engineer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none font-semibold text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Engineer Month till date Attendance Report */}
      <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-display text-base font-bold text-slate-950">Month till Date Attendance Report</h2>
          <p className="text-xs text-slate-400">Accumulated stats from 1st to {fmtDate(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(mtdLastDay).padStart(2, '0')}`)}</p>
        </div>

        <div className="overflow-x-auto text-sm font-medium">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 select-none">
                <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Sl.No</th>
                <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-400">Engineer Name</th>
                <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-450 text-center">Present</th>
                <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-455 text-center">Leave</th>
                <th className="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-455 text-center">No Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400">No engineers match search criteria.</td>
                </tr>
              ) : (
                filteredData.map((eng, idx) => (
                  <tr key={eng.email} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-3 text-slate-450 font-mono text-xs">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-bold">{eng.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{eng.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center justify-center bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1 text-xs font-bold min-w-8">
                        {eng.mtdPresent}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center justify-center bg-amber-50 text-amber-700 rounded-lg px-2.5 py-1 text-xs font-bold min-w-8">
                        {eng.mtdLeave}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1 text-xs font-bold min-w-8">
                        {eng.mtdNoUpdate}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Duty Grid */}
      <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-display text-base font-bold text-slate-950">Monthly Duty Grid</h2>
          <p className="text-xs text-slate-400">Day-wise markers & dynamic monthly summary for {selectedMonthStr}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-150 select-none">
                <th className="py-2 px-3 text-[11px] font-bold text-slate-400 min-w-[150px]">Engineer Name</th>
                {daysArray.map(day => (
                  <th
                    key={day}
                    className="p-1.5 text-center text-[10px] font-bold min-w-[28px] text-slate-400"
                  >
                    {day}
                  </th>
                ))}
                <th className="py-2 px-2 text-center text-[10px] font-bold text-emerald-700 bg-emerald-50/30 min-w-[40px]">Pres</th>
                <th className="py-2 px-2 text-center text-[10px] font-bold text-amber-700 bg-amber-50/30 min-w-[40px]">Leave</th>
                <th className="py-2 px-2 text-center text-[10px] font-bold text-slate-500 bg-slate-550 min-w-[40px]">Unmk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={numDays + 4} className="text-center py-6 text-slate-400">No engineers match search criteria.</td>
                </tr>
              ) : (
                filteredData.map(eng => (
                  <tr key={eng.email} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-3 min-w-[150px]">
                      <div className="font-bold text-slate-900 leading-tight">{eng.name}</div>
                    </td>
                    {eng.daysData.map(d => {
                      let cellClass = "";
                      let textClass = "";

                      if (d.marker === '✓') {
                        cellClass = "bg-emerald-100/60 border border-emerald-200/60";
                        textClass = "text-emerald-800 font-extrabold";
                      } else if (d.marker === 'L') {
                        cellClass = "bg-amber-100/60 border border-amber-200/60";
                        textClass = "text-amber-850 font-extrabold";
                      } else if (d.marker === '?') {
                        cellClass = "bg-yellow-100/60 border border-yellow-250";
                        textClass = "text-yellow-850 font-extrabold";
                      } else {
                        cellClass = "bg-slate-50/50 border border-slate-100";
                        textClass = "text-slate-350 font-normal";
                      }

                      return (
                        <td key={d.day} className="p-1 text-center">
                          <div className={`h-6 w-6 mx-auto rounded flex items-center justify-center text-[11px] shadow-2xs ${cellClass} ${textClass}`}>
                            {d.marker}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-1 text-center bg-emerald-50/20 font-bold text-emerald-800 border-l border-slate-100">
                      {eng.totalPresent}
                    </td>
                    <td className="p-1 text-center bg-amber-50/20 font-bold text-amber-800">
                      {eng.totalLeave}
                    </td>
                    <td className="p-1 text-center bg-slate-50 font-bold text-slate-650">
                      {eng.totalUnmarked}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-slate-500 select-none">
          <span className="flex items-center gap-1.5">
            <span className="h-4.5 w-4.5 rounded bg-emerald-100/60 border border-emerald-200/60 text-emerald-800 flex items-center justify-center text-[10px]">✓</span> Present
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-4.5 w-4.5 rounded bg-amber-100/60 border border-amber-200/60 text-amber-800 flex items-center justify-center text-[10px]">L</span> Leave
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-4.5 w-4.5 rounded bg-yellow-100/60 border border-yellow-250 text-yellow-800 flex items-center justify-center text-[10px]">?</span> Pending Validation
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-4.5 w-4.5 rounded bg-slate-50/50 border border-slate-100 text-slate-350 flex items-center justify-center text-[10px]">.</span> Unmarked
          </span>
        </div>
      </div>
    </div>
  );
}

interface TeamLeaderLPRequestsViewProps {
  currentUser: User;
  lpRequests: LPRequest[];
  onAddLpRequest: (lp: LPRequest) => void;
  onUpdateLpRequests: (lp: LPRequest[]) => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
}

function TeamLeaderLPRequestsView({
  currentUser,
  lpRequests,
  onAddLpRequest,
  onUpdateLpRequests,
  onAddToast,
}: TeamLeaderLPRequestsViewProps) {
    const [lpJobId, setLpJobId] = useState('');
    const [lpSpareCost, setLpSpareCost] = useState('');
    const [lpServiceCost, setLpServiceCost] = useState('');
    const [lpDescription, setLpDescription] = useState('');
    const [historyTab, setHistoryTab] = useState<'active' | 'approved'>('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCreateLpRequest = (e: React.FormEvent) => {
      e.preventDefault();
      const jobIdClean = lpJobId.trim().toUpperCase();
      const spare = parseFloat(lpSpareCost) || 0;
      const service = parseFloat(lpServiceCost) || 0;
      const descriptionClean = lpDescription.trim();

      if (!jobIdClean) {
        onAddToast('Please specify a valid Job ID.', 'error');
        return;
      }
      if (spare < 0 || service < 0) {
        onAddToast('Costs cannot be negative.', 'error');
        return;
      }

      const newRequest: LPRequest = {
        id: `LP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        jobId: jobIdClean,
        spareCost: spare,
        serviceCost: service,
        tlEmail: currentUser.email,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        description: descriptionClean || undefined,
      };

      onAddLpRequest(newRequest);
      setLpJobId('');
      setLpSpareCost('');
      setLpServiceCost('');
      setLpDescription('');
      setIsModalOpen(false);
      onAddToast(`LP Request raised successfully for Job ${jobIdClean}!`, 'success');
    };

    const handleRaiseClaim = (id: string) => {
      const updated = lpRequests.map((lp) => {
        if (lp.id === id) return { ...lp, status: 'Claim submitted' as const };
        return lp;
      });
      onUpdateLpRequests(updated);
      onAddToast(`Claim Approval request raised successfully for LP Request ${id}!`, 'success');
    };

    const handleDownloadMyLpCSV = () => {
      const header = [
        'ID', 
        'Job ID', 
        'Spare Cost (INR)', 
        'Service Cost (INR)', 
        'Total Cost (INR)', 
        'Date Raised', 
        'Status', 
        'Associated PO', 
        'PO Received Value (INR)'
      ];
      
      const rows = myLpRequestsAll.map((lp) => {
        const total = lp.spareCost + lp.serviceCost;
        return [
          lp.id, 
          lp.jobId, 
          lp.spareCost, 
          lp.serviceCost, 
          total, 
          lp.date, 
          lp.status, 
          lp.poNumber || 'N/A', 
          lp.poReceivedValue !== undefined ? lp.poReceivedValue : 0
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `my_lp_requests_history_${currentUser.email}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onAddToast('Local Purchase history CSV downloaded successfully!', 'success');
    };

    const handleRevokeLpRequest = (id: string) => {
      const updated = lpRequests.map((lp) => {
        if (lp.id === id) return { ...lp, status: 'Revoke Pending' as const };
        return lp;
      });
      onUpdateLpRequests(updated);
      onAddToast(`Revocation request submitted for LP Request ${id}!`, 'success');
    };

    const [lpClaimsSortKey, setLpClaimsSortKey] = useState<'id' | 'jobId' | 'spareCost' | 'serviceCost' | 'total' | 'status'>('id');
    const [lpClaimsSortAsc, setLpClaimsSortAsc] = useState<boolean>(false);

    const renderSortIndicator = (currentKey: string, activeKey: string, ascending: boolean) => {
      if (activeKey !== currentKey) {
        return <span className="ml-1 text-slate-350 select-none text-[10px]">⇅</span>;
      }
      return ascending ? (
        <span className="ml-1 text-indigo-650 select-none text-[10px]">▲</span>
      ) : (
        <span className="ml-1 text-indigo-650 select-none text-[10px]">▼</span>
      );
    };

    const toggleLpClaimsSort = (key: typeof lpClaimsSortKey) => {
      if (lpClaimsSortKey === key) {
        setLpClaimsSortAsc(!lpClaimsSortAsc);
      } else {
        setLpClaimsSortKey(key);
        setLpClaimsSortAsc(true);
      }
    };

    const myLpRequestsAll = (lpRequests || []).filter(lp => lp.tlEmail === currentUser.email);

    const sortedMyLpRequests = [...myLpRequestsAll]
      .filter((lp) => (historyTab === 'approved' ? lp.status === 'Claim approved' : lp.status !== 'Claim approved'))
      .filter((lp) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const matchesJobId = lp.jobId.toLowerCase().includes(q);
        const matchesDesc = lp.description ? lp.description.toLowerCase().includes(q) : false;
        return matchesJobId || matchesDesc;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (lpClaimsSortKey === 'id') {
          comparison = a.id.localeCompare(b.id);
        } else if (lpClaimsSortKey === 'jobId') {
          comparison = a.jobId.localeCompare(b.jobId);
        } else if (lpClaimsSortKey === 'spareCost') {
          comparison = a.spareCost - b.spareCost;
        } else if (lpClaimsSortKey === 'serviceCost') {
          comparison = a.serviceCost - b.serviceCost;
        } else if (lpClaimsSortKey === 'total') {
          comparison = (a.spareCost + a.serviceCost) - (b.spareCost + b.serviceCost);
        } else if (lpClaimsSortKey === 'status') {
          comparison = a.status.localeCompare(b.status);
        }
        return lpClaimsSortAsc ? comparison : -comparison;
      });

    const claimPendingRequests = myLpRequestsAll.filter(lp => lp.status === 'Claim pending');
    const claimPendingCount = claimPendingRequests.length;
    const claimPendingTotal = claimPendingRequests.reduce((acc, curr) => acc + curr.spareCost + curr.serviceCost, 0);

    const claimSubmittedRequests = myLpRequestsAll.filter(
      (lp) => lp.status === 'Claim submitted' || lp.status === 'Claim forwarded'
    );
    const claimSubmittedCount = claimSubmittedRequests.length;
    const claimSubmittedTotal = claimSubmittedRequests.reduce(
      (acc, curr) => acc + curr.spareCost + curr.serviceCost,
      0
    );

    const claimApprovedRequests = myLpRequestsAll.filter(lp => lp.status === 'Claim approved');
    const claimApprovedCount = claimApprovedRequests.length;
    const claimApprovedTotal = claimApprovedRequests.reduce((acc, curr) => acc + curr.spareCost + curr.serviceCost, 0);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-950">Local Purchase (LP) Requests</h1>
            <p className="text-sm font-medium text-slate-400">Raise and track Local Purchase requisitions for Admin approvals</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-slate-900 transition shrink-0"
          >
            <Plus className="h-4 w-4" /> Raise New LP Request
          </button>
        </div>

        {/* LP Requisition Metrics Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wider text-amber-600 uppercase block">Claim Pending</span>
              <div className="text-2xl font-black text-amber-900">{fmtCur(claimPendingTotal)}</div>
              <p className="text-xs text-amber-500 font-semibold">{claimPendingCount} local purchases awaiting claim submission</p>
            </div>
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wider text-blue-600 uppercase block">Claim Submitted</span>
              <div className="text-2xl font-black text-blue-900">{fmtCur(claimSubmittedTotal)}</div>
              <p className="text-xs text-blue-500 font-semibold">{claimSubmittedCount} claims submitted awaiting SM/Admin validation</p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <FileText className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase block">Total Claim Approved</span>
              <div className="text-2xl font-black text-emerald-900">{fmtCur(claimApprovedTotal)}</div>
              <p className="text-xs text-emerald-600/80 font-semibold">{claimApprovedCount} claims successfully validated</p>
            </div>
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* History List - occupies full width */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-950 flex items-center gap-2">
                  My LP Requests History
                  <button
                    onClick={handleDownloadMyLpCSV}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
                    title="Download LP History CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </h2>
                <p className="text-xs text-slate-400">Trace coordinates and claim status of raised Local Purchase logs</p>
              </div>
              <div className="flex gap-1.5 bg-slate-50 border border-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setHistoryTab('active')}
                  className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-md tracking-wider transition ${
                    historyTab === 'active'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-450 hover:text-slate-900'
                  }`}
                >
                  Active & Pending ({myLpRequestsAll.filter(lp => lp.status !== 'Claim approved').length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab('approved')}
                  className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-md tracking-wider transition ${
                    historyTab === 'approved'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-450 hover:text-slate-900'
                  }`}
                >
                  Claim Approved List ({myLpRequestsAll.filter(lp => lp.status === 'Claim approved').length})
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search requests by Job ID or Description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-600 transition"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 select-none">
                    <th
                      onClick={() => toggleLpClaimsSort('id')}
                      className="py-2.5 px-2 text-slate-400 font-bold tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      ID{renderSortIndicator('id', lpClaimsSortKey, lpClaimsSortAsc)}
                    </th>
                    <th
                      onClick={() => toggleLpClaimsSort('jobId')}
                      className="py-2.5 px-2 text-slate-400 font-bold tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Job ID{renderSortIndicator('jobId', lpClaimsSortKey, lpClaimsSortAsc)}
                    </th>
                    <th
                      onClick={() => toggleLpClaimsSort('spareCost')}
                      className="py-2.5 px-2 text-slate-400 font-bold tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Spare Cost{renderSortIndicator('spareCost', lpClaimsSortKey, lpClaimsSortAsc)}
                    </th>
                    <th
                      onClick={() => toggleLpClaimsSort('serviceCost')}
                      className="py-2.5 px-2 text-slate-400 font-bold tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Service Cost{renderSortIndicator('serviceCost', lpClaimsSortKey, lpClaimsSortAsc)}
                    </th>
                    <th
                      onClick={() => toggleLpClaimsSort('total')}
                      className="py-2.5 px-2 text-slate-400 font-bold tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Total{renderSortIndicator('total', lpClaimsSortKey, lpClaimsSortAsc)}
                    </th>
                    <th
                      onClick={() => toggleLpClaimsSort('status')}
                      className="py-2.5 px-2 text-slate-400 font-bold tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Status{renderSortIndicator('status', lpClaimsSortKey, lpClaimsSortAsc)}
                    </th>
                    <th className="py-2.5 px-2 text-slate-400 font-bold tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {sortedMyLpRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 bg-slate-50/20 rounded-xl">
                        No requests found in this section.
                      </td>
                    </tr>
                  ) : (
                    sortedMyLpRequests.map((lp) => {
                      const total = lp.spareCost + lp.serviceCost;
                      return (
                        <tr key={lp.id} className="hover:bg-slate-50/40">
                          <td className="py-3 px-2 font-mono text-slate-500">{lp.id}</td>
                          <td className="py-3 px-2">
                            <div className="text-slate-950 font-bold">{lp.jobId}</div>
                            {lp.description && (
                              <div className="text-[10px] text-slate-400 font-normal mt-0.5 max-w-[160px] truncate" title={lp.description}>
                                {lp.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2">{fmtCur(lp.spareCost)}</td>
                          <td className="py-3 px-2">{fmtCur(lp.serviceCost)}</td>
                          <td className="py-3 px-2 text-indigo-600 font-bold">{fmtCur(total)}</td>
                          <td className="py-3 px-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
                                lp.status === 'Claim approved'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : lp.status === 'Claim pending'
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : lp.status === 'Claim submitted'
                                  ? 'bg-violet-50 border-violet-200 text-violet-800'
                                  : lp.status === 'Claim forwarded'
                                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                                  : lp.status === 'Rejected'
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : lp.status === 'Revoke Pending'
                                  ? 'bg-orange-50 border-orange-200 text-orange-850'
                                  : lp.status === 'Cancelled'
                                  ? 'bg-slate-100 border-slate-205 text-slate-500'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                            >
                              {lp.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            {lp.status === 'Claim pending' ? (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRaiseClaim(lp.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-slate-900 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md shadow-indigo-600/10 transition"
                                >
                                  Claim Consumed
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeLpRequest(lp.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-700 transition"
                                >
                                  Revoke LP
                                </button>
                              </div>
                            ) : lp.status === 'Rejected' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = lpRequests.map((req) => {
                                    if (req.id === lp.id) {
                                      return { ...req, status: 'Pending' as const };
                                    }
                                    return req;
                                  });
                                  onUpdateLpRequests(updated);
                                  onAddToast(`LP Request ${lp.id} successfully raised again!`, 'success');
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
                              >
                                <ListRestart className="h-3 w-3" /> Raise Again
                              </button>
                            ) : (
                              <span className="text-slate-300 font-medium">—</span>
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

          {/* Elegant Overlay Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
              <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h2 className="font-display text-base font-extrabold text-slate-950">Raise New LP Request</h2>
                    <p className="text-xs text-slate-400">Submit spare and service costs for Admin verification</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                <form onSubmit={handleCreateLpRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Job ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. JOB-4029"
                      value={lpJobId}
                      onChange={(e) => setLpJobId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-semibold focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150 outline-none uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Spare (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={lpSpareCost}
                        onChange={(e) => setLpSpareCost(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-semibold focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Service (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={lpServiceCost}
                        onChange={(e) => setLpServiceCost(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-semibold focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1">Description</label>
                    <textarea
                      placeholder="Describe the purpose, part details or details of the local purchase..."
                      value={lpDescription}
                      onChange={(e) => setLpDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150 outline-none h-20 resize-none"
                    />
                  </div>

                  <div className="rounded-xl bg-indigo-50/50 p-3 flex gap-2 border border-indigo-100 text-[11px] text-indigo-950 font-medium mb-2">
                    <Clock className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      Once raised, this will route to Admin for approval. If approved, status becomes <strong>Claim pending</strong> where you must raise the claim.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-slate-900 transition"
                  >
                    <Plus className="h-4.5 w-4.5" /> Raise Request
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      );
  }


