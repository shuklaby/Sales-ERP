import React, { useState } from 'react';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Clock,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';
import { Customer } from '../../../types/crm';

export const CustomerCompanyView: React.FC = () => {
  const { customerCompany, customerUser, profileChangeRequests, submitProfileChangeRequest } = useCustomerPortal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState(customerCompany?.companyName || '');
  const [contactPerson, setContactPerson] = useState(customerCompany?.contactPerson || '');
  const [email, setEmail] = useState(customerCompany?.email || '');
  const [phone, setPhone] = useState(customerCompany?.phone || '');
  const [address, setAddress] = useState(customerCompany?.address || '');
  const [gstNumber, setGstNumber] = useState(customerCompany?.gstNumber || '');
  const [website, setWebsite] = useState(customerCompany?.website || '');
  const [billingAddress, setBillingAddress] = useState(customerCompany?.billingAddress || customerCompany?.address || '');
  const [shippingAddress, setShippingAddress] = useState(customerCompany?.shippingAddress || customerCompany?.address || '');
  const [reason, setReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenModal = () => {
    setCompanyName(customerCompany?.companyName || '');
    setContactPerson(customerCompany?.contactPerson || '');
    setEmail(customerCompany?.email || '');
    setPhone(customerCompany?.phone || '');
    setAddress(customerCompany?.address || '');
    setGstNumber(customerCompany?.gstNumber || '');
    setWebsite(customerCompany?.website || '');
    setBillingAddress(customerCompany?.billingAddress || customerCompany?.address || '');
    setShippingAddress(customerCompany?.shippingAddress || customerCompany?.address || '');
    setReason('');
    setErrorMsg('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const requestedChanges: Partial<Customer> = {
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      gstNumber: gstNumber.trim().toUpperCase(),
      website: website.trim(),
      billingAddress: billingAddress.trim(),
      shippingAddress: shippingAddress.trim(),
    };

    const res = await submitProfileChangeRequest(requestedChanges, reason);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg('Your profile change request has been submitted to SparkGenTechnology administrators for approval.');
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
      }, 3000);
    } else {
      setErrorMsg(res.error || 'Failed to submit profile change request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" /> Organization Profile
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registered master corporate details for {customerCompany?.companyName || 'your organization'}
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
        >
          <Edit2 className="w-3.5 h-3.5" /> Request Profile Changes
        </button>
      </div>

      {/* Security Governance Notice */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3 text-xs text-blue-300">
        <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white block">Statutory Audit Governance</span>
          <span>
            To maintain tax compliance and prevent accidental invoicing discrepancies, modifications to GST, registered legal name, and billing addresses undergo verification by SparkGenTechnology before taking effect.
          </span>
        </div>
      </div>

      {/* Organization Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" /> Commercial Information
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Registered Legal Company Name</span>
              <span className="font-bold text-white text-sm">{customerCompany?.companyName || 'N/A'}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Primary Contact Person</span>
              <span className="font-medium text-slate-200">{customerCompany?.contactPerson || 'N/A'}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Goods & Services Tax (GSTIN)</span>
              <span className="font-mono font-bold text-emerald-400">{customerCompany?.gstNumber || 'Not Registered'}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Website</span>
              {customerCompany?.website ? (
                <a
                  href={customerCompany.website.startsWith('http') ? customerCompany.website : `https://${customerCompany.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Globe className="w-3.5 h-3.5" /> {customerCompany.website}
                </a>
              ) : (
                <span className="text-slate-500">None specified</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" /> Addresses & Contact
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Corporate Email Address</span>
              <span className="font-medium text-slate-200 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {customerCompany?.email || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Primary Phone</span>
              <span className="font-medium text-slate-200 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {customerCompany?.phone || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Billing Address</span>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                {customerCompany?.billingAddress || customerCompany?.address || 'No billing address on file'}
              </p>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Shipping / Project Address</span>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                {customerCompany?.shippingAddress || customerCompany?.address || 'Same as billing address'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Requests History */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" /> Profile Change Requests ({profileChangeRequests.length})
        </h3>

        {profileChangeRequests.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            No profile change requests submitted. Your company master profile is up to date.
          </p>
        ) : (
          <div className="space-y-2.5">
            {profileChangeRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Request #{req.id.substring(0, 12)}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : req.status === 'Rejected'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Submitted on {new Date(req.createdAt).toLocaleDateString()} • Reason: {req.reason || 'Update'}
                  </p>
                  {req.reviewNotes && (
                    <p className="text-[11px] text-slate-300 font-mono">
                      Admin note: {req.reviewNotes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Change Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" /> Request Profile Change
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Primary Contact Person</label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">GSTIN Number</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Billing Address</label>
                <textarea
                  rows={2}
                  required
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Shipping / Site Address</label>
                <textarea
                  rows={2}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Reason for Changes</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Registered office relocated, new GSTIN certificate issued"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Submitting...' : 'Submit Change Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
