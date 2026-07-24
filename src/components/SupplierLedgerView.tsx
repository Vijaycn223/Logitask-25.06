/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, PurchaseInward, SupplierDebit, Vendor } from '../types';
import { fmtCur, genId, fmtDate } from '../utils';
import { ClipboardList, Plus, FileText, Send, Calendar, Landmark, BookOpen } from 'lucide-react';

interface SupplierLedgerViewProps {
  currentUser: User;
  purchaseInward: PurchaseInward[];
  supplierDebits: SupplierDebit[];
  onAddSupplierDebit: (sd: SupplierDebit) => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
  mode: 'Admin' | 'Store Manager';
  vendors?: Vendor[];
  onFetchHistoricalLedger?: (supplierName: string) => Promise<{ purchases: PurchaseInward[], debits: SupplierDebit[] }>;
}

export function SupplierLedgerView({
  currentUser,
  purchaseInward,
  supplierDebits,
  onAddSupplierDebit,
  onAddToast,
  mode,
  vendors = [],
  onFetchHistoricalLedger,
}: SupplierLedgerViewProps) {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [debitDate, setDebitDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [debitAmount, setDebitAmount] = useState('');
  const [debitDescription, setDebitDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date selectors for filtering the ledger
  const [ledgerFromDate, setLedgerFromDate] = useState('');
  const [ledgerToDate, setLedgerToDate] = useState('');

  // On-demand historical transaction states
  const [historicalPurchases, setHistoricalPurchases] = useState<PurchaseInward[]>([]);
  const [historicalDebits, setHistoricalDebits] = useState<SupplierDebit[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Trigger historical fetch when supplier is selected
  React.useEffect(() => {
    if (!selectedSupplier || !onFetchHistoricalLedger) {
      setHistoricalPurchases([]);
      setHistoricalDebits([]);
      return;
    }

    setIsLoadingHistory(true);
    onFetchHistoricalLedger(selectedSupplier)
      .then(({ purchases, debits }) => {
        setHistoricalPurchases(purchases);
        setHistoricalDebits(debits);
      })
      .catch((err) => {
        console.error('Failed to load supplier history:', err);
        onAddToast('Failed to load historical supplier records', 'error');
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  }, [selectedSupplier, onFetchHistoricalLedger]);

  // Combine real-time active month + on-demand historical transactions
  const combinedPurchases = React.useMemo(() => {
    const map = new Map<string, PurchaseInward>();
    purchaseInward.forEach(p => map.set(p.id, p));
    historicalPurchases.forEach(p => map.set(p.id, p));
    return Array.from(map.values());
  }, [purchaseInward, historicalPurchases]);

  const combinedDebits = React.useMemo(() => {
    const map = new Map<string, SupplierDebit>();
    supplierDebits.forEach(d => map.set(d.id, d));
    historicalDebits.forEach(d => map.set(d.id, d));
    return Array.from(map.values());
  }, [supplierDebits, historicalDebits]);

  // Extract unique suppliers from vendors collection, purchaseInwards and supplierDebits
  const uniqueSuppliers = Array.from(
    new Set([
      ...vendors.map((v) => v.name).filter(Boolean),
      ...purchaseInward.map((p) => p.vendor).filter(Boolean),
      ...supplierDebits.map((d) => d.supplier).filter(Boolean),
    ])
  ).sort((a, b) => a.localeCompare(b));

  // Handle adding debit payment
  const handleAddDebit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) {
      onAddToast('Please select a supplier first.', 'error');
      return;
    }
    const amt = parseFloat(debitAmount);
    if (isNaN(amt) || amt <= 0) {
      onAddToast('Please enter a valid amount paid.', 'error');
      return;
    }
    if (!debitDescription.trim()) {
      onAddToast('Please enter a description or remarks.', 'error');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const newDebit: SupplierDebit = {
        id: genId('SD'),
        date: debitDate,
        supplier: selectedSupplier,
        description: debitDescription.trim(),
        amountPaid: amt,
      };

      onAddSupplierDebit(newDebit);
      onAddToast(`Debit payment of ${fmtCur(amt)} recorded for ${selectedSupplier}!`, 'success');
      
      // Reset fields
      setDebitAmount('');
      setDebitDescription('');
      setIsSubmitting(false);
    }, 800);
  };

  // Compile ledger data with opening balance & date filters
  const {
    filteredEntries,
    openingBalance,
    totalCreditInwardForPeriod,
    totalDebitPaidForPeriod,
    currentOutstandingForPeriod,
  } = React.useMemo(() => {
    if (!selectedSupplier) {
      return {
        filteredEntries: [],
        openingBalance: 0,
        totalCreditInwardForPeriod: 0,
        totalDebitPaidForPeriod: 0,
        currentOutstandingForPeriod: 0,
      };
    }

    // 1. Credit inwards (only approved purchase inwards represent active credit)
    const credits = combinedPurchases
      .filter((p) => p.vendor === selectedSupplier && p.status === 'Approved')
      .map((p) => ({
        id: p.id,
        date: p.date,
        refId: p.invoiceNo || p.id,
        supplier: p.vendor,
        type: 'Inward (Credit)',
        details: `SKU ${p.skuId} (Qty: ${p.qty} @ ${fmtCur(p.unitPrice)})`,
        credit: p.qty * p.unitPrice,
        debit: 0,
      }));

    // 2. Debits (payments)
    const debits = combinedDebits
      .filter((d) => d.supplier === selectedSupplier)
      .map((d) => ({
        id: d.id,
        date: d.date,
        refId: d.id,
        supplier: d.supplier,
        type: 'Debit Payment',
        details: d.description,
        credit: 0,
        debit: d.amountPaid,
      }));

    // Combine and sort chronologically (date asc)
    const allSorted = [...credits, ...debits].sort((a, b) => a.date.localeCompare(b.date));

    // Calculate opening balance for transactions prior to ledgerFromDate
    let opBal = 0;
    if (ledgerFromDate) {
      opBal = allSorted
        .filter((e) => e.date < ledgerFromDate)
        .reduce((sum, e) => sum + e.credit - e.debit, 0);
    }

    // Filter within selected date range
    const inRange = allSorted.filter((e) => {
      const matchFrom = !ledgerFromDate || e.date >= ledgerFromDate;
      const matchTo = !ledgerToDate || e.date <= ledgerToDate;
      return matchFrom && matchTo;
    });

    // Compute running balance starting from opening balance
    let runningBalance = opBal;
    const finalEntries = inRange.map((e) => {
      runningBalance += e.credit - e.debit;
      return {
        ...e,
        outstandingBalance: runningBalance,
      };
    });

    const totalCredit = inRange.reduce((sum, e) => sum + e.credit, 0);
    const totalDebit = inRange.reduce((sum, e) => sum + e.debit, 0);

    return {
      filteredEntries: finalEntries,
      openingBalance: opBal,
      totalCreditInwardForPeriod: totalCredit,
      totalDebitPaidForPeriod: totalDebit,
      currentOutstandingForPeriod: runningBalance,
    };
  }, [selectedSupplier, combinedPurchases, combinedDebits, ledgerFromDate, ledgerToDate]);

  // Download CSV helper (incorporating opening balance & period filter)
  const handleDownloadCSV = () => {
    if (!selectedSupplier) return;

    const headers = ['Date', 'Ref ID', 'Supplier', 'Transaction Type', 'Details/Remarks', 'Inward/Credit (INR)', 'Debit (INR)', 'Outstanding Balance (INR)'];
    const rows = [];

    // Add opening balance row if from-date filter exists
    if (ledgerFromDate) {
      rows.push([
        ledgerFromDate,
        '—',
        selectedSupplier,
        'Opening Balance',
        'Balance Brought Forward',
        '0',
        '0',
        openingBalance.toString(),
      ]);
    }

    // Add transactions
    filteredEntries.forEach((e) => {
      rows.push([
        e.date,
        e.refId,
        e.supplier,
        e.type,
        e.details,
        e.credit.toString(),
        e.debit.toString(),
        e.outstandingBalance.toString(),
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const fileSuffix = ledgerFromDate || ledgerToDate
      ? `${ledgerFromDate || 'start'}_to_${ledgerToDate || 'end'}`
      : 'full_statement';

    link.setAttribute('download', `supplier_ledger_${selectedSupplier.replace(/\s+/g, '_').toLowerCase()}_${fileSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('Period-wise supplier ledger spreadsheet downloaded successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            Supplier Ledger
          </h1>
          <p className="text-sm font-medium text-slate-400">
            Reconcile supplier credits, log payments, and track running outstanding balances.
          </p>
        </div>

        {/* Dropdown Supplier & Date Selectors */}
        <div className="flex flex-wrap items-center gap-3.5 bg-slate-50 border border-slate-200/60 p-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Supplier:
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-650 min-w-[180px]"
            >
              <option value="">Select Supplier...</option>
              {uniqueSuppliers.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              From:
            </label>
            <input
              type="date"
              value={ledgerFromDate}
              onChange={(e) => setLedgerFromDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-1 px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-650"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              To:
            </label>
            <input
              type="date"
              value={ledgerToDate}
              onChange={(e) => setLedgerToDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-1 px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-650"
            />
          </div>

          {(ledgerFromDate || ledgerToDate) && (
            <button
              onClick={() => {
                setLedgerFromDate('');
                setLedgerToDate('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline select-none cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {selectedSupplier ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Outstanding Balance Stats & Add Debit Form */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Stats Dashboard Card */}
            <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm space-y-4">
              <h2 className="font-display text-xs font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-indigo-600" />
                {ledgerFromDate || ledgerToDate ? 'Period Summary' : 'Financial Summary'}
              </h2>

              <div className="space-y-3 divide-y divide-slate-100">
                {ledgerFromDate && (
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Opening Balance</span>
                    <span className="text-slate-950 font-extrabold">{fmtCur(openingBalance)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs pt-2.5 pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Period Inward Credits</span>
                  <span className="text-slate-950 font-extrabold">{fmtCur(totalCreditInwardForPeriod)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2.5 pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Period Debits Paid</span>
                  <span className="text-slate-950 font-extrabold text-emerald-600">{fmtCur(totalDebitPaidForPeriod)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">
                    {ledgerFromDate || ledgerToDate ? 'Closing Balance' : 'Outstanding Balance'}
                  </span>
                  <span className={`text-sm font-black ${currentOutstandingForPeriod > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {fmtCur(currentOutstandingForPeriod)}
                  </span>
                </div>
              </div>
            </div>

            {/* Add Debit Transaction Form Card */}
            <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm">
              <h2 className="font-display text-xs font-extrabold text-slate-950 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-indigo-600" />
                Record Debit (Payment)
              </h2>

              <form onSubmit={handleAddDebit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={debitDate}
                    max={new Date().toISOString().substring(0, 10)}
                    onChange={(e) => setDebitDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={debitAmount}
                    onChange={(e) => setDebitAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1">
                    Description / Remarks
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Cheque No 901235 / Bank transfer"
                    value={debitDescription}
                    onChange={(e) => setDebitDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold outline-none focus:border-indigo-600 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-slate-900 text-white font-bold py-2.5 text-xs transition shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSubmitting ? 'Recording...' : 'Submit Debit Payment'}
                </button>
              </form>
            </div>
          </div>

          {/* Column 2: Ledger Table */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="font-display text-sm font-bold text-slate-950">
                  Account Statement: <span className="text-indigo-600">{selectedSupplier}</span>
                  {(ledgerFromDate || ledgerToDate) && (
                    <span className="text-xs text-slate-400 font-medium block sm:inline sm:ml-2">
                      ({ledgerFromDate ? fmtDate(ledgerFromDate) : 'Start'} to {ledgerToDate ? fmtDate(ledgerToDate) : 'End'})
                    </span>
                  )}
                </h2>

                <button
                  onClick={handleDownloadCSV}
                  disabled={filteredEntries.length === 0 && !ledgerFromDate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer select-none disabled:opacity-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>

              <div className="overflow-x-auto text-sm font-medium">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Date</th>
                      <th className="py-3 px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Ref ID</th>
                      <th className="py-3 px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Type</th>
                      <th className="py-3 px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Details/Remarks</th>
                      <th className="py-3 px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase text-right">Inward/Credit</th>
                      <th className="py-3 px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase text-right">Debit</th>
                      <th className="py-3 px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ledgerFromDate && (
                      <tr className="bg-slate-50/50">
                        <td className="py-2.5 px-2 text-xs text-slate-400 whitespace-nowrap">
                          {fmtDate(ledgerFromDate)}
                        </td>
                        <td className="py-2.5 px-2 text-xs font-mono text-slate-400 whitespace-nowrap">
                          —
                        </td>
                        <td className="py-2.5 px-2 text-xs whitespace-nowrap font-bold text-slate-500 uppercase tracking-wider">
                          Opening Balance
                        </td>
                        <td className="py-2.5 px-2 text-xs text-slate-400 italic">
                          Balance Brought Forward
                        </td>
                        <td className="py-2.5 px-2 text-xs font-semibold text-slate-400 text-right whitespace-nowrap">
                          —
                        </td>
                        <td className="py-2.5 px-2 text-xs font-semibold text-slate-400 text-right whitespace-nowrap">
                          —
                        </td>
                        <td className="py-2.5 px-2 text-xs font-black text-slate-900 text-right whitespace-nowrap">
                          {fmtCur(openingBalance)}
                        </td>
                      </tr>
                    )}

                    {isLoadingHistory ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs font-semibold text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                            <span>Loading historical transactions...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs font-semibold text-slate-400">
                          No approved credit inwards or debits recorded for this supplier during this period.
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry, idx) => (
                        <tr key={entry.id + '-' + idx} className="hover:bg-slate-50/40 transition">
                          <td className="py-3.5 px-2 text-xs text-slate-500 whitespace-nowrap">
                            {fmtDate(entry.date)}
                          </td>
                          <td className="py-3.5 px-2 text-xs font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {entry.refId}
                          </td>
                          <td className="py-3.5 px-2 text-xs whitespace-nowrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              entry.type === 'Inward (Credit)'
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {entry.type === 'Inward (Credit)' ? 'Credit' : 'Debit'}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-xs text-slate-600 max-w-[180px] truncate" title={entry.details}>
                            {entry.details}
                          </td>
                          <td className="py-3.5 px-2 text-xs font-semibold text-slate-900 text-right whitespace-nowrap">
                            {entry.credit > 0 ? fmtCur(entry.credit) : '—'}
                          </td>
                          <td className="py-3.5 px-2 text-xs font-semibold text-emerald-600 text-right whitespace-nowrap">
                            {entry.debit > 0 ? fmtCur(entry.debit) : '—'}
                          </td>
                          <td className="py-3.5 px-2 text-xs font-black text-slate-950 text-right whitespace-nowrap">
                            {fmtCur(entry.outstandingBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center max-w-lg mx-auto">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No Supplier Selected</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Please choose a supplier from the selector dropdown in the header to view running statements, credit invoices, and payments.
          </p>
        </div>
      )}
    </div>
  );
}
