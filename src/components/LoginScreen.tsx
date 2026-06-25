/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import { Wrench, Lock, Mail } from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export function LoginScreen({ users, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
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

    const matchedUser = users.find(
      (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
    );

    if (!matchedUser) {
      setError('Invalid email or password.');
      return;
    }

    onLoginSuccess(matchedUser);
  };

  return (
    <div id="login-screen" className="fixed inset-0 z-50 flex items-center justify-center bg-radial from-[rgba(79,91,213,0.08)] to-transparent bg-slate-100 p-4">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200/50 bg-white p-8 shadow-2xl md:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Wrench className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-slate-950">
            LogiTask
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            We deliver the best.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800">
              {error}
            </div>
          )}

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
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 outline-none transition duration-150 hover:bg-indigo-700 active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
