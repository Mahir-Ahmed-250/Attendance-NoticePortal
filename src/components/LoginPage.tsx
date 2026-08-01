import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, Mail, Loader2, ArrowRight, Landmark, ArrowLeft, Lock, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  logo?: string | null;
}

export default function LoginPage({ onLoginSuccess, logo }: LoginPageProps) {
  const [view, setView] = useState<'login' | 'forgot' | 'verify-otp' | 'reset-password'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [forgotPin, setForgotPin] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setDevOtp('');
    const trimmedPin = forgotPin.trim();

    if (!trimmedPin) {
      setError('Please enter your PIN.');
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const res = await api.auth.forgotPassword(trimmedPin);
      toast.success(res.message || 'OTP sent to your email.');
      setInfoMessage(res.message || 'OTP sent successfully!');
      if (res.devFallback && res.otp) {
        setDevOtp(res.otp);
      }
      setView('verify-otp');
    } catch (err: any) {
      setError(err.message || 'PIN not found or failed to send mail.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setError('Please enter the OTP.');
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const res = await api.auth.verifyOtp({ pin: forgotPin.trim(), otp: trimmedOtp });
      toast.success(res.message || 'OTP verified successfully!');
      setInfoMessage('OTP verified successfully! Please set your new password below.');
      setView('reset-password');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const trimmedOtp = otp.trim();
    const trimmedNewPass = newPassword.trim();
    const trimmedConfirmPass = confirmPassword.trim();

    if (!trimmedNewPass || !trimmedConfirmPass) {
      setError('Please fill in both password fields.');
      return;
    }

    if (trimmedNewPass !== trimmedConfirmPass) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const res = await api.auth.resetPassword({
        pin: forgotPin.trim(),
        otp: trimmedOtp,
        password: trimmedNewPass
      });
      toast.success(res.message || 'Password reset successfully!');
      setView('login');
      setUsername(forgotPin.trim());
      setPassword('');
      setForgotPin('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try requesting a new OTP.');
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
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight uppercase text-center">
              Exam Scripts Management
            </h2>
            <p className="text-[10px] text-slate-400 font-bold font-mono tracking-wider uppercase text-center">
              Management Portal
            </p>
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-slate-500 font-medium">
          {view === 'login' && 'Sign in to access your dashboard'}
          {view === 'forgot' && 'Password Recovery'}
          {view === 'verify-otp' && 'Verify Your OTP'}
          {view === 'reset-password' && 'Set New Password'}
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white py-8 px-6 shadow-2xl shadow-slate-200/50 rounded-3xl border border-slate-100 sm:px-10">
          {view === 'login' && (
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
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot');
                      setError('');
                      setInfoMessage('');
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <input
                    id="password"
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-12 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors placeholder:text-slate-400 text-slate-900 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="h-5 w-5" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-5 w-5" strokeWidth={1.5} />
                    )}
                  </button>
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
          )}

          {view === 'forgot' && (
            <form className="space-y-6" onSubmit={handleForgotPassword}>
              <div className="text-center pb-2">
                <h3 className="text-base font-bold text-slate-800">Forgot Password?</h3>
                <p className="text-xs text-slate-500 mt-1">Enter your PIN below. We will send a 6-digit One-Time Password (OTP) to your registered email address.</p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 text-red-600 rounded-xl p-4 text-xs font-medium flex items-start gap-3 border border-red-100"
                >
                  <span className="shrink-0 font-bold mt-0.5">!</span>
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="space-y-2">
                <label htmlFor="forgot_pin" className="block text-sm font-semibold text-slate-700">
                  PIN Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <input
                    id="forgot_pin"
                    type="text"
                    required
                    value={forgotPin}
                    onChange={(e) => setForgotPin(e.target.value)}
                    placeholder="Enter your PIN"
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
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setError('');
                    setInfoMessage('');
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Login</span>
                </button>
              </div>
            </form>
          )}

          {view === 'verify-otp' && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div className="text-center pb-2">
                <h3 className="text-base font-bold text-slate-800">Verify Your OTP</h3>
                <p className="text-xs text-slate-500 mt-1">We sent a 6-digit verification code to the registered email address of PIN <strong>{forgotPin}</strong>.</p>
              </div>

              {infoMessage && (
                <div className="bg-emerald-50 text-emerald-700 rounded-xl p-4 text-xs font-medium flex items-start gap-3 border border-emerald-100">
                  <span className="shrink-0 font-bold mt-0.5">✓</span>
                  <span>{infoMessage}</span>
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 text-red-600 rounded-xl p-4 text-xs font-medium flex items-start gap-3 border border-red-100"
                >
                  <span className="shrink-0 font-bold mt-0.5">!</span>
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="space-y-2">
                <label htmlFor="reset_otp" className="block text-xs font-semibold text-slate-700">
                  OTP Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <input
                    id="reset_otp"
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-Digit OTP"
                    className="block w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors placeholder:text-slate-400 text-slate-900 font-medium text-center tracking-widest font-mono"
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
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Verify OTP</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot');
                    setError('');
                    setInfoMessage('');
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Request a New OTP</span>
                </button>
              </div>
            </form>
          )}

          {view === 'reset-password' && (
            <form className="space-y-5" onSubmit={handleResetPassword}>
              <div className="text-center pb-2">
                <h3 className="text-base font-bold text-slate-800">Set New Password</h3>
                <p className="text-xs text-slate-500 mt-1">Please enter your new secure password below to complete the process.</p>
              </div>

              {infoMessage && (
                <div className="bg-emerald-50 text-emerald-700 rounded-xl p-4 text-xs font-medium flex items-start gap-3 border border-emerald-100">
                  <span className="shrink-0 font-bold mt-0.5">✓</span>
                  <span>{infoMessage}</span>
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 text-red-600 rounded-xl p-4 text-xs font-medium flex items-start gap-3 border border-red-100"
                >
                  <span className="shrink-0 font-bold mt-0.5">!</span>
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="space-y-2">
                <label htmlFor="new_password" className="block text-xs font-semibold text-slate-700">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-4.5 w-4.5 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <input
                    id="new_password"
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className="block w-full pl-12 pr-12 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors placeholder:text-slate-400 text-slate-900 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4.5 w-4.5" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-4.5 w-4.5" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm_password" className="block text-xs font-semibold text-slate-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-4.5 w-4.5 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className="block w-full pl-12 pr-12 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors placeholder:text-slate-400 text-slate-900 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4.5 w-4.5" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-4.5 w-4.5" strokeWidth={1.5} />
                    )}
                  </button>
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
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setError('');
                    setInfoMessage('');
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Login</span>
                </button>
              </div>
            </form>
          )}
        </div>
        
        <div className="mt-8 text-center text-xs text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} Exam Scripts Management
        </div>
      </motion.div>
    </div>
  );
}
