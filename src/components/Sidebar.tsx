/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, UserRole } from '../types';
import {
  Wrench,
  CheckSquare,
  Truck,
  RotateCcw,
  Calendar,
  Layers,
  TrendingUp,
  Tag,
  BookOpen,
  Warehouse,
  Inbox,
  LayoutDashboard,
  LogOut,
  Sliders,
  Sparkles,
  DollarSign,
  X,
  Key
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  onCloseSidebar?: () => void;
  onChangePassword: () => void;
}

// Maps of pages by role
const SIDEBAR_ITEMS: Record<UserRole, Array<{ type: 'section'; label: string } | { type: 'item'; page: string; label: string; icon: any }>> = {
  'Super Admin': [
    { type: 'section', label: 'Global Admin' },
    { type: 'item', page: 'super-orgs', label: 'Organizations list', icon: Warehouse },
    { type: 'item', page: 'super-users', label: 'User Onboarding', icon: BookOpen },
  ],
  'Admin': [
    { type: 'section', label: 'Workflows' },
    { type: 'item', page: 'admin-approvals', label: 'Approval Queue', icon: CheckSquare },
    { type: 'item', page: 'admin-purchase-approve', label: 'Purchase Approvals', icon: Truck },
    { type: 'item', page: 'admin-revoke-approve', label: 'Revoke Approvals', icon: RotateCcw },
    { type: 'item', page: 'admin-lp-approvals', label: 'LP Approvals', icon: DollarSign },
    { type: 'section', label: 'Reports' },
    { type: 'item', page: 'admin-engineer-dashboard', label: 'Engineer Dashboard', icon: LayoutDashboard },
    { type: 'item', page: 'admin-attendance', label: 'Attendance Register', icon: Calendar },
    { type: 'item', page: 'admin-inventory', label: 'Store Inventory', icon: Layers },
    { type: 'item', page: 'admin-pl', label: 'P&L Report', icon: TrendingUp },
    { type: 'section', label: 'Registry' },
    { type: 'item', page: 'admin-sku-registry', label: 'SKU Registry', icon: Tag },
    { type: 'item', page: 'admin-user-registry', label: 'User Registry', icon: BookOpen },
  ],
  'Store Manager': [
    { type: 'section', label: 'Overview' },
    { type: 'item', page: 'store-dashboard', label: 'Store Dashboard', icon: Warehouse },
    { type: 'section', label: 'Workflow' },
    { type: 'item', page: 'store-approvals', label: 'Productivity Queue', icon: CheckSquare },
    { type: 'item', page: 'store-lp', label: 'LP Claims Validation', icon: DollarSign },
    { type: 'item', page: 'store-attendance', label: 'Mark Attendance', icon: Calendar },
    { type: 'section', label: 'Inventory' },
    { type: 'item', page: 'store-inward', label: 'Purchase Inward', icon: Truck },
    { type: 'item', page: 'store-requests', label: 'Stock Requests', icon: Inbox },
    { type: 'item', page: 'store-inventory', label: 'Inventory Report', icon: Layers },
  ],
  'Team Leader': [
    { type: 'section', label: 'Overview' },
    { type: 'item', page: 'tl-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'section', label: 'Workflow' },
    { type: 'item', page: 'tl-approvals', label: 'Validation Queue', icon: CheckSquare },
    { type: 'item', page: 'tl-lp-requests', label: 'Local Purchase', icon: DollarSign },
    { type: 'item', page: 'tl-attendance', label: 'Mark Attendance', icon: Calendar },
  ],
  'Engineer': [
    { type: 'section', label: 'My Work' },
    { type: 'item', page: 'eng-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { type: 'item', page: 'eng-productivity', label: 'Log Productivity', icon: CheckSquare },
    { type: 'section', label: 'Inventory' },
    { type: 'item', page: 'eng-stock', label: 'My Van Stock', icon: Truck },
  ],
};

export function Sidebar({ currentUser, activeTab, onPageChange, onLogout, onCloseSidebar, onChangePassword }: SidebarProps) {
  const items = SIDEBAR_ITEMS[currentUser.role] || [];
  const initial = currentUser.name.charAt(0).toUpperCase();

  return (
    <div id="sidebar" className="flex h-screen w-64 flex-col border-r border-slate-200/80 bg-white shadow-sm shrink-0">
      {/* Brand Header */}
      <div className="border-b border-slate-100 p-6 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Wrench className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
            LogiTask
          </span>
        </div>
        {onCloseSidebar && (
          <button
            onClick={onCloseSidebar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 md:hidden"
            title="Close Sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {items.map((item, index) => {
          if (item.type === 'section') {
            return (
              <div
                key={`sec-${index}`}
                className="pt-4 pb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                {item.label}
              </div>
            );
          } else {
            const Icon = item.icon;
            const isActive = activeTab === item.page;
            return (
              <button
                key={`btn-${item.page}`}
                onClick={() => onPageChange(item.page)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-indigo-50/50 text-indigo-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          }
        })}
      </nav>

      {/* Sidebar Footer User Details */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-display text-sm font-bold text-white uppercase">
            {initial}
          </div>
          <div className="flex-1 min-width-0 text-left">
            <p className="truncate text-sm font-bold text-slate-900" title={currentUser.name}>
              {currentUser.name}
            </p>
            <p className="truncate text-xs font-medium text-slate-400">
              {currentUser.role}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onChangePassword}
              title="Change Password"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <Key className="h-5 w-5 text-slate-400" />
            </button>
            <button
              onClick={onLogout}
              title="Log Out"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <LogOut className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
