import React from 'react';
import {
  AlertTriangle,
  Building,
  Phone,
  Mail,
  FileText,
  User,
  CheckCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { Customer } from '../../types/crm';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Array<{
    type: 'phone' | 'email' | 'gst';
    customer: Customer;
    detail: string;
  }>;
  onUseExistingCustomer: (customer: Customer) => void;
  onCreateAnyway: () => void;
  title?: string;
  subtitle?: string;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  onClose,
  matches,
  onUseExistingCustomer,
  onCreateAnyway,
  title = 'Possible Existing Customer Detected',
  subtitle = 'A match was found based on Phone, Email, or GST Number in your customer registry. Review before continuing.',
}) => {
  if (!isOpen || matches.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-amber-200">
        <div className="bg-linear-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-xs text-amber-100">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200 hover:text-white p-1 rounded-lg hover:bg-amber-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Matching Existing Records ({matches.length})
          </div>

          <div className="space-y-3">
            {matches.map((m, idx) => (
              <div
                key={`${m.customer.id}_${idx}`}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-full text-2xs font-extrabold uppercase bg-amber-200 text-amber-900 mb-1">
                      Matched by {m.type.toUpperCase()}
                    </span>
                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Building className="w-4 h-4 text-amber-700" />
                      {m.customer.companyName}
                      <span className="text-xs font-normal text-slate-500">({m.customer.customerId})</span>
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUseExistingCustomer(m.customer)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    Link / Use This Customer
                  </button>
                </div>

                <div className="text-xs text-amber-950 font-medium bg-amber-100/60 p-2 rounded-lg">
                  {m.detail}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.customer.contactPerson || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.customer.mobile || m.customer.phone || 'N/A'}</span>
                  </div>
                  {m.customer.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{m.customer.email}</span>
                    </div>
                  )}
                  {m.customer.gstNumber && (
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>GST: {m.customer.gstNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Review Options:</p>
            <p>• <strong>Link / Use This Customer:</strong> Connect this record to the existing customer without creating a duplicate.</p>
            <p>• <strong>Create New Separate Customer:</strong> If this is a distinct business branch, subsidiary, or separate legal entity.</p>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            Cancel / Go Back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateAnyway}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Create New (Ignore Duplicate)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
