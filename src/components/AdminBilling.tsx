/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Organisation, User } from '../types';
import { CreditCard, Check, ShieldAlert, BadgeInfo } from 'lucide-react';

interface AdminBillingProps {
  organisation: Organisation;
  currentUser: User;
  onUpdatePlan: (plan: 'free-trial' | 'basic' | 'professional' | 'enterprise') => Promise<void>;
}

export function AdminBilling({ organisation, currentUser, onUpdatePlan }: AdminBillingProps) {

  return (
    <div id="admin-billing-container" className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-slate-900">
            Billing & Plans
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Manage your subscription plan, payment gateways, and tenant resource limits.
          </p>
        </div>
      </div>

      {/* Current Subscription Card */}
      <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-750 capitalize">
              Current Plan: {organisation.subscriptionPlan}
            </span>
            <h2 className="font-display text-xl font-extrabold text-slate-900">
              {organisation.name} Workspace
            </h2>
            <p className="text-sm font-semibold text-slate-400">
              Subscription Status: <span className="text-emerald-600 font-bold capitalize">{organisation.status}</span>
            </p>
            {organisation.subscriptionPeriodEnd && (
              <p className="text-xs text-slate-500 font-medium">
                Period renewal / expiry: <strong className="font-bold">{new Date(organisation.subscriptionPeriodEnd).toLocaleDateString()}</strong>
              </p>
            )}
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Site Code
            </div>
            <div className="font-mono text-lg font-black text-slate-900 bg-slate-50 border border-slate-250/30 rounded-xl px-3 py-1">
              {organisation.siteCode}
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade plans under review card */}
      <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
          <BadgeInfo className="h-6 w-6" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="font-display text-base font-bold text-slate-900">Subscription plans under review</h3>
          <p className="text-xs font-medium text-slate-450">
            Billing subscription plans and pricing structures are currently being updated. Please contact the system administrator to modify or upgrade your workspace credentials plan.
          </p>
        </div>
      </div>
    </div>
  );
}
