import React, { useState } from 'react';
import { User, AttendanceRecord, AttendanceRequest } from '../types';
import { Calendar, CheckSquare, Clock } from 'lucide-react';
import { fmtDate, genId } from '../utils';

interface BackendExecutivePagesProps {
  currentUser: User;
  attendance: AttendanceRecord;
  attendanceRequests: AttendanceRequest[];
  onAddAttendanceRequest: (req: AttendanceRequest) => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
}

export function BackendExecutivePages({
  currentUser,
  attendance,
  attendanceRequests = [],
  onAddAttendanceRequest,
  onAddToast
}: BackendExecutivePagesProps) {
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState<'Present' | 'Leave' | ''>('');
  const [attRemarks, setAttRemarks] = useState('');
  
  const [attendanceSortKey, setAttendanceSortKey] = useState<'id' | 'date' | 'proposed' | 'remarks' | 'status'>('date');
  const [attendanceSortAsc, setAttendanceSortAsc] = useState<boolean>(false);

  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const currentMonthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const myAttendanceRequests = attendanceRequests.filter(req => req.submittedBy.toLowerCase() === currentUser.email.toLowerCase());

  const toggleAttendanceSort = (key: typeof attendanceSortKey) => {
    if (attendanceSortKey === key) {
      setAttendanceSortAsc(!attendanceSortAsc);
    } else {
      setAttendanceSortKey(key);
      setAttendanceSortAsc(true);
    }
  };

  const renderSortIndicator = (currentKey: string, activeKey: string, ascending: boolean) => {
    if (activeKey === currentKey) {
      return ascending ? ' ▲' : ' ▼';
    }
    return '';
  };

  const sortedAttendanceRequests = [...myAttendanceRequests].sort((a, b) => {
    let comparison = 0;
    if (attendanceSortKey === 'id') {
      comparison = a.id.localeCompare(b.id);
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

    if (!attStatus) {
      onAddToast('Please select a valid attendance status.', 'error');
      return;
    }

    const isAlreadyRequested = myAttendanceRequests.some(
      req => req.date === attDate && req.approvedStatus !== 'Rejected'
    );

    if (isAlreadyRequested) {
      onAddToast(`Your attendance request for ${attDate} is already submitted or approved.`, 'error');
      return;
    }

    const recordId = genId('AR');
    const newRequest: AttendanceRequest = {
      id: recordId,
      engEmail: currentUser.email,
      date: attDate,
      status: attStatus,
      submittedBy: currentUser.email,
      submittedByRole: 'Backend Executive',
      approvedStatus: 'Pending',
      remarks: attRemarks,
    };

    onAddAttendanceRequest(newRequest);
    setAttRemarks('');
    setAttStatus('');
    onAddToast('Your attendance request has been submitted to Admin successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-955">Mark Attendance Portal</h1>
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mark status</label>
                <select
                  value={attStatus}
                  onChange={(e) => setAttStatus(e.target.value as 'Present' | 'Leave' | '')}
                  className="w-full rounded-xl border border-slate-250 bg-slate-50/50 p-2.5 text-sm text-slate-800 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition font-semibold"
                >
                  <option value="">Select</option>
                  <option value="Present">Present</option>
                  <option value="Leave">Leave</option>
                </select>
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
                      <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">
                        No attendance requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    sortedAttendanceRequests.map((req) => {
                      return (
                        <tr key={req.id} className="border-b border-slate-5  0 hover:bg-slate-50/30 text-sm">
                          <td className="py-3 px-3 font-mono text-slate-500 text-xs">{req.id}</td>
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
