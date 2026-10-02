import React, { useMemo } from 'react';
import {
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Calendar,
  Building2,
} from 'lucide-react';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';
import { CustomerLedgerEntry } from '../../../types/crm';
import { formatCurrency } from '../../../utils/financeUtils';

export const CustomerLedgerView: React.FC = () => {
  const { customerCompany, invoices, receipts } = useCustomerPortal();

  // Compute live customer ledger entries strictly without exposing internal notes
  const ledgerEntries: CustomerLedgerEntry[] = useMemo(() => {
    const rawEvents: Array<{
      date: string;
      type: 'Invoice' | 'Payment';
      reference: string;
      description: string;
      debit: number;
      credit: number;
    }> = [];

    // Invoices increase receivables (Debit)
    invoices
      .filter((inv) => inv.status !== 'Draft' && inv.status !== 'Cancelled')
      .forEach((inv) => {
        rawEvents.push({
          date: inv.invoiceDate,
          type: 'Invoice',
          reference: inv.invoiceNumber,
          description: `Tax Invoice ${inv.invoiceNumber} Issued`,
          debit: inv.grandTotal,
          credit: 0,
        });
      });

    // Receipts / Payments decrease receivables (Credit)
    receipts.forEach((r) => {
      rawEvents.push({
        date: r.paymentDate,
        type: 'Payment',
        reference: r.receiptNumber,
        description: `Payment for Invoice ${r.invoiceNumber} (${r.paymentMethod})`,
        debit: 0,
        credit: r.amount,
      });
    });

    // Sort chronologically ascending to calculate running balance
    rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const computed: CustomerLedgerEntry[] = rawEvents.map((evt, idx) => {
      runningBalance = runningBalance + evt.debit - evt.credit;
      return {
        id: `LEDGER-${idx}`,
        date: evt.date,
        type: evt.type,
        reference: evt.reference,
        description: evt.description,
        debit: evt.debit,
        credit: evt.credit,
        balance: Math.max(0, runningBalance),
      };
    });

    // Return descending for display
    return computed.reverse();
  }, [invoices, receipts]);

  const totalDebits = ledgerEntries.reduce((acc, e) => acc + e.debit, 0);
  const totalCredits = ledgerEntries.reduce((acc, e) => acc + e.credit, 0);
  const netBalance = Math.max(0, totalDebits - totalCredits);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-400" /> Organization Statement of Account
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Chronological running ledger of all billed invoices and verified payment settlements
        </p>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Invoiced (Debits)</span>
          <div className="text-2xl font-black text-white font-mono">{formatCurrency(totalDebits)}</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Settled (Credits)</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">{formatCurrency(totalCredits)}</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Closing Balance Due</span>
          <div className="text-2xl font-black text-amber-400 font-mono">{formatCurrency(netBalance)}</div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {ledgerEntries.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Ledger Transactions</p>
            <p className="text-[11px] text-slate-500">
              When invoices and payments are posted to your account, your chronological ledger will be displayed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Transaction</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-right">Debit (₹)</th>
                  <th className="py-3.5 px-4 text-right">Credit (₹)</th>
                  <th className="py-3.5 px-4 text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {ledgerEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 text-slate-400">{e.date}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          e.type === 'Invoice'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {e.type === 'Invoice' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        {e.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">{e.reference}</td>
                    <td className="py-3.5 px-4 text-slate-300">{e.description}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      {e.debit > 0 ? formatCurrency(e.debit) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {e.credit > 0 ? formatCurrency(e.credit) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                      {formatCurrency(e.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
