import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, Mail, Loader2, ArrowRight, Landmark } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  logo?: string | null;
}

export default function LoginPage({ onLoginSuccess, logo }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please fill in both PIN/Email and password.');
      return;
    }

    setLoading(true);

    try {
      // Simulate network delay for UI feedback
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const response = await api.auth.login({ email: trimmedUser, password: trimmedPass });
      onLoginSuccess(response.user);
      if (response.token) {
        localStorage.setItem('portal_token', response.token);
      }
      toast.success('Login successful!');
    } catch (err: any) {
      if (err.message.includes('Database not connected')) {
        setError('Database not connected! Please set MONGODB_URI in Settings.');
      } else if (err.message.includes('Invalid credentials') || err.message.includes('401')) {
        toast.error('Wrong Pin or Password');
      } else if (err.message.includes('permission') || err.message.includes('account is disabled')) {
        setError('Your account is disabled. You do not have permission to log in, please contact your mentor.');
      } else {
        setError('Server error! Please try again later.');
        console.error("Login Error Details:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-600 selection:text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-3xl mix-blend-multiply" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-500/10 blur-3xl mix-blend-multiply" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          
          <div className="text-left">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight uppercase">
              Exam Scripts Management

            </h2>
            <p className="text-[10px] text-slate-400 font-bold font-mono tracking-wider uppercase text-center">Attendance & Notice Management
</p>
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-slate-500 font-medium">
          Sign in to access your dashboard
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white py-8 px-6 shadow-2xl shadow-slate-200/50 rounded-3xl border border-slate-100 sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 text-red-600 rounded-xl p-4 text-sm font-medium flex items-start gap-3 border border-red-100"
              >
                <span className="shrink-0 font-bold mt-0.5">!</span>
                <span>{error}</span>
              </motion.div>
            )}

            <div className="space-y-2">
              <label htmlFor="id_email" className="block text-sm font-semibold text-slate-700">
                PIN or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
                </div>
                <input
                  id="id_email"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your PIN or Email"
                  className="block w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors placeholder:text-slate-400 text-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors placeholder:text-slate-400 text-slate-900 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold tracking-wide text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all shadow-md hover:shadow-lg ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In </span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center text-xs text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} Exam Scripts Management

        </div>
      </motion.div>
    </div>
  );
}
