import React, { useState } from 'react';
import { Lock, Mail, User, ShieldCheck, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, login, register, resetPassword, quickLoginAsAdmin, quickLoginAsEmployee } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completion.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by the browser. Please allow popups or use 1-click evaluation.');
      } else {
        setError(err.message || 'Google sign-in failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setIsSubmitting(true);

    try {
      if (isForgotMode) {
        await resetPassword(email);
        setInfoMessage('Password reset email sent! Check your inbox.');
        setIsForgotMode(false);
      } else if (isRegisterMode) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered. Please log in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg mx-auto">
            SG
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SparkGenTechnology CRM & ERP</h1>
          <p className="text-xs text-slate-400">
            Real-Time Enterprise Sales Execution, Telephony, & Commercial Proposals
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-medium">
              {infoMessage}
            </div>
          )}

          {/* Primary Google Login Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-3 border border-slate-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {isSubmitting ? 'Authenticating...' : 'Continue with Google Account'}
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Pre-configured Google Single Sign-On (Auto-admin for shukla.by@gmail.com)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Or with Email & Password
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full text-xs text-white pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Corporate Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full text-xs text-white pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {!isForgotMode && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs text-white pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                'Processing...'
              ) : isForgotMode ? (
                'Send Reset Link'
              ) : isRegisterMode ? (
                'Create Account'
              ) : (
                <>
                  Sign In with Password <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="text-center text-xs text-slate-400">
            {isForgotMode ? (
              <button
                type="button"
                onClick={() => setIsForgotMode(false)}
                className="text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Back to Sign In
              </button>
            ) : isRegisterMode ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Create One
                </button>
              </span>
            )}
          </div>

          {/* 1-Click Evaluation Shortcuts */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block text-center tracking-wider">
              Instant 1-Click Evaluation Access
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={quickLoginAsAdmin}
                disabled={isSubmitting}
                className="p-2.5 bg-slate-950 hover:bg-slate-800/90 border border-slate-800 text-slate-200 rounded-xl text-xs font-medium text-left flex flex-col transition-colors group cursor-pointer"
              >
                <span className="font-bold text-indigo-400 flex items-center justify-between">
                  Super Admin <Sparkles className="w-3 h-3 text-indigo-400" />
                </span>
                <span className="text-[10px] text-slate-400">shukla.by@gmail.com</span>
              </button>

              <button
                type="button"
                onClick={quickLoginAsEmployee}
                disabled={isSubmitting}
                className="p-2.5 bg-slate-950 hover:bg-slate-800/90 border border-slate-800 text-slate-200 rounded-xl text-xs font-medium text-left flex flex-col transition-colors group cursor-pointer"
              >
                <span className="font-bold text-emerald-400 flex items-center justify-between">
                  Sales Employee <ArrowRight className="w-3 h-3 text-emerald-400" />
                </span>
                <span className="text-[10px] text-slate-400">Sales Representative</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
