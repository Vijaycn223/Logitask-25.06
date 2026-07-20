/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Organisation } from '../types';
import { Wrench, Lock, Mail, Building, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onRegisterOrganisation: (orgName: string, adminName: string, email: string, password: string) => Promise<boolean>;
}

export function LoginScreen({ onLoginSuccess, onRegisterOrganisation }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Register states
  const [orgName, setOrgName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch user document directly
      const userSnap = await getDoc(doc(db, 'users', normalizedEmail));
      if (!userSnap.exists()) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }

      const matchedUser = userSnap.data() as User;

      // 2. Validate password
      if (matchedUser.password !== password) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }

      // 3. Check suspension status
      if (matchedUser.isSuspended) {
        setError('Your account has been suspended by the administrator.');
        setLoading(false);
        return;
      }

      // 4. Verify Organization subscription status
      if (matchedUser.orgId) {
        const orgSnap = await getDoc(doc(db, 'organisations', matchedUser.orgId));
        if (orgSnap.exists()) {
          const org = orgSnap.data() as Organisation;
          if (org.status === 'suspended') {
            setError('Your organization subscription has expired or is suspended. Please contact billing.');
            setLoading(false);
            return;
          }
        }
      }

      onLoginSuccess(matchedUser);
    } catch (err: any) {
      console.error("Login verification error:", err);
      setError('Connection failure. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const oName = orgName.trim();
    const aName = adminName.trim();
    const rEmail = regEmail.trim().toLowerCase();
    const rPassword = regPassword;

    if (!oName || !aName || !rEmail || !rPassword) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      // Direct Firestore check to see if email already exists
      const userSnap = await getDoc(doc(db, 'users', rEmail));
      if (userSnap.exists()) {
        setError('A user with this email address already exists.');
        setLoading(false);
        return;
      }

      const success = await onRegisterOrganisation(oName, aName, rEmail, rPassword);
      if (success) {
        setIsRegistering(false);
        setEmail(rEmail);
        setPassword(rPassword);
        setError('');
      } else {
        setError('Failed to register organization. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-screen" className="fixed inset-0 z-50 flex items-center justify-center bg-radial from-[rgba(79,91,213,0.08)] to-transparent bg-slate-100 p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200/50 bg-white p-8 shadow-2xl md:p-10 my-8">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Wrench className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-slate-950">
            {isRegistering ? 'Start Free Trial' : 'LogiTask SaaS'}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {isRegistering ? 'Set up your organization workspace in seconds' : 'Enterprise Operations & Field Management'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800">
            {error}
          </div>
        )}

        {!isRegistering ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-medium outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-155"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 outline-none transition duration-150 hover:bg-indigo-700 active:scale-[0.98]"
            >
              Sign In
            </button>

            <div className="mt-6 text-center text-xs">
              <span className="text-slate-400">Need a workspace? </span>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError('');
                }}
                className="font-bold text-indigo-650 hover:underline"
              >
                Register New Organization
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
                Company / Organization Name
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Services"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
                Your Full Name (Admin)
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-500 mb-1.5">
                Choose Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type={showRegPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-medium outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-155"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showRegPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 outline-none transition duration-150 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Start 14-Day Free Trial'}
            </button>

            <div className="mt-6 text-center text-xs">
              <span className="text-slate-400">Already registered? </span>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError('');
                }}
                className="font-bold text-indigo-655 hover:underline"
              >
                Sign In Instead
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
