import React, { useState } from 'react';
import { User, Mail, Phone, Lock, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../firebase';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';

export const CustomerProfileView: React.FC = () => {
  const { customerUser, updateCustomerUserProfile } = useCustomerPortal();

  const [name, setName] = useState(customerUser?.name || '');
  const [phone, setPhone] = useState(customerUser?.phone || '');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [passwordSent, setPasswordSent] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await updateCustomerUserProfile({
      name: name.trim(),
      phone: phone.trim(),
    });
    setSaving(false);

    if (res.success) {
      setSuccessMsg('Your personal profile details have been saved.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(res.error || 'Failed to update profile');
    }
  };

  const handlePasswordReset = async () => {
    if (!customerUser?.email) return;
    try {
      await sendPasswordResetEmail(auth, customerUser.email);
      setPasswordSent(true);
      setTimeout(() => setPasswordSent(false), 5000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to dispatch password reset link');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <User className="w-5 h-5 text-blue-400" /> User Profile
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal customer account credentials and security preferences
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Form */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5">
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Your Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Email Address (Authentication Identity)</label>
            <input
              type="email"
              disabled
              value={customerUser?.email || ''}
              className="w-full bg-slate-950/60 border border-slate-800 text-slate-500 rounded-xl p-2.5 cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-500">
              For security compliance, authentication email changes must be requested through your administrator.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Phone / Mobile</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Assigned Organization Role</label>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-medium">
              {customerUser?.role || 'Customer User'}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Password & Security Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" /> Security & Password
        </h3>
        <p className="text-xs text-slate-400">
          Request a secure password reset link sent to your registered email address ({customerUser?.email}).
        </p>

        {passwordSent ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Password reset link sent! Check your inbox.</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePasswordReset}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Send Password Reset Link
          </button>
        )}
      </div>
    </div>
  );
};
