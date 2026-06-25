/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SKU, InventoryItem, PurchaseInward, User, ProductivityLog } from './types';

export function getSku(skus: SKU[], id: string): SKU {
  return skus.find(s => s.id === id) || { id, name: 'Unknown Item', lowStockAlert: 0 };
}

export function getInvItem(inventory: InventoryItem[], skuId: string): InventoryItem {
  return inventory.find(i => i.skuId === skuId) || { skuId, qty: 0, unitPrice: 0 };
}

export function getUser(users: User[], email: string): User {
  return users.find(u => u.email === email) || { email, name: 'Unknown Staff', role: 'Engineer' };
}

export function fmtDate(d: string): string {
  if (!d) return '—';
  // Avoid time-zone offset shifting by parsing date parts carefully
  const parts = d.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return d;
}

export function fmtCur(n: number | string): string {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

export function genPwd(len: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function getSkuPurchaseUnitPrice(purchaseHistory: PurchaseInward[], inventory: InventoryItem[], skuId: string): number {
  const approvedEntries = purchaseHistory.filter(p => p.status === 'Approved' && p.skuId === skuId);
  if (approvedEntries.length === 0) {
    const inv = inventory.find(i => i.skuId === skuId);
    return inv ? inv.unitPrice : 0;
  }
  const totalQty = approvedEntries.reduce((acc, curr) => acc + curr.qty, 0);
  const totalVal = approvedEntries.reduce((acc, curr) => acc + (curr.qty * curr.unitPrice), 0);
  return totalQty > 0 ? totalVal / totalQty : 0;
}

export function calcAccessoryCost(logs: ProductivityLog[], purchaseHistory: PurchaseInward[], inventory: InventoryItem[]): number {
  let cost = 0;
  logs.filter(l => l.status === 'Approved').forEach(l => {
    l.accessories.forEach(a => {
      cost += getSkuPurchaseUnitPrice(purchaseHistory, inventory, a.skuId) * a.qty;
    });
  });
  return cost;
}

export function getMonthRange(offset: number = 0) {
  const now = new Date();
  now.setMonth(now.getMonth() + offset);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return {
    prefix: `${y}-${m}`,
    label: `${now.toLocaleString('en-IN', { month: 'long' })} ${y}`,
  };
}
