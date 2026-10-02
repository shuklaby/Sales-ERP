import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Target,
  User,
  Hash,
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  Building,
  Phone,
  Mail,
  FileText,
  Globe,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Lead, CustomerStatus, LeadStatus, Customer } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { DuplicateWarningModal } from '../sales/DuplicateWarningModal';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadToEdit?: Lead | null;
}

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, leadToEdit }) => {
  const {
    addLead,
    updateLead,
    employees,
    generateNextLeadId,
    salesSources,
    salesStatuses,
    checkDuplicateCustomer,
  } = useCrmData();
  const { userProfile, isAdmin, hasPermission } = useAuth();

  const [leadId, setLeadId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [requirement, setRequirement] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [leadSource, setLeadSource] = useState('Website');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [status, setStatus] = useState<string>('New');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [estimatedValue, setEstimatedValue] = useState<number | ''>('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [nextFollowupTime, setNextFollowupTime] = useState('11:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Duplicate Warning Modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);

  useEffect(() => {
    if (leadToEdit) {
      setLeadId(leadToEdit.leadNumber || leadToEdit.leadId || '');
      setCompanyName(leadToEdit.companyName || '');
      setContactPerson(leadToEdit.contactPerson || '');
      setMobile(leadToEdit.phone || leadToEdit.mobile || '');
      setAlternateMobile(leadToEdit.alternatePhone || leadToEdit.alternateMobile || leadToEdit.alternateNumber || '');
      setEmail(leadToEdit.email || '');
      setGstNumber(leadToEdit.gstNumber || '');
      setWebsite(leadToEdit.website || '');
      setIndustry(leadToEdit.industry || '');
      setRequirement(leadToEdit.requirement || '');
      setAddress(leadToEdit.address || '');
      setCity(leadToEdit.city || '');
      setState(leadToEdit.state || '');
      setPincode(leadToEdit.pincode || '');
      setLeadSource(leadToEdit.source || leadToEdit.leadSource || 'Website');
      setAssignedEmployeeId(leadToEdit.assignedEmployeeId || '');
      setStatus(leadToEdit.status || 'New');
      setPriority(leadToEdit.priority || 'Medium');
      setEstimatedValue(leadToEdit.estimatedValue ?? '');
      setNextFollowupDate(leadToEdit.nextFollowupDate || leadToEdit.nextFollowUp || '');
      setNextFollowupTime(leadToEdit.nextFollowupTime || '11:00');
      setNotes(leadToEdit.notes || '');
    } else {
      setLeadId(generateNextLeadId());
      setCompanyName('');
      setContactPerson('');
      setMobile('');
      setAlternateMobile('');
      setEmail('');
      setGstNumber('');
      setWebsite('');
      setIndustry('');
      setRequirement('');
      setAddress('');
      setCity('');
      setState('');
      setPincode('');
      setLeadSource('Website');
      setAssignedEmployeeId(userProfile?.uid || '');
      setStatus('New');
      setPriority('Medium');
      setEstimatedValue('');
      setNextFollowupDate('');
      setNextFollowupTime('11:00');
      setNotes('');
    }
    setError('');
  }, [leadToEdit, isOpen, userProfile, generateNextLeadId]);

  // Check for duplicates dynamically
  const duplicateCheckResult = useMemo(() => {
    if (leadToEdit) return { hasDuplicate: false, matches: [] };
    if (!mobile && !email && !gstNumber) return { hasDuplicate: false, matches: [] };
    return checkDuplicateCustomer({
      phone: mobile,
      email,
      gstNumber,
    });
  }, [mobile, email, gstNumber, checkDuplicateCustomer, leadToEdit]);

  if (!isOpen) return null;

  const handleUseExistingCustomer = (cust: Customer) => {
    setCompanyName(cust.companyName);
    setContactPerson(cust.contactPerson);
    setMobile(cust.mobile || cust.phone || mobile);
    setEmail(cust.email || email);
    setGstNumber(cust.gstNumber || gstNumber);
    setAddress(cust.address || cust.billingAddress || address);
    setCity(cust.city || city);
    setState(cust.state || state);
    setPincode(cust.pincode || pincode);
    if (cust.assignedEmployeeId) setAssignedEmployeeId(cust.assignedEmployeeId);
    setShowDuplicateModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (leadToEdit && !isAdmin && !hasPermission('editLead')) {
      setError('You do not have permission to edit leads.');
      return;
    }
    if (!leadToEdit && !isAdmin && !hasPermission('createLead')) {
      setError('You do not have permission to create leads.');
      return;
    }

    if (!companyName.trim()) {
      setError('Company Name is required *');
      return;
    }
    if (!contactPerson.trim()) {
      setError('Contact Person is required *');
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      setError('Please provide a valid 10-digit mobile number *');
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedEmp = employees.find((e) => e.uid === assignedEmployeeId);

      const payload = {
        leadId: leadId.trim() || generateNextLeadId(),
        leadNumber: leadId.trim() || generateNextLeadId(),
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        mobile: mobile.trim(),
        phone: mobile.trim(),
        alternateMobile: alternateMobile.trim() || undefined,
        alternatePhone: alternateMobile.trim() || undefined,
        alternateNumber: alternateMobile.trim() || undefined,
        email: email.trim() || undefined,
        gstNumber: gstNumber.trim().toUpperCase() || undefined,
        website: website.trim() || undefined,
        industry: industry.trim() || undefined,
        requirement: requirement.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        source: leadSource,
        leadSource,
        assignedEmployeeId: assignedEmployeeId || userProfile?.uid,
        assignedEmployeeName: assignedEmp?.name || userProfile?.name || 'Unassigned',
        status,
        priority,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
        nextFollowupDate: nextFollowupDate || undefined,
        nextFollowupTime: nextFollowupTime || undefined,
        nextFollowUp: nextFollowupDate || undefined,
        notes: notes.trim() || undefined,
      };

      if (leadToEdit) {
        await updateLead(leadToEdit.id, payload);
      } else {
        await addLead(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSources = salesSources.filter((s) => s.isActive);
  const activeStatuses = salesStatuses.filter((s) => s.isActive);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200">
          <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-800 rounded-lg text-blue-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">
                  {leadToEdit ? `Edit Lead — ${leadToEdit.leadNumber || leadToEdit.leadId}` : 'Create Sales Prospect Lead'}
                </h3>
                <p className="text-xs text-slate-400">Capture initial deal potential, contact details, and follow-up timeline</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 text-xs px-5 py-2.5 border-b border-rose-100 font-medium">
              {error}
            </div>
          )}

          {/* Duplicate Customer Detection Warning Banner */}
          {duplicateCheckResult.hasDuplicate && (
            <div className="bg-amber-50 border-b border-amber-200 p-4 text-xs flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-900">Possible Existing Customer Detected!</div>
                  <div className="text-amber-800 mt-0.5">
                    {duplicateCheckResult.matches[0].detail}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleUseExistingCustomer(duplicateCheckResult.matches[0].customer)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-2xs font-bold shadow-2xs"
                >
                  Use Existing
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(true)}
                  className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded-lg text-2xs font-semibold hover:bg-amber-100/50"
                >
                  Review
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Lead Number Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600">Lead Number:</span>
                <span className="text-xs font-mono font-bold text-blue-700 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                  {leadId || 'Generating...'}
                </span>
              </div>
              {isAdmin && !leadToEdit && (
                <button
                  type="button"
                  onClick={() => setLeadId(generateNextLeadId())}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Regenerate
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Customer Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Zenith Tech Corp"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Alok Verma"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Phone</label>
                <input
                  type="tel"
                  value={alternateMobile}
                  onChange={(e) => setAlternateMobile(e.target.value)}
                  placeholder="Secondary phone"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="27AABCU9603R1ZM"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://company.com"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Industry / Sector</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Manufacturing, Energy, IT"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Requirement</label>
                <input
                  type="text"
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  placeholder="e.g. 500kVA Transformer, PLC Automation with SCADA"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / Office Address"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Pune"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Maharashtra"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Deal Value (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 250000"
                    className="w-full text-xs border border-slate-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Source</label>
                <select
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {activeSources.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pipeline Stage / Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {activeStatuses.map((st) => (
                    <option key={st.id} value={st.name}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Executive</label>
                <select
                  value={assignedEmployeeId}
                  onChange={(e) => setAssignedEmployeeId(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden disabled:bg-slate-50"
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp.uid} value={emp.uid}>
                      {emp.name} ({emp.department || 'Sales'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Next Follow-up Date</label>
                <input
                  type="date"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Next Follow-up Time</label>
                <input
                  type="time"
                  value={nextFollowupTime}
                  onChange={(e) => setNextFollowupTime(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Notes & Opportunity Description</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Product interest, budget range, decision-maker authority notes..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                {isSubmitting ? 'Saving...' : leadToEdit ? 'Update Lead' : 'Create Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        matches={duplicateCheckResult.matches}
        onUseExistingCustomer={handleUseExistingCustomer}
        onCreateAnyway={() => setShowDuplicateModal(false)}
      />
    </>
  );
};
