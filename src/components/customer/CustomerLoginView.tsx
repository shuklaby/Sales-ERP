import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { DEFAULT_CUSTOMER_ADMIN_PERMISSIONS, DEFAULT_CUSTOMER_USER_PERMISSIONS } from '../../types/crm';

export const CustomerLoginView: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenParam = urlParams.get('token') || '';
  const emailParam = urlParams.get('email') || '';
  const nameParam = urlParams.get('name') || '';
  const customerIdParam = urlParams.get('customerId') || '';

  const [isInviteMode, setIsInviteMode] = useState(!!tokenParam);
  const [isForgotMode, setIsForgotMode] = useState(false);

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState(nameParam);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Validate invite token if present
  useEffect(() => {
    if (tokenParam) {
      fetch(`/api/customer/verify-invite/${tokenParam}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.invite) {
            setEmail(data.invite.email || emailParam);
            setName(data.invite.name || nameParam);
            setIsInviteMode(true);
          } else {
            setError(data.error || 'Invalid or expired invitation token.');
          }
        })
        .catch(() => {
          setError('Could not verify invitation token.');
        });
    }
  }, [tokenParam]);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);

      // Check if user exists in customerUsers
      const userDocRef = doc(db, 'customerUsers', cred.user.uid);
      const snap = await getDoc(userDocRef);

      if (!snap.exists()) {
        // Check if there is an invited record with this email
        if (tokenParam && customerIdParam) {
          await setDoc(userDocRef, {
            id: cred.user.uid,
            customerUserId: cred.user.uid,
            customerId: customerIdParam,
            organizationId: customerIdParam,
            name: cred.user.displayName || name || 'Customer User',
            email: (cred.user.email || '').toLowerCase(),
            role: 'Customer Admin',
            status: 'Active',
            permissions: DEFAULT_CUSTOMER_ADMIN_PERMISSIONS,
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          // Mark invite as activated
          fetch('/api/customer/activate-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tokenParam }),
          }).catch(console.warn);
        }
      }

      window.location.href = '/customer/dashboard';
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completion.');
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
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
        setInfoMessage('Password reset email dispatched. Please check your inbox.');
        setIsForgotMode(false);
      } else if (isInviteMode) {
        // Complete invitation setup with new password
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }

        const cleanEmail = email.trim().toLowerCase();
        let cred;
        try {
          cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        } catch (createUserErr: any) {
          if (createUserErr.code === 'auth/email-already-in-use') {
            // Already has Firebase auth, sign in instead
            cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          } else {
            throw createUserErr;
          }
        }

        // Link customer user in Firestore
        const custId = customerIdParam || 'preview-customer';
        const userDocRef = doc(db, 'customerUsers', cred.user.uid);
        await setDoc(
          userDocRef,
          {
            id: cred.user.uid,
            customerUserId: cred.user.uid,
            customerId: custId,
            organizationId: custId,
            name: name.trim() || cleanEmail.split('@')[0],
            email: cleanEmail,
            role: 'Customer Admin',
            status: 'Active',
            permissions: DEFAULT_CUSTOMER_ADMIN_PERMISSIONS,
            invitationToken: tokenParam,
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        // Mark invite activated on backend
        if (tokenParam) {
          await fetch('/api/customer/activate-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tokenParam }),
          }).catch(console.warn);
        }

        window.location.href = '/customer/dashboard';
      } else {
        // Standard Customer Login
        const cleanEmail = email.trim().toLowerCase();
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        window.location.href = '/customer/dashboard';
      }
    } catch (err: any) {
      console.error('Customer login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found for this email address. Please contact your administrator for an invitation.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else {
        setError(err.message || 'Login failed. Please verify your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 antialiased selection:bg-blue-600 selection:text-white">
      {/* Background radial gradient glow */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 mb-2 shadow-xl shadow-blue-600/10">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            SparkGenTechnology
          </h1>
          <p className="text-xs text-blue-400/90 font-semibold uppercase tracking-wider">
            Customer Portal & Collaboration Suite
          </p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {isInviteMode
              ? 'Complete your account setup to access proposals, invoices, receipts, and priority support.'
              : 'Sign in to access your organization’s documents, invoices, online payments, and support.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {isInviteMode && (
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Account Activation
              </div>
              <p className="text-[11px] text-slate-300">
                You are setting up portal credentials for <strong>{email}</strong>. Choose a secure password below.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isInviteMode && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Your Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  disabled={isInviteMode && !!emailParam}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-70 transition"
                />
              </div>
            </div>

            {!isForgotMode && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300">
                    {isInviteMode ? 'Create Password' : 'Password'}
                  </label>
                  {!isInviteMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(true);
                        setError('');
                        setInfoMessage('');
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>
            )}

            {isInviteMode && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Confirm Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isForgotMode ? (
                'Send Password Reset Link'
              ) : isInviteMode ? (
                <>
                  Activate Portal & Sign In <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Sign In to Customer Portal <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {isForgotMode && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false);
                  setError('');
                  setInfoMessage('');
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {!isForgotMode && (
            <>
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  OR
                </span>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </button>
            </>
          )}

          {/* Switch to Staff/Admin login */}
          <div className="pt-2 border-t border-slate-800/80 text-center">
            <a
              href="/admin"
              className="text-[11px] text-slate-400 hover:text-blue-400 transition flex items-center justify-center gap-1 font-medium"
            >
              <span>SparkGenTechnology Staff / Employee Sign In</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Security watermark footer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Protected by Firebase Enterprise Security & Encryption</span>
        </div>
      </div>
    </div>
  );
};
