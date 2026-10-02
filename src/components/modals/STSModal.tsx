import React, { useState, useEffect } from 'react';
import { X, FileCheck, DollarSign, MessageSquare, Phone, Mail, Calendar } from 'lucide-react';
import { STSRecord, Customer, Lead } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';

interface STSModalProps {
  isOpen: boolean;
  onClose: () => void;
  stsToEdit?: STSRecord | null;
  initialCustomer?: Customer | null;
  initialLead?: Lead | null;
}

export const STSModal: React.FC<STSModalProps> = ({
  isOpen,
  onClose,
  stsToEdit,
  initialCustomer,
  initialLead,
}) => {
  const { addSTS, updateSTS, customers, leads, employees } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('');
  const [requirement, setRequirement] = useState('');
  const [status, setStatus] = useState<STSRecord['status']>('Draft');
  const [talkStatus, setTalkStatus] = useState<'Yes' | 'No' | 'Callback' | 'Not Reachable' | ''>('');
  const [amount, setAmount] = useState<number | ''>(0);
  const [followUpDate, setFollowUpDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [source, setSource] = useState('Direct');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stsToEdit) {
      if (stsToEdit.customerId) {
        setSelectedEntityKey(`cust_${stsToEdit.customerId}`);
      } else if (stsToEdit.leadId) {
        setSelectedEntityKey(`lead_${stsToEdit.leadId}`);
      }
      setRequirement(stsToEdit.requirement || '');
      setStatus(stsToEdit.status || 'Draft');
      setTalkStatus(stsToEdit.talkStatus || '');
      setAmount(stsToEdit.amount || stsToEdit.estimatedValue || 0);
      setFollowUpDate(stsToEdit.followUpDate || stsToEdit.nextFollowUpAt || '');
      setRemarks(stsToEdit.remarks || '');
      setSource(stsToEdit.source || 'Direct');
      setPhone(stsToEdit.phone || '');
      setEmail(stsToEdit.email || '');
      setAssignedEmployeeId(stsToEdit.assignedEmployeeId || '');
    } else if (initialCustomer) {
      setSelectedEntityKey(`cust_${initialCustomer.id}`);
      setPhone(initialCustomer.mobile || initialCustomer.phone || '');
      setEmail(initialCustomer.email || '');
      setRequirement('');
      setStatus('Draft');
      setTalkStatus('');
      setAmount(0);
      setFollowUpDate('');
      setRemarks('');
      setSource(initialCustomer.leadSource || 'Direct');
      setAssignedEmployeeId(initialCustomer.assignedEmployeeId || userProfile?.uid || '');
    } else if (initialLead) {
      setSelectedEntityKey(`lead_${initialLead.id}`);
      setPhone(initialLead.mobile || initialLead.phone || '');
      setEmail(initialLead.email || '');
      setRequirement(initialLead.requirement || '');
      setStatus('Draft');
      setTalkStatus('');
      setAmount(initialLead.estimatedValue || 0);
      setFollowUpDate(initialLead.nextFollowupDate || '');
      setRemarks(initialLead.notes || '');
      setSource(initialLead.source || initialLead.leadSource || 'Direct');
      setAssignedEmployeeId(initialLead.assignedEmployeeId || userProfile?.uid || '');
    } else {
      setSelectedEntityKey('');
      setRequirement('');
      setStatus('Draft');
      setTalkStatus('');
      setAmount(0);
      setFollowUpDate('');
      setRemarks('');
      setSource('Direct');
      setPhone('');
      setEmail('');
      setAssignedEmployeeId(userProfile?.uid || '');
    }
    setError('');
  }, [stsToEdit, initialCustomer, initialLead, isOpen, userProfile]);

  // When entity selection changes, auto-populate phone/email
  const handleEntityChange = (key: string) => {
    setSelectedEntityKey(key);
    if (key.startsWith('cust_')) {
      const cid = key.replace('cust_', '');
      const cust = customers.find((c) => c.id === cid || c.customerId === cid);
      if (cust) {
        setPhone(cust.mobile || cust.phone || '');
        setEmail(cust.email || '');
        if (cust.leadSource) setSource(cust.leadSource);
      }
    } else if (key.startsWith('lead_')) {
      const lid = key.replace('lead_', '');
      const ld = leads.find((l) => l.id === lid || l.leadId === lid);
      if (ld) {
        setPhone(ld.mobile || ld.phone || '');
        setEmail(ld.email || '');
        if (ld.source || ld.leadSource) setSource(ld.source || ld.leadSource || 'Direct');
        if (ld.requirement && !requirement) setRequirement(ld.requirement);
        if (ld.estimatedValue && !amount) setAmount(ld.estimatedValue);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedEntityKey) {
      setError('Please select a Customer or Lead *');
      return;
    }
    if (!requirement.trim()) {
      setError('Requirement specification details are required *');
      return;
    }

    setIsSubmitting(true);
    try {
      let customerId: string | undefined;
      let leadId: string | undefined;
      let companyName = '';
      let contactPerson = '';

      if (selectedEntityKey.startsWith('cust_')) {
        const id = selectedEntityKey.replace('cust_', '');
        const cust = customers.find((c) => c.id === id || c.customerId === id);
        if (cust) {
          customerId = cust.id;
          companyName = cust.companyName;
          contactPerson = cust.contactPerson;
        }
      } else if (selectedEntityKey.startsWith('lead_')) {
        const id = selectedEntityKey.replace('lead_', '');
        const ld = leads.find((l) => l.id === id || l.leadId === id);
        if (ld) {
          leadId = ld.id;
          companyName = ld.companyName;
          contactPerson = ld.contactPerson;
        }
      }

      const assignedEmp = employees.find((e) => e.uid === assignedEmployeeId);

      const payload = {
        customerId,
        leadId,
        companyName,
        contactPerson,
        customerName: companyName,
        phone: phone.trim(),
        email: email.trim(),
        source,
        assignedEmployeeId: assignedEmployeeId || userProfile?.uid,
        assignedEmployeeName: assignedEmp?.name || userProfile?.name || 'Unassigned',
        date: stsToEdit?.date || new Date().toISOString().split('T')[0],
        requirement: requirement.trim(),
        status,
        talkStatus: (talkStatus as any) || undefined,
        amount: Number(amount) || 0,
        estimatedValue: Number(amount) || 0,
        followUpDate: followUpDate || undefined,
        nextFollowUpAt: followUpDate || undefined,
        remarks: remarks.trim() || undefined,
      };

      if (stsToEdit) {
        await updateSTS(stsToEdit.id, payload);
      } else {
        await addSTS(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save STS record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8 overflow-hidden border border-slate-200">
        <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileCheck className="w-5 h-5 text-amber-200" />
            <div>
              <h3 className="font-bold text-base">
                {stsToEdit ? `Edit STS ${stsToEdit.stsNumber}` : 'Create STS (Sales Tracking Sheet)'}
              </h3>
              <p className="text-xs text-amber-100">Technical requirement, valuation, and interaction status</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-amber-200 hover:text-white rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 text-xs px-5 py-2.5 border-b border-rose-100 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer or Lead *</label>
            <select
              required
              value={selectedEntityKey}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="">— Select Linked Record —</option>
              <optgroup label="Prospect Leads">
                {leads.map((l) => (
                  <option key={`lead_${l.id}`} value={`lead_${l.id}`}>
                    [LEAD] {l.companyName} ({l.contactPerson}) — {l.leadNumber || l.leadId}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Existing Customers">
                {customers.map((c) => (
                  <option key={`cust_${c.id}`} value={`cust_${c.id}`}>
                    [CUSTOMER] {c.companyName} ({c.contactPerson}) — {c.customerId}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@domain.com"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Technical Requirement & Scope *
            </label>
            <textarea
              required
              rows={3}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="Detailed equipment requirements, specs, voltage levels, customizations..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Value (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full text-xs border border-slate-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">STS Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="New">New</option>
                <option value="Draft">Draft</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Sent to Customer">Sent to Customer</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Proposal Required">Proposal Required</option>
                <option value="Won">Won</option>
                <option value="Closed">Closed</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Talk Hui Status</label>
              <select
                value={talkStatus}
                onChange={(e) => setTalkStatus(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="">— Not Spoken Yet —</option>
                <option value="Yes">Yes (बात हुई)</option>
                <option value="No">No (बात नहीं हुई)</option>
                <option value="Callback">Callback (कॉल बैक बोला)</option>
                <option value="Not Reachable">Not Reachable (संपर्क नहीं हो पाया)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Executive</label>
              <select
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
                disabled={!isAdmin}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden disabled:bg-slate-50"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.uid} value={emp.uid}>
                    {emp.name} ({emp.department || 'Sales'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Next Follow-up Date</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks & Interaction Log</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Commercial or technical notes from recent client conversation..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden resize-none"
            />
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
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
            >
              {isSubmitting ? 'Saving...' : stsToEdit ? 'Update STS' : 'Create STS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
