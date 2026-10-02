import React, { useState, useEffect } from 'react';
import { X, Building2, User, Phone, Mail, MapPin, Hash, Clock, Calendar } from 'lucide-react';
import { Customer, CustomerStatus } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customerToEdit }) => {
  const { addCustomer, updateCustomer, employees, generateNextCustomerId } = useCrmData();
  const { userProfile, isAdmin, hasPermission } = useAuth();

  const [customerId, setCustomerId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [leadSource, setLeadSource] = useState('Website');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [status, setStatus] = useState<CustomerStatus>('New');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [nextFollowupTime, setNextFollowupTime] = useState('11:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customerToEdit) {
      setCustomerId(customerToEdit.customerId || '');
      setCompanyName(customerToEdit.companyName || '');
      setContactPerson(customerToEdit.contactPerson || '');
      setMobile(customerToEdit.mobile || '');
      setAlternateMobile(customerToEdit.alternateMobile || customerToEdit.alternateNumber || '');
      setEmail(customerToEdit.email || '');
      setGstNumber(customerToEdit.gstNumber || '');
      setAddress(customerToEdit.address || '');
      setCity(customerToEdit.city || '');
      setState(customerToEdit.state || '');
      setPincode(customerToEdit.pincode || '');
      setLeadSource(customerToEdit.leadSource || 'Website');
      setAssignedEmployeeId(customerToEdit.assignedEmployeeId || '');
      setStatus(customerToEdit.status || 'New');
      setNextFollowupDate(customerToEdit.nextFollowupDate || customerToEdit.nextFollowUp || '');
      setNextFollowupTime(customerToEdit.nextFollowupTime || '11:00');
      setNotes(customerToEdit.notes || '');
    } else {
      setCustomerId(generateNextCustomerId());
      setCompanyName('');
      setContactPerson('');
      setMobile('');
      setAlternateMobile('');
      setEmail('');
      setGstNumber('');
      setAddress('');
      setCity('');
      setState('');
      setPincode('');
      setLeadSource('Website');
      setAssignedEmployeeId(userProfile?.uid || '');
      setStatus('New');
      setNextFollowupDate('');
      setNextFollowupTime('11:00');
      setNotes('');
    }
    setError('');
  }, [customerToEdit, isOpen, userProfile, generateNextCustomerId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Permission enforcement
    if (customerToEdit && !isAdmin && !hasPermission('editCustomer')) {
      setError('You do not have permission to edit customer records.');
      return;
    }
    if (!customerToEdit && !isAdmin && !hasPermission('createCustomer')) {
      setError('You do not have permission to add new customer accounts.');
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
        customerId: customerId.trim() || generateNextCustomerId(),
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        mobile: mobile.trim(),
        alternateMobile: alternateMobile.trim() || undefined,
        alternateNumber: alternateMobile.trim() || undefined,
        email: email.trim() || undefined,
        gstNumber: gstNumber.trim().toUpperCase() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        leadSource,
        assignedEmployeeId: assignedEmployeeId || userProfile?.uid,
        assignedEmployeeName: assignedEmp?.name || userProfile?.name || 'Unassigned',
        status,
        nextFollowupDate: nextFollowupDate || undefined,
        nextFollowupTime: nextFollowupTime || undefined,
        nextFollowUp: nextFollowupDate || undefined,
        notes: notes.trim() || undefined,
      };

      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, payload);
      } else {
        await addCustomer(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {customerToEdit ? `Edit Customer — ${customerToEdit.customerId}` : 'Add New Customer'}
              </h3>
              <p className="text-xs text-slate-400">Capture complete account profile, tax credentials, and assignment</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer ID Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600">Customer ID:</span>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                {customerId || 'Generating...'}
              </span>
            </div>
            {isAdmin && !customerToEdit && (
              <button
                type="button"
                onClick={() => setCustomerId(generateNextCustomerId())}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Regenerate ID
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Biotech Ltd"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person *</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Mobile</label>
              <input
                type="tel"
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value)}
                placeholder="Secondary phone / landline"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.com"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GST Number</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="27AABCU9603R1ZM"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Office / Plant / Facility Address"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Maharashtra"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="400001"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Source</label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="Trade Show / Exhibition">Trade Show / Exhibition</option>
                <option value="Cold Call">Cold Call</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Converted Lead">Converted Lead</option>
                <option value="Existing Client">Existing Client</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Meeting">Meeting</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
                <option value="Inactive">Inactive</option>
                <option value="Follow-up">Follow-up</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Executive</label>
              <select
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
                disabled={!isAdmin}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden disabled:bg-slate-50"
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
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Next Follow-up Time</label>
              <input
                type="time"
                value={nextFollowupTime}
                onChange={(e) => setNextFollowupTime(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Background, specific business requirements, commercial terms discussion..."
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
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
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
            >
              {isSubmitting ? 'Saving...' : customerToEdit ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
