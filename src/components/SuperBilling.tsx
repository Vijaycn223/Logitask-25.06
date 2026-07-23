/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Organisation } from '../types';
import { Warehouse, CreditCard, ShieldAlert, CircleAlert, DollarSign, Calendar } from 'lucide-react';

interface SuperBillingProps {
  organisations: Organisation[];
  onToggleOrgStatus: (orgId: string, currentStatus: 'active' | 'suspended' | 'expired') => Promise<void>;
  onForcePlanUpdate: (orgId: string, newPlan: 'free-trial' | 'basic' | 'professional' | 'enterprise') => Promise<void>;
}

export function SuperBilling({ organisations, onToggleOrgStatus, onForcePlanUpdate }: SuperBillingProps) {
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'free-trial' | 'basic' | 'professional' | 'enterprise'>('free-trial');

  // SaaS Metric calculations
  const totalOrgs = organisations.length;
  const activeOrgs = organisations.filter((o) => o.status === 'active').length;
  const suspendedOrgs = organisations.filter((o) => o.status === 'suspended').length;
  
  // Simulated MRR calculation based on active plans
  const mrr = organisations
    .filter((o) => o.status === 'active')
    .reduce((sum, o) => {
      if (o.subscriptionPlan === 'basic') return sum + 49;
      if (o.subscriptionPlan === 'professional') return sum + 149;
      if (o.subscriptionPlan === 'enterprise') return sum + 499;
      return sum;
    }, 0);

  const handleStatusToggle = async (org: Organisation) => {
    const nextStatus = org.status === 'active' ? 'suspended' : 'active';
    await onToggleOrgStatus(org.id, nextStatus);
  };

  const handlePlanSave = async (orgId: string) => {
    await onForcePlanUpdate(orgId, selectedPlan);
    setEditingOrgId(null);
  };

  return (
    <div id="super-billing-container" className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-slate-900">
            SaaS Subscriptions
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Monitor MRR, manage tenant subscription lifecycle state, and adjust plans.
          </p>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Orgs */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-55 px-3 py-1 text-indigo-600">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tenants</p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{totalOrgs}</h3>
            </div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 px-3 py-1 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Workspace</p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{activeOrgs}</h3>
            </div>
          </div>
        </div>

        {/* Suspended Orgs */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 px-3 py-1 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suspended Tenants</p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{suspendedOrgs}</h3>
            </div>
          </div>
        </div>

        {/* MRR */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 px-3 py-1 text-rose-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Revenue (MRR)</p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">${mrr}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tenants list table */}
      <div className="rounded-3xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-display text-base font-bold text-slate-900">Tenant Billing Directory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Site Code</th>
                <th className="px-6 py-3.5">Created At</th>
                <th className="px-6 py-3.5">Plan</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Subscription Renewal</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {organisations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{org.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{org.id}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-550">{org.siteCode}</td>
                  <td className="px-6 py-4 text-slate-450">
                    {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {editingOrgId === org.id ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={selectedPlan}
                          onChange={(e) => setSelectedPlan(e.target.value as any)}
                          className="rounded-lg border border-slate-250 bg-white px-2 py-1 text-xs font-semibold outline-none focus:border-indigo-600"
                        >
                          <option value="free-trial">Free Trial</option>
                          <option value="basic">Basic</option>
                          <option value="professional">Professional</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                        <button
                          onClick={() => handlePlanSave(org.id)}
                          className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white hover:bg-indigo-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingOrgId(null)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="capitalize font-bold text-slate-800">{org.subscriptionPlan}</span>
                        <button
                          onClick={() => {
                            setEditingOrgId(org.id);
                            setSelectedPlan(org.subscriptionPlan);
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                        org.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {org.subscriptionPeriodEnd ? new Date(org.subscriptionPeriodEnd).toLocaleDateString() : 'None'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleStatusToggle(org)}
                      className={`rounded-lg px-3 py-1 text-[10px] font-bold transition-all ${
                        org.status === 'active'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {org.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
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
