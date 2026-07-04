import React, { useState } from 'react';
import { User, Mentor, TeamMember } from '../types';
import { MOCK_MANAGERS } from '../data';
import { Landmark, KeyRound, Mail, Shield, UserCheck, Users, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  mentors: Mentor[];
  members: TeamMember[];
  onLoginSuccess: (user: User) => void;
}

export default function LoginPage({ mentors, members, onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in both PIN/Email and password.');
      return;
    }

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    // 1. Check Managers
    const matchedManager = MOCK_MANAGERS.find(
      (m) => (m.pin?.toLowerCase() || '') === trimmedUser || (m.email?.toLowerCase() || '') === trimmedUser
    );
    if (matchedManager && matchedManager.password === trimmedPass) {
      onLoginSuccess(matchedManager);
      return;
    }

    // 2. Check Mentors
    const matchedMentor = mentors.find(
      (m) => (m.pin?.toLowerCase() || '') === trimmedUser || (m.email?.toLowerCase() || '') === trimmedUser
    );
    if (matchedMentor && matchedMentor.password === trimmedPass) {
      onLoginSuccess(matchedMentor);
      return;
    }

    // 3. Check Members
    const matchedMember = members.find(
      (m) => (m.pin?.toLowerCase() || '') === trimmedUser || (m.email?.toLowerCase() || '') === trimmedUser
    );
    if (matchedMember && matchedMember.password === trimmedPass) {
      onLoginSuccess(matchedMember);
      return;
    }

    setError('Invalid PIN/Email or Password. Please try again or use the demo credentials below.');
  };

  const handleAutoFill = (pin: string, pass: string) => {
    setUsername(pin);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-indigo-600 text-white p-3.5 rounded-3xl shadow-lg">
            <Landmark className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-900 uppercase">
          Attendance Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          Secure Biometric & Announcement Desk
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-200/80 sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-semibold flex items-start gap-2 animate-pulse">
                <span className="shrink-0 font-extrabold font-mono">⚠️ ERROR:</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="id_email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                User PIN or Email Address
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="id_email"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. manager@portal.com or member-1"
                  className="block w-full pl-10 pr-3.5 py-3 border border-slate-250 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-3 border border-slate-250 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-extrabold uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-md hover:shadow-lg"
              >
                Sign In Securely
              </button>
            </div>
          </form>

          {/* Quick Demo Accounts Drawer */}
          <div className="mt-8 border-t border-slate-150 pt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              Demo Accounts Quick Fill
            </h3>
            
            <div className="space-y-2">
              {/* Manager */}
              <div 
                onClick={() => handleAutoFill('manager@portal.com', 'password')}
                className="flex items-center justify-between p-2.5 rounded-xl border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="font-extrabold text-slate-800">Alice Vance (Manager)</p>
                    <p className="text-[10px] text-slate-500 font-medium">manager@portal.com</p>
                  </div>
                </div>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">Manager</span>
              </div>

              {/* Campus Coordinator */}
              <div 
                onClick={() => handleAutoFill('sarah.j@portal.com', 'password')}
                className="flex items-center justify-between p-2.5 rounded-xl border border-sky-100 bg-sky-50/30 hover:bg-sky-50 hover:border-sky-200 transition-all cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  <div>
                    <p className="font-extrabold text-slate-800">Sarah Jenkins (Campus Coordinator)</p>
                    <p className="text-[10px] text-slate-500 font-medium">sarah.j@portal.com</p>
                  </div>
                </div>
                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-md">Campus Coordinator</span>
              </div>

              {/* Member */}
              <div 
                onClick={() => handleAutoFill('alex.rivera@portal.com', 'password')}
                className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-extrabold text-slate-800">Alex Rivera (Member)</p>
                    <p className="text-[10px] text-slate-500 font-medium">alex.rivera@portal.com</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">Member</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
