import { Customer, Lead, ProposalRecord, UserProfile } from '../types/crm';

export interface TemplateVariables {
  customerName?: string;
  contactPerson?: string;
  companyName?: string;
  proposalNumber?: string;
  grandTotal?: string | number;
  validUntil?: string;
  employeeName?: string;
  employeePhone?: string;
  employeeEmail?: string;
  secureProposalLink?: string;
  [key: string]: string | number | undefined;
}

/**
 * Extracts and prepares template variables from available CRM objects
 */
export function buildTemplateVariables(
  proposal?: ProposalRecord | null,
  customer?: Customer | null,
  lead?: Lead | null,
  employee?: UserProfile | null,
  appUrl?: string
): TemplateVariables {
  const compName =
    proposal?.customerName ||
    customer?.companyName ||
    lead?.companyName ||
    '';

  const contact =
    customer?.contactPerson ||
    lead?.contactPerson ||
    proposal?.customerSnapshot?.contactPerson ||
    'Valued Client';

  const custName =
    customer?.contactPerson ||
    customer?.companyName ||
    lead?.contactPerson ||
    lead?.companyName ||
    compName;

  const propNum = proposal?.proposalNumber || '';
  const total = proposal?.grandTotal !== undefined ? proposal.grandTotal.toLocaleString('en-IN') : '';
  const validUntil = proposal?.validUntil ? new Date(proposal.validUntil).toLocaleDateString('en-IN') : '';

  const empName = employee?.name || proposal?.assignedEmployeeName || proposal?.createdByName || 'SparkGenTechnology Team';
  const empPhone = employee?.mobile || '+91 98765 43210';
  const empEmail = employee?.email || 'sales@sparkgentechnology.com';

  const baseUrl = appUrl || window.location.origin;
  const token = proposal?.viewToken || proposal?.id || proposal?.proposalNumber;
  const proposalLink = token ? `${baseUrl}/proposal/${token}` : '';

  return {
    customerName: custName,
    contactPerson: contact,
    companyName: compName,
    proposalNumber: propNum,
    grandTotal: total,
    validUntil,
    employeeName: empName,
    employeePhone: empPhone,
    employeeEmail: empEmail,
    secureProposalLink: proposalLink,
  };
}

/**
 * Replaces {{variable}} placeholders with real values.
 * Never inserts "undefined" or "null".
 */
export function interpolateEmailTemplate(templateText: string, variables: TemplateVariables): string {
  if (!templateText) return '';

  return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    if (val === undefined || val === null) {
      return '';
    }
    return String(val);
  });
}
