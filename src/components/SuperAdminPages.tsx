/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole, Organisation } from '../types';
import { 
  Building, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users, 
  Check, 
  X, 
  Briefcase, 
  Key, 
  Mail, 
  Activity,
  UserCheck, 
  Network
} from 'lucide-react';

interface SuperAdminPagesProps {
  currentUser: User;
  users: User[];
  organisations: Organisation[];
  activeTab: string;
  onUpdateUsers: (users: User[]) => void;
  onUpdateOrganisations: (orgs: Organisation[]) => void;
  onAddToast: (msg: string, type?: 'success' | 'error') => void;
}

export function SuperAdminPages({
  currentUser,
  users,
  organisations,
  activeTab,
  onUpdateUsers,
  onUpdateOrganisations,
  onAddToast,
}: SuperAdminPagesProps) {

  // Search and form states for Organisations
  const [orgSearch, setOrgSearch] = useState('');
  const [orgFormOpen, setOrgFormOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  
  // Org fields
  const [orgName, setOrgName] = useState('');
  const [orgSiteCode, setOrgSiteCode] = useState('');

  // Org Admin fields
  const [orgAdminName, setOrgAdminName] = useState('');
  const [orgAdminEmail, setOrgAdminEmail] = useState('');
  const [orgAdminPassword, setOrgAdminPassword] = useState('password');
  const [hasOrgAdmin, setHasOrgAdmin] = useState(true);
  const [adminToDelete, setAdminToDelete] = useState<User | null>(null);

  // Search and form states for Users
  const [userSearch, setUserSearch] = useState('');
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // User fields
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('Admin');
  const [userOrgId, setUserOrgId] = useState('');
  const [userPassword, setUserPassword] = useState('password');

  const userFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (userFormOpen && userFormRef.current) {
      userFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [userFormOpen, editingUser]);

  // Custom modal/dialog confirmation states to replace window.confirm for iframe sandbox safety
  const [orgToDelete, setOrgToDelete] = useState<Organisation | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Helpers
  const getOrgUserCount = (orgId: string) => {
    return users.filter((u) => u.orgId === orgId).length;
  };

  const getOrgName = (orgId?: string) => {
    if (!orgId) return 'Unassigned / Global';
    const org = organisations.find((o) => o.id === orgId);
    return org ? `${org.name} (${org.siteCode})` : 'Unknown Organization';
  };

  // Submit Org Handler
  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !orgSiteCode.trim()) {
      onAddToast('Please fill out all organization fields', 'error');
      return;
    }

    const normalizedSiteCode = orgSiteCode.trim().toUpperCase();

    // Check if site code already exists (excluding editing)
    const siteCodeCollision = organisations.some(
      (o) => o.siteCode.toUpperCase() === normalizedSiteCode && (!editingOrg || o.id !== editingOrg.id)
    );
    if (siteCodeCollision) {
      onAddToast(`Site Code "${normalizedSiteCode}" is already in use by another organisation.`, 'error');
      return;
    }

    const targetOrgId = editingOrg ? editingOrg.id : `org-${Date.now().toString()}`;
    let nextUsers = [...users];

    // Validate admin details if configured
    if (hasOrgAdmin) {
      const adminEmail = orgAdminEmail.trim().toLowerCase();
      const adminName = orgAdminName.trim();
      if (!adminName || !adminEmail) {
        onAddToast('Please provide a name and email for the Organisation Administrator', 'error');
        return;
      }

      if (!/^[^@]+@[^@]+\.[^@]+$/.test(adminEmail)) {
        onAddToast('Please enter a valid format for Admin Email', 'error');
        return;
      }

      // Check email collision in other users
      const existingAdmin = editingOrg 
        ? users.find((u) => u.orgId === editingOrg.id && u.role === 'Admin')
        : null;

      const emailCollision = users.some(
        (u) => u.email.toLowerCase() === adminEmail && (!existingAdmin || u.email.toLowerCase() !== existingAdmin.email.toLowerCase())
      );

      if (emailCollision) {
        onAddToast(`The Email address "${adminEmail}" is already in use by another user profile!`, 'error');
        return;
      }
    }

    if (editingOrg) {
      // Modify Organization
      const updated = organisations.map((o) => {
        if (o.id === editingOrg.id) {
          return { ...o, name: orgName.trim(), siteCode: normalizedSiteCode };
        }
        return o;
      });
      onUpdateOrganisations(updated);

      // Manage Admin Update
      const existingAdmin = users.find((u) => u.orgId === editingOrg.id && u.role === 'Admin');
      if (hasOrgAdmin) {
        if (existingAdmin) {
          nextUsers = users.map((u) => {
            if (u.email.toLowerCase() === existingAdmin.email.toLowerCase()) {
              return {
                ...u,
                name: orgAdminName.trim(),
                email: orgAdminEmail.trim().toLowerCase(),
                password: orgAdminPassword.trim() || u.password,
              };
            }
            return u;
          });
        } else {
          // Creater on edit
          const newAdmin: User = {
            email: orgAdminEmail.trim().toLowerCase(),
            name: orgAdminName.trim(),
            role: 'Admin',
            orgId: targetOrgId,
            password: orgAdminPassword.trim() || 'password',
          };
          nextUsers.push(newAdmin);
        }
        onUpdateUsers(nextUsers);
      }
      onAddToast(`Successfully updated organization and administrator: ${orgName.trim()}`, 'success');
    } else {
      // Create Organization
      const newOrg: Organisation = {
        id: targetOrgId,
        name: orgName.trim(),
        siteCode: normalizedSiteCode,
        createdAt: new Date().toISOString(),
      };
      onUpdateOrganisations([...organisations, newOrg]);

      if (hasOrgAdmin) {
        const newAdmin: User = {
          email: orgAdminEmail.trim().toLowerCase(),
          name: orgAdminName.trim(),
          role: 'Admin',
          orgId: targetOrgId,
          password: orgAdminPassword.trim() || 'password',
        };
        nextUsers.push(newAdmin);
        onUpdateUsers(nextUsers);
      }
      onAddToast(`Successfully created organization and registered Administrator: ${orgName.trim()}`, 'success');
    }

    // Reset Form
    setOrgName('');
    setOrgSiteCode('');
    setOrgAdminName('');
    setOrgAdminEmail('');
    setOrgAdminPassword('password');
    setHasOrgAdmin(true);
    setEditingOrg(null);
    setOrgFormOpen(false);
  };

  // Execute Org Delete Handler
  const executeOrgDelete = (orgId: string) => {
    const org = organisations.find((o) => o.id === orgId);
    if (!org) return;

    // Remove Organization
    const updatedOrgs = organisations.filter((o) => o.id !== orgId);
    onUpdateOrganisations(updatedOrgs);

    // Nullify user organizations for safety
    const updatedUsers = users.map((u) => {
      if (u.orgId === orgId) {
        return { ...u, orgId: undefined };
      }
      return u;
    });
    onUpdateUsers(updatedUsers);

    onAddToast(`Organization "${org.name}" has been deleted.`, 'success');
    setOrgToDelete(null);
  };

  // Submit User Handler
  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim() || !userName.trim()) {
      onAddToast('Please fill out all user profile fields', 'error');
      return;
    }

    if (userRole !== 'Super Admin' && !userOrgId) {
      onAddToast(`Please select an assigned organization workspace for this ${userRole} profile.`, 'error');
      return;
    }

    const emailNorm = userEmail.trim().toLowerCase();

    // Collision check for creation
    if (!editingUser) {
      const collisionExists = users.some((u) => u.email.toLowerCase() === emailNorm);
      if (collisionExists) {
        onAddToast(`User with email "${emailNorm}" already exists.`, 'error');
        return;
      }
    }

    if (editingUser) {
      // Edit User
      const updated = users.map((u) => {
        if (u.email.toLowerCase() === editingUser.email.toLowerCase()) {
          return {
            ...u,
            name: userName.trim(),
            role: userRole,
            orgId: userOrgId || undefined,
            password: userPassword,
          };
        }
        return u;
      });
      onUpdateUsers(updated);
      onAddToast(`Successfully updated credentials for: ${userName.trim()}`, 'success');
    } else {
      // Onboard User
      const newUser: User = {
        email: emailNorm,
        name: userName.trim(),
        role: userRole,
        orgId: userOrgId || undefined,
        password: userPassword || 'password',
      };
      onUpdateUsers([...users, newUser]);
      onAddToast(`Successfully onboarded: ${userName.trim()} to ${getOrgName(newUser.orgId)}!`, 'success');
    }

    // Reset state
    setUserEmail('');
    setUserName('');
    setUserRole('Admin');
    setUserOrgId('');
    setUserPassword('password');
    setEditingUser(null);
    setUserFormOpen(false);
  };

  // Execute User Delete Handler
  const executeUserDelete = (email: string) => {
    if (email.toLowerCase() === currentUser.email.toLowerCase()) {
      onAddToast('You cannot reject or delete your own active running session!', 'error');
      return;
    }
    const targetUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!targetUser) return;

    const updated = users.filter((u) => u.email.toLowerCase() !== email.toLowerCase());
    onUpdateUsers(updated);
    onAddToast(`User ${targetUser.name} has been de-provisioned.`, 'success');
    setUserToDelete(null);
  };

  // Render components based on active path tab
  const showOrgs = activeTab === 'super-orgs' || activeTab === '';

  // Filter lists
  const filteredOrgs = organisations.filter((o) => {
    const term = orgSearch.toLowerCase();
    return o.name.toLowerCase().includes(term) || o.siteCode.toLowerCase().includes(term);
  });

  const filteredUsers = users.filter((u) => {
    const term = userSearch.toLowerCase();
    const orgNameText = getOrgName(u.orgId).toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term) ||
      orgNameText.includes(term)
    );
  });

  return (
    <div id="superadmin-wrapper" className="space-y-6">
      
      {/* Dynamic Summary Cards Widget Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/50 p-5 flex items-center justify-between shadow-xs select-none">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Super Administrator</span>
            <span className="font-display font-extrabold text-lg text-indigo-600 truncate max-w-[150px]">{currentUser.name}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/50 p-5 flex items-center justify-between shadow-xs select-none">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Organisations</span>
            <span className="font-display font-extrabold text-2xl text-slate-900">{organisations.length}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Building className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/50 p-5 flex items-center justify-between shadow-xs select-none">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Registered Operators</span>
            <span className="font-display font-extrabold text-2xl text-slate-900">{users.length}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {showOrgs ? (
        <div id="super-orgs-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-900">Organizations Registry</h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Deploy, update, or remove multi-tenant workspaces and site codes globally.</p>
            </div>
            
            <button
              onClick={() => {
                setEditingOrg(null);
                setOrgName('');
                setOrgSiteCode('');
                setOrgAdminName('');
                setOrgAdminEmail('');
                setOrgAdminPassword('password');
                setHasOrgAdmin(true);
                setOrgFormOpen(!orgFormOpen);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/15 select-none"
            >
              <Plus className="h-4 w-4" />
              <span>Create Organisation</span>
            </button>
          </div>

          <AnimatePresence>
            {orgFormOpen && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleOrgSubmit}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {editingOrg ? 'Modify Organization' : 'Configure New Organization Portal'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setOrgFormOpen(false);
                      setEditingOrg(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Company / Organization Name</label>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Apollo Healthcare Operations"
                      className="w-full text-sm font-semibold rounded-xl border border-slate-200 py-2.5 px-3.5 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Unique Site Code</label>
                    <input
                      type="text"
                      required
                      value={orgSiteCode}
                      onChange={(e) => setOrgSiteCode(e.target.value)}
                      placeholder="e.g. APO-01 (letters/numbers)"
                      className="w-full text-sm font-semibold rounded-xl border border-slate-200 py-2.5 px-3.5 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 uppercase"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-indigo-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Assign Organisation Administrator</span>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={hasOrgAdmin} 
                        onChange={(e) => setHasOrgAdmin(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-100"
                      />
                      <span className="text-xs font-bold text-slate-500">Configure Administrator</span>
                    </label>
                  </div>

                  {hasOrgAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Admin Full Name</label>
                        <input
                          type="text"
                          required={hasOrgAdmin}
                          value={orgAdminName}
                          onChange={(e) => setOrgAdminName(e.target.value)}
                          placeholder="e.g. Ramesh Kumar"
                          className="w-full text-sm font-semibold rounded-xl border border-slate-200 py-2.5 px-3.5 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Admin Email Address</label>
                        <input
                          type="email"
                          required={hasOrgAdmin}
                          value={orgAdminEmail}
                          onChange={(e) => setOrgAdminEmail(e.target.value)}
                          placeholder="e.g. admin@orgname.com"
                          disabled={!!editingOrg && !!users.find(u => u.orgId === editingOrg.id && u.role === 'Admin')}
                          className="w-full text-sm font-semibold rounded-xl border border-slate-205 py-2.5 px-3.5 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        {editingOrg && users.some(u => u.orgId === editingOrg.id && u.role === 'Admin') && (
                          <span className="text-[10px] text-slate-400 mt-1 block font-semibold">Email is locked for existing admins</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Admin Password Pin</label>
                        <input
                          type="password"
                          required={hasOrgAdmin}
                          value={orgAdminPassword}
                          onChange={(e) => setOrgAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full text-sm font-semibold rounded-xl border border-slate-200 py-2.5 px-3.5 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOrgFormOpen(false);
                      setEditingOrg(null);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/10"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder="Filter orgs or site codes..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border border-slate-200 outline-none transition focus:border-indigo-600 bg-white"
                />
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Total: {filteredOrgs.length} matching</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/20">
                    <th className="p-4">Organization Name</th>
                    <th className="p-4">Site Code</th>
                    <th className="p-4">Tenant Administrator</th>
                    <th className="p-4">Members/Users</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold">
                  {filteredOrgs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold text-xs">
                        No organizations match your query.
                      </td>
                    </tr>
                  ) : (
                    filteredOrgs.map((org) => {
                      const associatedAdmin = users.find(u => u.orgId === org.id && u.role === 'Admin');
                      return (
                        <tr key={org.id} className="hover:bg-slate-50/30 transition">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                {org.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-slate-800 font-bold">{org.name}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-bold uppercase">
                              {org.siteCode}
                            </span>
                          </td>
                          <td className="p-4">
                            {associatedAdmin ? (
                              <div className="flex items-center justify-between gap-2.5 group/admin max-w-[240px]">
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="text-slate-800 font-bold truncate text-xs">{associatedAdmin.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono truncate">{associatedAdmin.email}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAdminToDelete(associatedAdmin);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition shrink-0"
                                  title={`De-provision admin ${associatedAdmin.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic font-semibold">None (Edit to register)</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                              <Users className="h-4 w-4 text-slate-400" />
                              <span>{getOrgUserCount(org.id)} members</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingOrg(org);
                                  setOrgName(org.name);
                                  setOrgSiteCode(org.siteCode);
                                  if (associatedAdmin) {
                                    setOrgAdminName(associatedAdmin.name);
                                    setOrgAdminEmail(associatedAdmin.email);
                                    setOrgAdminPassword(associatedAdmin.password || 'password');
                                    setHasOrgAdmin(true);
                                  } else {
                                    setOrgAdminName('');
                                    setOrgAdminEmail('');
                                    setOrgAdminPassword('password');
                                    setHasOrgAdmin(false);
                                  }
                                  setOrgFormOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition"
                                title="Modify Organization details"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setOrgToDelete(org)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-lg transition"
                                title="Delete Organization Workspace"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
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
      ) : (
        <div id="super-users-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-900">User Registry & Onboarding</h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Provision roles, update settings, or allocate operators to tenant workspaces.</p>
            </div>
            
            <button
              onClick={() => {
                setEditingUser(null);
                setUserEmail('');
                setUserName('');
                setUserRole('Admin');
                setUserOrgId('');
                setUserPassword('password');
                setUserFormOpen(!userFormOpen);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/15 select-none"
            >
              <Plus className="h-4 w-4" />
              <span>Provision Operator</span>
            </button>
          </div>

          <AnimatePresence>
            {userFormOpen && (
              <motion.form
                ref={userFormRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleUserSubmit}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {editingUser ? 'Edit Operator Credentials' : 'Onboard New Operational User'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setUserFormOpen(false);
                      setEditingUser(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full text-sm font-semibold rounded-xl border border-slate-200 py-2.5 px-3.5 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Email Address (Key Primary field)</label>
                    <input
                      type="email"
                      required
                      disabled={!!editingUser}
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="operator@fieldops.com"
                      className="w-full text-sm font-semibold rounded-xl border border-slate-200 py-2.5 px-3.5 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">System Security Role</label>
                    <select
                      value={userRole}
                      onChange={(e) => {
                        const nextRole = e.target.value as UserRole;
                        setUserRole(nextRole);
                        if (nextRole === 'Super Admin') {
                          setUserOrgId('');
                        }
                      }}
                      className="w-full text-sm font-semibold rounded-xl border border-slate-200 py-2.5 px-3.5 outline-none bg-white transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="Super Admin">Super Admin (Global Manager)</option>
                      <option value="Admin">Admin (Org Master)</option>
                      <option value="Store Manager">Store Manager (Store Supervisor)</option>
                      <option value="Team Leader">Team Leader (Field Supervisor)</option>
                      <option value="Engineer">Engineer (Field Operator)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Assigned Tenant Workspace (Organisation)</label>
                    <select
                      value={userOrgId}
                      onChange={(e) => setUserOrgId(e.target.value)}
                      className="w-full text-sm font-semibold rounded-xl border border-slate-200 py-2.5 px-3.5 outline-none bg-white transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Unassigned / Global Super-Admin Workspace</option>
                      {organisations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} [{org.siteCode}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Login Password Pin</label>
                    <input
                      type="password"
                      required
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-sm font-semibold rounded-xl border border-slate-200 py-2.5 px-3.5 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserFormOpen(false);
                      setEditingUser(null);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/10"
                  >
                    {editingUser ? 'Save Credentials Record' : 'Confirm Provisioning'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search name, email, role or workspace..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border border-slate-200 outline-none transition focus:border-indigo-600 bg-white"
                />
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Total: {filteredUsers.length} operators</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/20">
                    <th className="p-4">User Operator</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Assigned Tenant Organization</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-bold text-xs">
                        No operators registered.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u.email.toLowerCase() === currentUser.email.toLowerCase();
                      return (
                        <tr key={u.email} className={`hover:bg-slate-50/30 transition ${isSelf ? 'bg-indigo-50/10' : ''}`}>
                          <td className="p-4 text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-slate-900 font-bold text-sm flex items-center gap-1.5">
                                {u.name}
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-extrabold uppercase">You</span>
                                )}
                              </span>
                              <span className="text-slate-400 font-mono font-medium">{u.email}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold leading-none ${
                              u.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' :
                              u.role === 'Admin' ? 'bg-indigo-100 text-indigo-700' :
                              u.role === 'Store Manager' ? 'bg-emerald-100 text-emerald-700' :
                              u.role === 'Team Leader' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 text-xs">
                              {u.orgId ? (
                                <>
                                  <Building className="h-4 w-4 text-slate-400 shrink-0" />
                                  <span className="text-slate-700 font-bold">{getOrgName(u.orgId)}</span>
                                </>
                              ) : (
                                <>
                                  <Activity className="h-4 w-4 text-slate-400 shrink-0" />
                                  <span className="text-slate-400 font-semibold italic">Global Administrator</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setUserName(u.name);
                                  setUserEmail(u.email);
                                  setUserRole(u.role);
                                  setUserOrgId(u.orgId || '');
                                  setUserPassword(u.password || 'password');
                                  setUserFormOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50/50 rounded-lg transition"
                                title="Edit operator credentials"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setUserToDelete(u)}
                                disabled={isSelf}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent"
                                title={isSelf ? 'Cannot delete self' : 'De-provision user'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
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
      )}

      {/* Safe Custom React Confirmation Modals to replace blocked window.confirm */}
      <AnimatePresence>
        {orgToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-600">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-sm">Delete Organisation</h3>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Workspace De-provisioning</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                {getOrgUserCount(orgToDelete.id) > 0
                  ? `Warning: Organisation "${orgToDelete.name}" has ${getOrgUserCount(orgToDelete.id)} registered users. Deleting this will unassign them and remove their tenant association. Do you wish to proceed?`
                  : `Are you sure you want to delete the organisation "${orgToDelete.name}"? This action cannot be undone.`}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrgToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeOrgDelete(orgToDelete.id)}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md shadow-rose-600/10"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-sm">De-provision User Operator</h3>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Identity Access Revocation</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Are you sure you want to de-provision User <span className="font-bold text-slate-900">"{userToDelete.name}"</span> ({userToDelete.email})? They will immediately lose access to LogiTask and their active session will be invalidated.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeUserDelete(userToDelete.email)}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md shadow-rose-600/10"
                >
                  Confirm De-provision
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {adminToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-sm">De-provision Org Administrator</h3>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Workspace Admin Unassignment</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Are you sure you want to de-provision and delete the associated Admin <span className="font-bold text-slate-900">"{adminToDelete.name}"</span> ({adminToDelete.email})? They will immediately lose access as administrator for their organization.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = users.filter((u) => u.email.toLowerCase() !== adminToDelete.email.toLowerCase());
                    onUpdateUsers(updated);
                    onAddToast(`Administrator ${adminToDelete.name} has been de-provisioned.`, 'success');
                    setAdminToDelete(null);
                  }}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md shadow-rose-600/10"
                >
                  Confirm De-provision
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
