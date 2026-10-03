import { Customer, Lead, ProposalRecord, UserProfile } from '../types/crm';

export interface TemplateVariables {
  customerName?: string;
  companyName?: string;
  proposalNumber?: string;
  proposalDate?: string;
  proposalAmount?: string | number;
  totalAmount?: string | number;
  proposalLink?: string;
  employeeName?: string;
  contactPerson?: string;
  grandTotal?: string | number;
  validUntil?: string;
  officialEmail?: string;
  officialPhone?: string;
  employeePhone?: string;
  employeeEmail?: string;
  secureProposalLink?: string;
  [key: string]: string | number | undefined;
}

/**
 * Strips dangerous HTML, script tags, event handlers and unsafe schemes
 */
export function sanitizeEmailContent(text: string): string {
  if (!text) return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:[^"']*/gi, '');
}

/**
 * Normalizes a key name for fuzzy variable lookup
 * e.g., "Customer Name" -> "customername"
 */
function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Extracts and prepares template variables from available CRM objects
 */
export function buildTemplateVariables(
  proposal?: ProposalRecord | null,
  customer?: Customer | null,
  lead?: Lead | null,
  employee?: UserProfile | null,
  appUrl?: string,
  officialEmailConfig?: { officialEmail?: string; fromEmail?: string; phone?: string; companyName?: string } | null
): TemplateVariables {
  // Official company name
  const officialCompanyName = officialEmailConfig?.companyName || 'SparkGenTechnology';

  // Customer name
  const custName =
    customer?.contactPerson ||
    customer?.companyName ||
    lead?.contactPerson ||
    lead?.companyName ||
    proposal?.customerSnapshot?.contactPerson ||
    proposal?.customerName ||
    'Valued Client';

  const propNum = proposal?.proposalNumber || '';
  const total =
    proposal?.grandTotal !== undefined
      ? `₹${proposal.grandTotal.toLocaleString('en-IN')}`
      : proposal?.totalAmount !== undefined
      ? `₹${proposal.totalAmount.toLocaleString('en-IN')}`
      : '';

  const propDate = proposal?.proposalDate
    ? new Date(proposal.proposalDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : proposal?.createdAt
    ? new Date(proposal.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  const validUntil = proposal?.validUntil
    ? new Date(proposal.validUntil).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const officialEmail =
    officialEmailConfig?.officialEmail ||
    officialEmailConfig?.fromEmail ||
    'sales@sparkgentechnology.com';

  const officialPhone =
    officialEmailConfig?.phone || '+91 98765 43210';

  const empName =
    employee?.name || proposal?.assignedEmployeeName || proposal?.createdByName || 'Administrator';
  const empPhone = employee?.mobile || officialPhone;
  const empEmail = employee?.email || officialEmail;

  const baseUrl = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const token = proposal?.viewToken || proposal?.id || proposal?.proposalNumber;
  const proposalLink = token ? `${baseUrl}/proposal/${token}` : '';

  return {
    customerName: custName,
    companyName: officialCompanyName,
    proposalNumber: propNum,
    proposalDate: propDate,
    proposalAmount: total,
    totalAmount: total,
    proposalLink,
    employeeName: empName,
    contactPerson: custName,
    grandTotal: total,
    validUntil,
    officialEmail,
    officialPhone,
    employeePhone: empPhone,
    employeeEmail: empEmail,
    secureProposalLink: proposalLink,
  };
}

/**
 * Replaces {{variable}} or {Variable Name} placeholders with real values.
 * Never inserts "undefined" or "null".
 * Strips dangerous HTML/script injection.
 */
export function interpolateEmailTemplate(templateText: string, variables: TemplateVariables): string {
  if (!templateText) return '';

  const sanitized = sanitizeEmailContent(templateText);

  // Build normalized lookup map
  const normalizedMap = new Map<string, string | number>();
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) {
      normalizedMap.set(normalizeKey(key), value);
    }
  }

  // Matches either {{key}} or {key}
  return sanitized.replace(/\{{1,2}\s*([^}]+?)\s*\}{1,2}/g, (match, rawKey) => {
    const norm = normalizeKey(rawKey.trim());
    if (normalizedMap.has(norm)) {
      return sanitizeEmailContent(String(normalizedMap.get(norm)));
    }
    // Return original match if variable not known
    return match;
  });
}
