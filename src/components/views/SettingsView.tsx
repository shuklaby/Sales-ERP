import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  CreditCard,
  Image as ImageIcon,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  FileText,
  Palette,
  PenTool,
  Hash,
  Eye,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
  Phone,
  Sliders,
  ShieldAlert,
  Clock,
  History,
  Lock,
  Mail,
  Key,
  Server,
  RefreshCw,
  Send,
  CheckSquare,
  Copy,
  Boxes,
} from 'lucide-react';
import { useCrmData, maskAccountNumber } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  CompanySettings,
  BankAccount,
  BrandingSettings,
  ProposalTemplateSettings,
  SignatorySettings,
  TermItem,
  ProposalNumberingSettings,
  EmailTemplate,
  EmailSettings,
  EmailTemplateType,
} from '../../types/crm';
import { ProposalTemplatePreviewModal } from '../modals/ProposalTemplatePreviewModal';
import { PaymentGatewaySettingsView } from '../settings/PaymentGatewaySettingsView';

export type SettingsTab =
  | 'company'
  | 'branding'
  | 'bank'
  | 'proposals'
  | 'terms'
  | 'signature'
  | 'proposal-template'
  | 'email'
  | 'email-templates'
  | 'contact'
  | 'preferences'
  | 'permissions'
  | 'audit'
  | 'payment'
  | 'products';

interface SettingsViewProps {
  initialTab?: SettingsTab;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab }) => {
  const {
    companySettings,
    bankSettings,
    bankAccounts,
    brandingSettings,
    proposalTemplateSettings,
    signatorySettings,
    termsList,
    proposalNumberingSettings,
    activities,
    updateCompanySettings,
    updateBankSettings,
    addBankAccount,
    updateBankAccount,
    setDefaultBankAccount,
    toggleBankAccountStatus,
    deleteBankAccount,
    uploadCompanyLogo,
    removeCompanyLogo,
    updateBrandingSettings,
    updateProposalTemplateSettings,
    updateSignatorySettings,
    uploadSignatorySignature,
    removeSignatorySignature,
    addTerm,
    updateTerm,
    deleteTerm,
    reorderTerms,
    updateProposalNumberingSettings,
    emailTemplates,
    emailSettings,
    updateEmailSettings,
    saveEmailTemplate,
    deleteEmailTemplate,
    testEmailConnection,
    productSettings,
    updateProductSettings,
  } = useCrmData();

  const { isAdmin, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'company');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Email Provider Settings State (Section 5)
  const [emailProvider, setEmailProvider] = useState<'smtp' | 'resend' | 'sendgrid' | 'none'>('smtp');
  const [emailSenderName, setEmailSenderName] = useState('SparkGenTechnology');
  const [emailSenderAddress, setEmailSenderAddress] = useState('sales@sparkgentechnology.in');
  const [emailReplyTo, setEmailReplyTo] = useState('sales@sparkgentechnology.in');
  const [smtpHost, setSmtpHost] = useState('smtp.titan.email');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpUser, setSmtpUser] = useState('sales@sparkgentechnology.in');
  const [smtpPass, setSmtpPass] = useState('');
  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [providerApiKey, setProviderApiKey] = useState('');
  const [isEmailConfigured, setIsEmailConfigured] = useState(false);
  const [emailConfigStatus, setEmailConfigStatus] = useState<'Configured' | 'Not Configured' | 'Connection Error' | 'Authentication Failed'>('Not Configured');
  const [emailSaveSuccess, setEmailSaveSuccess] = useState<string | null>(null);
  const [emailSaveError, setEmailSaveError] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email Templates State (Section 3)
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [tplTypeFilter, setTplTypeFilter] = useState<'ALL' | EmailTemplateType>('ALL');
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateTypeInput, setTemplateTypeInput] = useState<EmailTemplateType>('Proposal Email');
  const [templateSubjectInput, setTemplateSubjectInput] = useState('');
  const [templateBodyInput, setTemplateBodyInput] = useState('');
  const [templateStatusInput, setTemplateStatusInput] = useState<'active' | 'inactive'>('active');

  // Notification Preferences State (Section 23)
  const [notifProposalViewed, setNotifProposalViewed] = useState(true);
  const [notifProposalAccepted, setNotifProposalAccepted] = useState(true);
  const [notifProposalRejected, setNotifProposalRejected] = useState(true);
  const [notifEmailFailed, setNotifEmailFailed] = useState(true);
  const [notifFollowupDue, setNotifFollowupDue] = useState(true);

  // 1. Company Form State
  const [companyName, setCompanyName] = useState('SparkGenTechnology');
  const [legalName, setLegalName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('India');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // 2. Branding & Colors State
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#0f172a');
  const [secondaryColor, setSecondaryColor] = useState('#4f46e5');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [showLogo, setShowLogo] = useState(true);
  const [showCompanyAddress, setShowCompanyAddress] = useState(true);
  const [showGST, setShowGST] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [showWebsite, setShowWebsite] = useState(true);

  // 3. Bank Account Form State (Modal)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankNameInput, setBankNameInput] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankUpiId, setBankUpiId] = useState('');
  const [bankIsDefault, setBankIsDefault] = useState(false);

  // 4. Proposal Settings Form State
  const [proposalPrefix, setProposalPrefix] = useState('PROP');
  const [defaultValidityDays, setDefaultValidityDays] = useState(30);
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [proposalFooterText, setProposalFooterText] = useState('');
  const [defaultTermsText, setDefaultTermsText] = useState('');
  const [propShowBankDetails, setPropShowBankDetails] = useState(true);
  const [propShowSignatureArea, setPropShowSignatureArea] = useState(true);
  const [propShowTerms, setPropShowTerms] = useState(true);
  const [propShowGST, setPropShowGST] = useState(true);
  const [propShowCompanyLogo, setPropShowCompanyLogo] = useState(true);

  // Numbering settings
  const [numPrefix, setNumPrefix] = useState('PROP');
  const [numYearFormat, setNumYearFormat] = useState<'YYYY' | 'YY' | 'NONE' | 'None'>('YYYY');
  const [numSequenceDigits, setNumSequenceDigits] = useState(4);

  // 5. Terms Form State
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [termTitle, setTermTitle] = useState('');
  const [termContent, setTermContent] = useState('');

  // 6. Signatory Form State
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryDesignation, setSignatoryDesignation] = useState('');
  const [showSignature, setShowSignature] = useState(true);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);

  // 7. Proposal Template Settings State
  const [headerStyle, setHeaderStyle] = useState<'classic' | 'modern' | 'minimal' | 'bold' | 'executive'>('classic');
  const [logoPosition, setLogoPosition] = useState<'left' | 'center' | 'right'>('left');
  const [tableStyle, setTableStyle] = useState<'striped' | 'clean' | 'bordered'>('striped');
  const [tmplShowCompanyDetails, setTmplShowCompanyDetails] = useState(true);
  const [tmplShowBankSection, setTmplShowBankSection] = useState(true);
  const [tmplShowGST, setTmplShowGST] = useState(true);
  const [tmplShowTerms, setTmplShowTerms] = useState(true);
  const [tmplShowSignature, setTmplShowSignature] = useState(true);
  const [tmplFooterText, setTmplFooterText] = useState('');
  const [tmplPrimaryColor, setTmplPrimaryColor] = useState('#0f172a');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Sync route and tabs: e.g., /admin/settings/company, /admin/settings/branding, etc.
  useEffect(() => {
    const syncFromUrl = () => {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      const sub = segments[2]; // /admin/settings/[sub]
      if (sub === 'company') setActiveTab('company');
      else if (sub === 'branding') setActiveTab('branding');
      else if (sub === 'bank') setActiveTab('bank');
      else if (sub === 'proposals' || sub === 'proposal') setActiveTab('proposals');
      else if (sub === 'terms') setActiveTab('terms');
      else if (sub === 'signature') setActiveTab('signature');
      else if (sub === 'proposal-template' || sub === 'template') setActiveTab('proposal-template');
      else if (sub === 'email') setActiveTab('email');
      else if (sub === 'email-templates' || sub === 'email-template' || sub === 'templates') setActiveTab('email-templates');
      else if (sub === 'contact') setActiveTab('contact');
      else if (sub === 'preferences') setActiveTab('preferences');
      else if (sub === 'permissions') setActiveTab('permissions');
      else if (sub === 'audit') setActiveTab('audit');
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  // Fetch safe server-side email configuration status
  useEffect(() => {
    fetch('/api/email/config')
      .then(async (r) => {
        const contentType = r.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            return await r.json();
          } catch {
            return null;
          }
        }
        return null;
      })
      .then((cfg) => {
        if (cfg) {
          setEmailProvider(cfg.provider || 'smtp');
          setEmailSenderName(cfg.senderName || 'SparkGenTechnology');
          setEmailSenderAddress(cfg.senderEmail || 'sales@sparkgentechnology.in');
          setEmailReplyTo(cfg.replyTo || 'sales@sparkgentechnology.in');
          setIsEmailConfigured(!!cfg.configured);
          setEmailConfigStatus(cfg.status || (cfg.configured ? 'Configured' : 'Not Configured'));
          if (cfg.smtpHost) setSmtpHost(cfg.smtpHost);
          if (cfg.smtpPort) setSmtpPort(cfg.smtpPort);
          if (cfg.smtpUser) setSmtpUser(cfg.smtpUser);
          if (cfg.smtpSecure !== undefined) {
            setSmtpSecure(!!cfg.smtpSecure);
          } else if (cfg.smtpPort === 465) {
            setSmtpSecure(true);
          }
          if (cfg.hasPassword) {
            setHasExistingPassword(true);
          }
          if (cfg.status === 'Authentication Failed' && cfg.lastError) {
            setConnectionTestResult({ success: false, message: cfg.lastError });
          } else if (cfg.status === 'Configured') {
            setConnectionTestResult({ success: true, message: 'SMTP connection verified successfully.' });
          }
        }
      })
      .catch((e) => console.warn('Could not fetch email config:', e));
  }, []);

  // Populate state from CrmDataContext
  useEffect(() => {
    if (companySettings) {
      setCompanyName(companySettings.companyName || 'SparkGenTechnology');
      setLegalName(companySettings.legalName || '');
      setTagline(companySettings.tagline || '');
      setAddress(companySettings.address || '');
      setCity(companySettings.city || '');
      setState(companySettings.state || '');
      setPincode(companySettings.pincode || '');
      setCountry(companySettings.country || 'India');
      setPhone(companySettings.phone || '');
      setAlternatePhone(companySettings.alternatePhone || '');
      setEmail(companySettings.email || '');
      setWebsite(companySettings.website || '');
      setGstNumber(companySettings.gstNumber || '');
      setPanNumber(companySettings.panNumber || companySettings.pan || '');
      setProposalPrefix(companySettings.proposalPrefix || 'PROP');
      setDefaultValidityDays(companySettings.proposalValidityDays || 30);
      setDefaultTermsText(companySettings.termsAndConditions || '');
      setProposalFooterText(companySettings.footerText || '');
      setLogoUrl(companySettings.logoUrl || '');
    }

    if (brandingSettings) {
      if (brandingSettings.primaryColor) setPrimaryColor(brandingSettings.primaryColor);
      if (brandingSettings.secondaryColor) setSecondaryColor(brandingSettings.secondaryColor);
      if (brandingSettings.accentColor) setAccentColor(brandingSettings.accentColor);
      if (brandingSettings.logoUrl) setLogoUrl(brandingSettings.logoUrl);
      setShowLogo(brandingSettings.showLogo !== false);
      setShowCompanyAddress(brandingSettings.showCompanyAddress !== false);
      setShowGST(brandingSettings.showGST !== false);
      setShowPhone(brandingSettings.showPhone !== false);
      setShowEmail(brandingSettings.showEmail !== false);
      setShowWebsite(brandingSettings.showWebsite !== false);
    }

    if (proposalTemplateSettings) {
      setHeaderStyle(proposalTemplateSettings.headerStyle || 'classic');
      setLogoPosition(proposalTemplateSettings.logoPosition || 'left');
      setTableStyle(proposalTemplateSettings.tableStyle || 'striped');
      setTmplShowCompanyDetails(proposalTemplateSettings.showCompanyDetails !== false);
      setTmplShowBankSection(proposalTemplateSettings.showBankSection !== false);
      setTmplShowGST(proposalTemplateSettings.showGST !== false);
      setTmplShowTerms(proposalTemplateSettings.showTerms !== false);
      setTmplShowSignature(proposalTemplateSettings.showSignature !== false);
      setTmplFooterText(proposalTemplateSettings.footerText || '');
      setTmplPrimaryColor(proposalTemplateSettings.primaryColor || '#0f172a');
    }

    if (signatorySettings) {
      setSignatoryName(signatorySettings.signatoryName || '');
      setSignatoryDesignation(signatorySettings.designation || '');
      setShowSignature(signatorySettings.showSignature !== false);
    }

    if (proposalNumberingSettings) {
      setNumPrefix(proposalNumberingSettings.prefix || 'PROP');
      setNumYearFormat(proposalNumberingSettings.yearFormat || 'YYYY');
      setNumSequenceDigits(proposalNumberingSettings.sequenceDigits || 4);
    }
  }, [companySettings, brandingSettings, proposalTemplateSettings, signatorySettings, proposalNumberingSettings]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setErrorMsg('');
    setSaveSuccess(null);
    const basePath = isAdmin ? '/admin/settings' : '/employee/settings';
    const targetUrl = tab === 'company' ? `${basePath}/company` : `${basePath}/${tab}`;
    window.history.pushState(null, '', targetUrl);
  };

  const notifySuccess = (message: string) => {
    setSaveSuccess(message);
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  // ==================== SECTION 19: SECURITY ACCESS DENIED ====================
  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-12 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl border border-rose-200 shadow-xl overflow-hidden text-center p-8 lg:p-12 space-y-5">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full border border-rose-200 uppercase tracking-wider inline-block">
              Security Notice (Section 19)
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Denied</h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Super Administrator privileges are strictly required to access Enterprise Settings.
              Only authorized Administrators may modify corporate identity, bank accounts, proposal numbering, branding, or template rules.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                window.history.pushState(null, '', '/employee');
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              Return to Operational Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 1. SAVE COMPANY PROFILE ====================
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');

    // Validations
    if (!companyName.trim()) {
      setErrorMsg('Company display name is required.');
      setIsSaving(false);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid corporate email address.');
      setIsSaving(false);
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please provide a valid contact phone number (at least 10 digits).');
      setIsSaving(false);
      return;
    }
    if (gstNumber.trim() && gstNumber.trim().length !== 15) {
      setErrorMsg('GSTIN format invalid: GST number should be exactly 15 alphanumeric characters.');
      setIsSaving(false);
      return;
    }
    if (pincode.trim() && pincode.replace(/\D/g, '').length !== 6) {
      setErrorMsg('Postal pincode should be exactly 6 digits.');
      setIsSaving(false);
      return;
    }

    try {
      await updateCompanySettings({
        companyName: companyName.trim(),
        legalName: legalName.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: country.trim() || 'India',
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim(),
        email: email.trim().toLowerCase(),
        website: website.trim(),
        gstNumber: gstNumber.trim().toUpperCase(),
        panNumber: panNumber.trim().toUpperCase(),
        pan: panNumber.trim().toUpperCase(),
      });
      notifySuccess('Company Profile successfully updated and version incremented!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update company profile');
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== 2. SAVE BRANDING ====================
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Supported formats: PNG, JPG/JPEG, WEBP
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Invalid format! Only PNG, JPG/JPEG, and WEBP emblems are supported.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('File too large: Logo must not exceed 2MB in size.');
      return;
    }

    setIsUploadingLogo(true);
    setErrorMsg('');
    try {
      const url = await uploadCompanyLogo(file);
      setLogoUrl(url);
      notifySuccess('New active company logo uploaded and updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Logo upload failed');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (confirm('Are you sure you want to remove the active company logo? Existing historical proposals will retain their archived snapshots.')) {
      try {
        await removeCompanyLogo();
        setLogoUrl('');
        notifySuccess('Company logo removed from active profile.');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to remove logo');
      }
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    try {
      await updateBrandingSettings({
        primaryColor,
        secondaryColor,
        accentColor,
        showLogo,
        showCompanyAddress,
        showGST,
        showPhone,
        showEmail,
        showWebsite,
      });
      // Also sync primary proposal color
      await updateProposalTemplateSettings({ primaryColor });
      notifySuccess('Brand visual identity and proposal header display settings saved!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save branding');
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== 3. MULTIPLE BANK ACCOUNTS ====================
  const handleOpenBankModal = (account?: BankAccount) => {
    if (account) {
      setEditingBankId(account.id);
      setBankAccountHolder(account.accountHolderName);
      setBankNameInput(account.bankName);
      setBankAccountNumber(account.accountNumber);
      setBankIfscCode(account.ifscCode);
      setBankBranch(account.branch || '');
      setBankUpiId(account.upiId || '');
      setBankIsDefault(account.isDefault);
    } else {
      setEditingBankId(null);
      setBankAccountHolder(companySettings.legalName || companySettings.companyName);
      setBankNameInput('');
      setBankAccountNumber('');
      setBankIfscCode('');
      setBankBranch('');
      setBankUpiId('');
      setBankIsDefault(bankAccounts.length === 0);
    }
    setIsBankModalOpen(true);
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccountHolder.trim() || !bankNameInput.trim() || !bankAccountNumber.trim() || !bankIfscCode.trim()) {
      setErrorMsg('Please fill in all mandatory bank account fields.');
      return;
    }

    if (bankAccountNumber.trim().length < 9) {
      setErrorMsg('Bank account number must be at least 9 digits.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      if (editingBankId) {
        await updateBankAccount(editingBankId, {
          accountHolderName: bankAccountHolder.trim(),
          bankName: bankNameInput.trim(),
          accountNumber: bankAccountNumber.trim(),
          ifscCode: bankIfscCode.trim().toUpperCase(),
          branch: bankBranch.trim(),
          upiId: bankUpiId.trim(),
          isDefault: bankIsDefault,
        });
        notifySuccess('Bank account details successfully updated!');
      } else {
        await addBankAccount({
          accountHolderName: bankAccountHolder.trim(),
          bankName: bankNameInput.trim(),
          accountNumber: bankAccountNumber.trim(),
          ifscCode: bankIfscCode.trim().toUpperCase(),
          branch: bankBranch.trim(),
          upiId: bankUpiId.trim(),
          isDefault: bankIsDefault,
          status: 'active',
        });
        notifySuccess('New bank account successfully added to proposal registry!');
      }
      setIsBankModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save bank account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBank = async (id: string, bankName: string) => {
    if (confirm(`Are you sure you want to delete bank account "${bankName}"?`)) {
      try {
        await deleteBankAccount(id);
        notifySuccess('Bank account removed.');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to delete bank account');
      }
    }
  };

  // ==================== 4. PROPOSAL SETTINGS & NUMBERING ====================
  const handleSaveProposalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    try {
      const cleanPrefix = proposalPrefix.trim().toUpperCase() || 'PROP';
      await updateCompanySettings({
        proposalPrefix: cleanPrefix,
        proposalValidityDays: Number(defaultValidityDays) || 30,
        footerText: proposalFooterText.trim(),
        termsAndConditions: defaultTermsText.trim(),
      });

      await updateProposalTemplateSettings({
        footerText: proposalFooterText.trim(),
        showBankSection: propShowBankDetails,
        showSignature: propShowSignatureArea,
        showTerms: propShowTerms,
        showGST: propShowGST,
      });

      await updateProposalNumberingSettings({
        prefix: cleanPrefix,
        yearFormat: numYearFormat,
        sequenceDigits: Number(numSequenceDigits) || 4,
      });

      notifySuccess('Proposal engine and sequential numbering rules updated!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save proposal configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Live preview calculation of numbering
  const currentYear = new Date().getFullYear();
  const yearSnippet =
    numYearFormat === 'YYYY' ? `-${currentYear}` : numYearFormat === 'YY' ? `-${String(currentYear).slice(-2)}` : '';
  const numberingPreview = `${numPrefix || 'PROP'}${yearSnippet}-${'1'.padStart(numSequenceDigits || 4, '0')}`;

  // ==================== 5. TERMS & CONDITIONS ====================
  const handleOpenTermModal = (term?: TermItem) => {
    if (term) {
      setEditingTermId(term.id);
      setTermTitle(term.title);
      setTermContent(term.content);
    } else {
      setEditingTermId(null);
      setTermTitle('');
      setTermContent('');
    }
    setIsTermModalOpen(true);
  };

  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termTitle.trim() || !termContent.trim()) {
      setErrorMsg('Please specify both term heading and description.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingTermId) {
        await updateTerm(editingTermId, {
          title: termTitle.trim(),
          content: termContent.trim(),
        });
        notifySuccess('Proposal term updated.');
      } else {
        await addTerm({
          title: termTitle.trim(),
          content: termContent.trim(),
          isActive: true,
        });
        notifySuccess('New proposal term added.');
      }
      setIsTermModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save term');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveTerm = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= termsList.length) return;

    const newList = [...termsList];
    const temp = newList[index];
    newList[index] = newList[targetIdx];
    newList[targetIdx] = temp;

    await reorderTerms(newList.map((t) => t.id));
    notifySuccess('Commercial terms reordered.');
  };

  // ==================== 6. AUTHORIZED SIGNATORY ====================
  const handleSaveSignatory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    try {
      await updateSignatorySettings({
        signatoryName: signatoryName.trim(),
        designation: signatoryDesignation.trim(),
        showSignature,
      });
      notifySuccess('Authorized signatory details updated!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save signatory details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Invalid signature format: Only PNG, JPG, and WEBP are supported.');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setErrorMsg('File too large: Signature image must not exceed 1MB.');
      return;
    }

    setIsUploadingSignature(true);
    setErrorMsg('');
    try {
      await uploadSignatorySignature(file);
      notifySuccess('Authorized signature emblem successfully uploaded!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload signature');
    } finally {
      setIsUploadingSignature(false);
    }
  };

  const handleRemoveSignature = async () => {
    if (confirm('Are you sure you want to remove the signature image? Proposals will show a clean "Authorized Signatory" line.')) {
      try {
        await removeSignatorySignature();
        notifySuccess('Signature image removed.');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to remove signature');
      }
    }
  };

  // ==================== 7. PROPOSAL TEMPLATE SETTINGS ====================
  const handleSaveTemplateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    try {
      await updateProposalTemplateSettings({
        headerStyle,
        logoPosition,
        tableStyle,
        showCompanyDetails: tmplShowCompanyDetails,
        showBankSection: tmplShowBankSection,
        showGST: tmplShowGST,
        showTerms: tmplShowTerms,
        showSignature: tmplShowSignature,
        footerText: tmplFooterText.trim(),
        primaryColor: tmplPrimaryColor,
      });
      await updateBrandingSettings({ primaryColor: tmplPrimaryColor });
      notifySuccess('Proposal template presentation settings saved!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save proposal template');
    } finally {
      setIsSaving(false);
    }
  };

  // Find active default bank account
  const defaultBankAcc = bankAccounts.find((b) => b.isDefault && b.status === 'active') || bankAccounts[0];

  // Settings Audit Activities Filter
  const settingsActivities = activities.filter(
    (a) =>
      a.type === 'COMPANY_SETTINGS_UPDATED' ||
      a.type === 'LOGO_UPDATED' ||
      a.type === 'BANK_ACCOUNT_CREATED' ||
      a.type === 'BANK_ACCOUNT_UPDATED' ||
      a.type === 'BANK_ACCOUNT_DEACTIVATED' ||
      a.type === 'PROPOSAL_SETTINGS_UPDATED' ||
      a.type === 'TERMS_UPDATED' ||
      a.type === 'SIGNATURE_UPDATED' ||
      a.type === 'TEMPLATE_UPDATED'
  );

  // ==================== 8. EMAIL PROVIDER CONFIGURATION ====================
  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      const authErr = 'Failed to save email provider configuration: Administrator privileges are strictly required.';
      setEmailSaveError(authErr);
      setErrorMsg(authErr);
      return;
    }

    setIsSaving(true);
    setEmailSaveSuccess(null);
    setEmailSaveError(null);
    setErrorMsg('');

    try {
      if (emailProvider === 'smtp') {
        if (!smtpHost.trim()) {
          throw new Error('SMTP Host Server is required.');
        }
        if (!smtpUser.trim()) {
          throw new Error('SMTP Username / Account Email is required.');
        }
        if (!smtpPass && !hasExistingPassword) {
          throw new Error('SMTP Password is required for initial configuration.');
        }
      }

      const payload: any = {
        provider: emailProvider,
        senderName: emailSenderName.trim() || 'SparkGenTechnology',
        senderEmail: emailSenderAddress.trim() || 'sales@sparkgentechnology.in',
        replyTo: emailReplyTo.trim() || 'sales@sparkgentechnology.in',
      };
      if (emailProvider === 'smtp') {
        payload.smtpHost = smtpHost.trim();
        payload.smtpPort = Number(smtpPort) || 465;
        payload.smtpSecure = Number(smtpPort) === 465 ? true : !!smtpSecure;
        payload.smtpUser = smtpUser.trim();
        if (smtpPass && smtpPass.trim()) {
          payload.smtpPass = smtpPass.trim();
        }
      } else if (emailProvider === 'resend' || emailProvider === 'sendgrid') {
        if (providerApiKey && providerApiKey.trim()) {
          payload.apiKey = providerApiKey.trim();
        }
      }

      const res = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (!res.ok || !data) {
        const textSnippet = !data ? await res.text().catch(() => '') : '';
        const cleanSnippet = textSnippet.slice(0, 120).replace(/<[^>]*>?/gm, '').trim();
        throw new Error(
          data?.error ||
          data?.message ||
          `API endpoint /api/email/config returned HTTP ${res.status} (${res.statusText || 'Error'})${cleanSnippet ? `: ${cleanSnippet}` : ''}`
        );
      }

      if (!data.success) {
        throw new Error(data.error || data.message || 'Server rejected email provider configuration');
      }

      // Sync non-secret configuration to Firestore and CRM context (passwords are NEVER written to Firestore)
      await updateEmailSettings({
        provider: emailProvider,
        senderName: emailSenderName.trim() || 'SparkGenTechnology',
        senderEmail: emailSenderAddress.trim() || 'sales@sparkgentechnology.in',
        replyTo: emailReplyTo.trim() || 'sales@sparkgentechnology.in',
        status: data.status || (data.configured ? 'Configured' : 'Not Configured'),
      });

      setIsEmailConfigured(!!data.configured);
      setEmailConfigStatus(data.status || 'Configured');
      if (data.hasPassword || payload.smtpPass) {
        setHasExistingPassword(true);
      }
      setSmtpPass(''); // Never keep plaintext password in state

      if (data.warning) {
        setConnectionTestResult({
          success: false,
          message: data.warning,
        });
      } else if (data.status === 'Configured') {
        setConnectionTestResult({
          success: true,
          message: 'SMTP connection verified successfully.',
        });
      }

      const successNotice = 'Email provider configuration saved successfully.';
      setEmailSaveSuccess(successNotice);
      notifySuccess(successNotice);
      setTimeout(() => setEmailSaveSuccess(null), 6000);
    } catch (err: any) {
      console.error('Email config save failure:', err);
      const usefulError = `Failed to save email provider configuration: ${err.message || 'Unknown error'}`;
      setEmailSaveError(usefulError);
      setErrorMsg(usefulError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await testEmailConnection();
      if (res.success) {
        setConnectionTestResult({ success: true, message: res.message || 'Connection verified successfully!' });
        setEmailConfigStatus('Configured');
      } else {
        const isAuth = res.error?.includes('Authentication Failed') || res.error?.includes('535');
        setConnectionTestResult({ success: false, message: res.error || 'Connection failed' });
        setEmailConfigStatus(isAuth ? 'Authentication Failed' : 'Connection Error');
      }
    } catch (err: any) {
      setConnectionTestResult({ success: false, message: err.message || 'Network error' });
      setEmailConfigStatus('Connection Error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      setErrorMsg('Please specify a valid test recipient email address.');
      return;
    }
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmailRecipient.trim(),
          subject: 'SparkGenTechnology Test Email Verification',
          body: `Hello,\n\nThis is a test email sent from SparkGenTechnology CRM.\n\nProvider: ${emailProvider}\nSender: ${emailSenderName} <${emailSenderAddress}>\nDispatched At: ${new Date().toISOString()}\n\nIf you received this message, your secure email transmission pipeline is completely operational.`,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (!res.ok || !data) {
        const textSnippet = !data ? await res.text().catch(() => '') : '';
        const cleanSnippet = textSnippet.slice(0, 100).replace(/<[^>]*>?/gm, '').trim();
        throw new Error(
          data?.error ||
          data?.message ||
          `API endpoint /api/email/send returned HTTP ${res.status}${cleanSnippet ? `: ${cleanSnippet}` : ''}`
        );
      }

      if (data.success) {
        setTestEmailResult({
          success: true,
          message: 'Test email sent successfully.',
        });
      } else {
        setTestEmailResult({
          success: false,
          message: data.error || 'Test email dispatch failed.',
        });
      }
    } catch (sendErr: any) {
      setTestEmailResult({
        success: false,
        message: sendErr.message || 'Test email dispatch failed due to network error.',
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // ==================== 9. EMAIL TEMPLATES MANAGEMENT ====================
  const handleOpenTemplateModal = (tpl?: EmailTemplate) => {
    if (tpl) {
      setEditingTemplate(tpl);
      setTemplateNameInput(tpl.templateName);
      setTemplateTypeInput(tpl.type);
      setTemplateSubjectInput(tpl.subject);
      setTemplateBodyInput(tpl.body);
      setTemplateStatusInput(tpl.status);
    } else {
      setEditingTemplate(null);
      setTemplateNameInput('');
      setTemplateTypeInput('Proposal Email');
      setTemplateSubjectInput('Proposal {{proposalNumber}} from SparkGenTechnology');
      setTemplateBodyInput(
        'Hello {{contactPerson}},\n\nPlease find attached our commercial proposal {{proposalNumber}} for {{companyName}}.\n\nProposal Amount: ₹{{grandTotal}}\nValid Until: {{validUntil}}\nProposal Link:\n{{secureProposalLink}}\n\nPlease feel free to contact us if you have any questions.\n\nRegards,\n{{employeeName}}\nSparkGenTechnology'
      );
      setTemplateStatusInput('active');
    }
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateNameInput.trim()) {
      setErrorMsg('Template name is required.');
      return;
    }
    if (!templateSubjectInput.trim()) {
      setErrorMsg('Template subject is required.');
      return;
    }
    if (!templateBodyInput.trim()) {
      setErrorMsg('Template body message is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      await saveEmailTemplate({
        id: editingTemplate?.id,
        templateId: editingTemplate?.templateId || `TPL-${Date.now().toString().slice(-4)}`,
        templateName: templateNameInput.trim(),
        type: templateTypeInput,
        subject: templateSubjectInput.trim(),
        body: templateBodyInput.trim(),
        status: templateStatusInput,
      });
      setIsTemplateModalOpen(false);
      notifySuccess('Email template saved successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save email template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete template "${name}"?`)) {
      try {
        await deleteEmailTemplate(id);
        notifySuccess('Email template removed.');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to delete email template');
      }
    }
  };

  const handleInsertVariable = (varName: string) => {
    setTemplateBodyInput((prev) => `${prev} ${varName}`);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-600" />
              Admin Settings Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              v{companySettings.settingsVersion || 1}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise corporate profile, proposal templates, multi-bank management, and branding (SparkGenTechnology)
          </p>
        </div>

        {/* Global Quick Action: Preview Template */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Eye className="w-4 h-4" /> Preview Proposal Template
          </button>
        </div>
      </div>

      {/* Snapshot Architecture Banner (Section 3, 17) */}
      <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-start gap-3 text-xs text-indigo-950">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">Enterprise Snapshot Invariant Guaranteed</span>
          Settings updated here will immediately govern newly created proposals. Historical finalized proposals remain completely intact, retaining their immutable snapshot of company profile, logo, bank account, commercial terms, and signatory details.
        </div>
      </div>

      {/* Error & Success Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-800 font-semibold animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Navigation Tabs (Sections 1-11) */}
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl border shadow-2xs gap-1.5 flex-wrap overflow-x-auto">
        <button
          onClick={() => handleTabChange('company')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'company' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" /> 1. Company Profile
        </button>

        <button
          onClick={() => handleTabChange('branding')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'branding' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Palette className="w-4 h-4" /> 2. Branding & Colors
        </button>

        <button
          onClick={() => handleTabChange('bank')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'bank' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" /> 3. Bank Details ({bankAccounts.length})
        </button>

        <button
          onClick={() => handleTabChange('proposals')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'proposals' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Hash className="w-4 h-4" /> 4. Proposal Settings
        </button>

        <button
          onClick={() => handleTabChange('terms')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'terms' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" /> 5. Terms & Conditions
        </button>

        <button
          onClick={() => handleTabChange('signature')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'signature' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PenTool className="w-4 h-4" /> 6. Signatory
        </button>

        <button
          onClick={() => handleTabChange('proposal-template')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'proposal-template' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" /> 7. Proposal Template
        </button>

        <button
          onClick={() => handleTabChange('email')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'email' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-4 h-4" /> 8. Email Provider
        </button>

        <button
          onClick={() => handleTabChange('email-templates')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'email-templates' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" /> 9. Email Templates ({emailTemplates.length})
        </button>

        <button
          onClick={() => handleTabChange('contact')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'contact' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Phone className="w-4 h-4" /> 10. Contact Info
        </button>

        <button
          onClick={() => handleTabChange('preferences')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'preferences' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" /> 11. Preferences
        </button>

        <button
          onClick={() => handleTabChange('permissions')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'permissions' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4" /> 12. Permissions
        </button>

        <button
          onClick={() => handleTabChange('audit')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'audit' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" /> 13. Audit Log ({settingsActivities.length})
        </button>

        <button
          onClick={() => handleTabChange('payment')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'payment' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" /> 14. Payment Gateway
        </button>

        <button
          onClick={() => handleTabChange('products')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'products' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" /> 15. Product & Stock
        </button>
      </div>

      {/* =========================================================================
          TAB 1: COMPANY PROFILE (Section 2, 3)
         ========================================================================= */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Corporate Entity Profile</h2>
              <p className="text-xs text-slate-500">
                Official company details embedded into the header of newly generated commercial proposals
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-mono">
                Active Snapshot: v{companySettings.settingsVersion || 1}
              </span>
              <span className="text-[10px] text-slate-500">
                Updated: {companySettings.updatedAt ? new Date(companySettings.updatedAt).toLocaleDateString() : 'Initial'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Display Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="SparkGenTechnology"
                  className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Registered Entity Name</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="SparkGenTechnology Private Limited"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Tagline / Motto</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Innovating Enterprise IT & Network Infrastructure"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Registered Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="SparkGen Technology Innovation Park, Phase 2, Electronic City"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bengaluru"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Karnataka"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode (6 Digits)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="560100"
                  className="w-full text-sm font-mono border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="India"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Corporate Phone *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-sm font-mono border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate / Helpline Phone</label>
                <input
                  type="text"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  placeholder="+91 80 4123 4567"
                  className="w-full text-sm font-mono border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sales@sparkgentechnology.com"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Website URL</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://sparkgentechnology.com"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="29AAECS1234F1Z8"
                  className="w-full text-sm font-mono uppercase border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="AAECS1234F"
                  className="w-full text-sm font-mono uppercase border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                {isSaving ? 'Updating Profile...' : 'Save Corporate Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 2: BRANDING & COLORS (Section 4, 5, 6)
         ========================================================================= */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Brand Identity, Logo & Color Palette</h2>
            <p className="text-xs text-slate-500">
              Configure corporate logo and brand styling applied to customer-facing proposals
            </p>
          </div>

          {/* Logo Management (Section 4) */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Corporate Proposal Emblem</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-44 h-32 bg-white rounded-2xl border border-slate-300 flex items-center justify-center p-3 shadow-inner overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Active Emblem" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                    <span className="text-[10px] block mt-1">No Active Logo</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <input
                  type="file"
                  id="brandingLogoInput"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="brandingLogoInput"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {isUploadingLogo ? 'Uploading to Storage...' : 'Upload / Replace Logo'}
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Supported formats: PNG, JPG/JPEG, WEBP (Max 2MB). Stored in Firebase Storage with automatic historical snapshot versioning.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-6">
            {/* Color Palette (Section 5) */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Proposal Color System</h3>
              <p className="text-xs text-slate-500">
                Primary and secondary accents used on generated proposal headers, dynamic pricing tables, and totals
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Primary Color (Header / Totals)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="text-xs font-mono uppercase border border-slate-300 rounded-lg px-2.5 py-1.5 w-28"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Secondary Accent</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="text-xs font-mono uppercase border border-slate-300 rounded-lg px-2.5 py-1.5 w-28"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Highlight / Accent</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="text-xs font-mono uppercase border border-slate-300 rounded-lg px-2.5 py-1.5 w-28"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Header Display Visibility Settings (Section 6) */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Proposal Header Display Flags</h3>
              <p className="text-xs text-slate-500">
                Control which corporate credentials appear in the header banner of proposals
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Company Logo</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={showCompanyAddress}
                    onChange={(e) => setShowCompanyAddress(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Corporate Address</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={showGST}
                    onChange={(e) => setShowGST(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show GSTIN / Tax ID</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={showPhone}
                    onChange={(e) => setShowPhone(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Corporate Phone</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={showEmail}
                    onChange={(e) => setShowEmail(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Corporate Email</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={showWebsite}
                    onChange={(e) => setShowWebsite(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Website Address</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Branding & Header Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 3: BANK DETAILS & MULTIPLE BANK ACCOUNTS (Section 7, 8, 9)
         ========================================================================= */}
      {activeTab === 'bank' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Commercial Bank Accounts & Remittance</h2>
              <p className="text-xs text-slate-500">
                Manage bank accounts for wire transfer / RTGS remittance printed on proposal PDFs
              </p>
            </div>
            <button
              onClick={() => handleOpenBankModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Bank Account
            </button>
          </div>

          {/* Masking Security Notice (Section 7) */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Sensitive Information Masked:</span> In CRM views and audit trails, bank account numbers are securely masked (e.g. •••• •••• 1234). The complete unmasked account number will only be rendered on the finalized proposal PDF.
            </div>
          </div>

          {/* Bank Accounts List */}
          {bankAccounts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No bank accounts registered yet</p>
              <p className="text-[11px] text-slate-400">Click &quot;Add Bank Account&quot; to configure your primary commercial bank</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    account.isDefault
                      ? 'border-indigo-300 bg-indigo-50/20 shadow-xs ring-1 ring-indigo-200'
                      : account.status === 'inactive'
                      ? 'border-slate-200 bg-slate-50/50 opacity-75'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{account.bankName}</h4>
                        {account.isDefault && (
                          <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                            Default
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            account.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {account.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{account.accountHolderName}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenBankModal(account)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBank(account.id, account.bankName)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Account Number:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {maskAccountNumber(account.accountNumber)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">IFSC Code:</span>
                      <span className="font-mono font-medium text-slate-800">{account.ifscCode}</span>
                    </div>
                    {account.branch && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Branch:</span>
                        <span>{account.branch}</span>
                      </div>
                    )}
                    {account.upiId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">UPI ID:</span>
                        <span className="font-mono text-slate-700">{account.upiId}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {!account.isDefault && account.status === 'active' ? (
                      <button
                        onClick={() => setDefaultBankAccount(account.id)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Mark as Default
                      </button>
                    ) : (
                      <span />
                    )}

                    <button
                      onClick={() => toggleBankAccountStatus(account.id)}
                      className={`text-xs font-semibold ${
                        account.status === 'active' ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'
                      }`}
                    >
                      {account.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit Bank Modal */}
          {isBankModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingBankId ? 'Edit Bank Account Details' : 'Add New Commercial Bank Account'}
                  </h3>
                  <button onClick={() => setIsBankModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveBankAccount} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Beneficiary Name *</label>
                    <input
                      type="text"
                      required
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={bankNameInput}
                      onChange={(e) => setBankNameInput(e.target.value)}
                      placeholder="e.g. HDFC Bank Ltd"
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number *</label>
                    <input
                      type="text"
                      required
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="e.g. 50200034891234"
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code *</label>
                      <input
                        type="text"
                        required
                        value={bankIfscCode}
                        onChange={(e) => setBankIfscCode(e.target.value.toUpperCase())}
                        placeholder="HDFC0001234"
                        className="w-full text-xs font-mono uppercase border border-slate-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name</label>
                      <input
                        type="text"
                        value={bankBranch}
                        onChange={(e) => setBankBranch(e.target.value)}
                        placeholder="Tech Hub Branch"
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">UPI ID (Optional)</label>
                    <input
                      type="text"
                      value={bankUpiId}
                      onChange={(e) => setBankUpiId(e.target.value)}
                      placeholder="sparkgen@hdfcbank"
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <label className="flex items-center gap-2 pt-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bankIsDefault}
                      onChange={(e) => setBankIsDefault(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>Set as primary default bank for new proposals</span>
                  </label>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsBankModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
                    >
                      {isSaving ? 'Saving...' : 'Save Bank Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: PROPOSAL SETTINGS & NUMBERING (Section 10, 11)
         ========================================================================= */}
      {activeTab === 'proposals' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Proposal Configuration & Sequential Numbering</h2>
            <p className="text-xs text-slate-500">
              Configure atomic counter sequences, validity periods, default currency, and section visibility
            </p>
          </div>

          <form onSubmit={handleSaveProposalSettings} className="space-y-6">
            {/* Numbering Mechanism (Section 11) */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Sequential Proposal Number Generator
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Firestore atomic transaction counter prevents duplicates across simultaneous team members
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold">LIVE SAMPLE FORMAT:</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm bg-indigo-100/70 px-2.5 py-1 rounded-lg border border-indigo-200">
                    {numberingPreview}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix Code *</label>
                  <input
                    type="text"
                    required
                    value={numPrefix}
                    onChange={(e) => {
                      setNumPrefix(e.target.value.toUpperCase());
                      setProposalPrefix(e.target.value.toUpperCase());
                    }}
                    placeholder="PROP"
                    className="w-full text-xs font-mono uppercase border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Year Stamp Format</label>
                  <select
                    value={numYearFormat}
                    onChange={(e) => setNumYearFormat(e.target.value as any)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="YYYY">Full 4-Digit Year (-2026)</option>
                    <option value="YY">2-Digit Year (-26)</option>
                    <option value="None">No Year Infix</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sequence Digits (Zero-padded)</label>
                  <select
                    value={numSequenceDigits}
                    onChange={(e) => setNumSequenceDigits(Number(e.target.value))}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value={3}>3 Digits (001)</option>
                    <option value={4}>4 Digits (0001)</option>
                    <option value={5}>5 Digits (00001)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* General Proposal Defaults (Section 10) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Quotation Validity (Days) *</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={defaultValidityDays}
                  onChange={(e) => setDefaultValidityDays(Number(e.target.value))}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Commercial Currency</label>
                <input
                  type="text"
                  disabled
                  value={defaultCurrency}
                  className="w-full text-sm bg-slate-100 text-slate-600 font-mono font-bold border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Proposal Footer Note</label>
                <input
                  type="text"
                  value={proposalFooterText}
                  onChange={(e) => setProposalFooterText(e.target.value)}
                  placeholder="Thank you for choosing SparkGenTechnology."
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Fallback Terms & Conditions (When individual terms not enabled)
                </label>
                <textarea
                  rows={4}
                  value={defaultTermsText}
                  onChange={(e) => setDefaultTermsText(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-xl p-3 leading-relaxed"
                />
              </div>
            </div>

            {/* Toggle Visibility Settings */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Default Proposal Sections</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propShowBankDetails}
                    onChange={(e) => setPropShowBankDetails(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Bank Details</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propShowSignatureArea}
                    onChange={(e) => setPropShowSignatureArea(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Authorized Signatory</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propShowTerms}
                    onChange={(e) => setPropShowTerms(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Terms & Conditions</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propShowGST}
                    onChange={(e) => setPropShowGST(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show GST Breakdown</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propShowCompanyLogo}
                    onChange={(e) => setPropShowCompanyLogo(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Company Logo</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Proposal Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 5: TERMS & CONDITIONS (Section 12)
         ========================================================================= */}
      {activeTab === 'terms' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Commercial Terms & Conditions</h2>
              <p className="text-xs text-slate-500">
                Configure numbered terms copied as an immutable snapshot into proposals upon finalization
              </p>
            </div>
            <button
              onClick={() => handleOpenTermModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Term
            </button>
          </div>

          <div className="space-y-3">
            {termsList.map((term, idx) => (
              <div
                key={term.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{term.title}</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          term.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {term.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{term.content}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMoveTerm(idx, 'up')}
                    className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded-lg hover:bg-white"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={idx === termsList.length - 1}
                    onClick={() => handleMoveTerm(idx, 'down')}
                    className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded-lg hover:bg-white"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenTermModal(term)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white"
                    title="Edit Term"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateTerm(term.id, { isActive: !term.isActive })}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-white"
                    title="Toggle Active"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTerm(term.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                    title="Delete Term"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add / Edit Term Modal */}
          {isTermModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingTermId ? 'Edit Commercial Term' : 'Add Commercial Term'}
                  </h3>
                  <button onClick={() => setIsTermModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveTerm} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Clause Title *</label>
                    <input
                      type="text"
                      required
                      value={termTitle}
                      onChange={(e) => setTermTitle(e.target.value)}
                      placeholder="e.g. Payment Terms, Delivery Schedule, Cancellation"
                      className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Clause Description *</label>
                    <textarea
                      rows={4}
                      required
                      value={termContent}
                      onChange={(e) => setTermContent(e.target.value)}
                      placeholder="Specify the commercial condition details..."
                      className="w-full text-xs border border-slate-300 rounded-lg p-3 leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsTermModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
                    >
                      {isSaving ? 'Saving...' : 'Save Term'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 6: AUTHORIZED SIGNATORY (Section 14)
         ========================================================================= */}
      {activeTab === 'signature' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Authorized Signatory & Signature Emblem</h2>
            <p className="text-xs text-slate-500">
              Configure signatory designation and digital emblem rendered on commercial proposals
            </p>
          </div>

          <form onSubmit={handleSaveSignatory} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Signatory Full Name *</label>
                  <input
                    type="text"
                    required
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="Rajesh Sharma"
                    className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Designation *</label>
                  <input
                    type="text"
                    required
                    value={signatoryDesignation}
                    onChange={(e) => setSignatoryDesignation(e.target.value)}
                    placeholder="Director - Commercial Operations"
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>

                <label className="flex items-center gap-2 pt-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSignature}
                    onChange={(e) => setShowSignature(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Display Authorized Signatory Block on Commercial Proposals</span>
                </label>
              </div>

              {/* Signature Image Upload (Section 14) */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Official Signature Graphic
                </span>
                <p className="text-[11px] text-slate-500">
                  If no image is uploaded, proposal will display a clean line reading &quot;Authorized Signatory&quot; without any fake signature.
                </p>

                <div className="h-28 bg-white rounded-xl border border-slate-300 flex items-center justify-center p-3 shadow-inner overflow-hidden">
                  {signatorySettings.signatureImageUrl ? (
                    <img
                      src={signatorySettings.signatureImageUrl}
                      alt="Signature Preview"
                      className="max-h-20 max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <PenTool className="w-6 h-6 mx-auto stroke-1 mb-1" />
                      <span className="text-[11px] font-mono">No Image Uploaded (Line Only)</span>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  id="signatoryUploadInput"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleSignatureUpload}
                  disabled={isUploadingSignature}
                  className="hidden"
                />

                <div className="flex items-center gap-2 pt-1">
                  <label
                    htmlFor="signatoryUploadInput"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {isUploadingSignature ? 'Uploading...' : 'Upload Signature'}
                  </label>
                  {signatorySettings.signatureImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveSignature}
                      className="inline-flex items-center gap-1 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Signatory Details'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 7: PROPOSAL TEMPLATE SETTINGS (Section 15, 16)
         ========================================================================= */}
      {activeTab === 'proposal-template' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Proposal Template & Layout Styling</h2>
              <p className="text-xs text-slate-500">
                Configure layout structure, headers, table presentation, and preview realistic proposals
              </p>
            </div>
            <button
              onClick={() => setIsPreviewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Eye className="w-4 h-4" /> Preview Live Template
            </button>
          </div>

          <form onSubmit={handleSaveTemplateSettings} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Header Style</label>
                <select
                  value={headerStyle}
                  onChange={(e) => setHeaderStyle(e.target.value as any)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white"
                >
                  <option value="classic">Classic Corporate (Deep Navy / Charcoal)</option>
                  <option value="modern">Modern Bordered (Vibrant Accent Stripe)</option>
                  <option value="minimal">Minimalist Monochrome (Clean Slate)</option>
                  <option value="bold">Bold Executive (Full Solid Color)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Logo Placement</label>
                <select
                  value={logoPosition}
                  onChange={(e) => setLogoPosition(e.target.value as any)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white"
                >
                  <option value="left">Left Aligned</option>
                  <option value="center">Centered</option>
                  <option value="right">Right Aligned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Line Items Table Style</label>
                <select
                  value={tableStyle}
                  onChange={(e) => setTableStyle(e.target.value as any)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white"
                >
                  <option value="striped">Zebra Striped Rows (Optimal readability)</option>
                  <option value="clean">Clean Minimal (Subtle borders)</option>
                  <option value="bordered">Full Bordered Grid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Proposal Theme Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={tmplPrimaryColor}
                    onChange={(e) => setTmplPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={tmplPrimaryColor}
                    onChange={(e) => setTmplPrimaryColor(e.target.value)}
                    className="text-xs font-mono uppercase border border-slate-300 rounded-lg px-2.5 py-2 w-28"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Configured Footer Notice</label>
                <input
                  type="text"
                  value={tmplFooterText}
                  onChange={(e) => setTmplFooterText(e.target.value)}
                  placeholder="Thank you for choosing SparkGenTechnology."
                  className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>
            </div>

            {/* Template Section Toggles */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Proposal Structure Toggles</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tmplShowCompanyDetails}
                    onChange={(e) => setTmplShowCompanyDetails(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Company Details</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tmplShowBankSection}
                    onChange={(e) => setTmplShowBankSection(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Bank Section</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tmplShowGST}
                    onChange={(e) => setTmplShowGST(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show GST Breakup</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tmplShowTerms}
                    onChange={(e) => setTmplShowTerms(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Terms Clause</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tmplShowSignature}
                    onChange={(e) => setTmplShowSignature(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Show Authorized Signatory</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
              >
                Preview Template
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Template Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 8: EMAIL PROVIDER INTEGRATION & CONFIGURATION (Section 4, 5, 24)
         ========================================================================= */}
      {activeTab === 'email' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Email Service Provider Configuration</h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    emailConfigStatus === 'Configured'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : emailConfigStatus === 'Connection Error' || emailConfigStatus === 'Authentication Failed'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  ● {emailConfigStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure server-side SMTP or transactional API credentials for delivering proposals and client notifications.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || emailProvider === 'none'}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>

          {/* Connection Test Result Alert */}
          {connectionTestResult && (
            <div
              className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                connectionTestResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {connectionTestResult.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{connectionTestResult.message}</span>
            </div>
          )}

          {/* Security Notice (Section 4) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
            <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">Zero-Trust Credential Security</strong>
              Passwords, secret tokens, and API credentials are kept exclusively on the server. The frontend never exposes secret keys in HTML or browser bundles. Dispatches route through the authenticated backend proxy.
            </div>
          </div>

          <form onSubmit={handleSaveEmailConfig} className="space-y-6">
            {/* Provider Selector Cards */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Dispatch Provider
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  {
                    id: 'smtp',
                    label: 'SMTP Relay',
                    desc: 'Gmail, Workspace, Outlook, Custom Server',
                    icon: <Server className="w-5 h-5 text-indigo-600" />,
                  },
                  {
                    id: 'resend',
                    label: 'Resend API',
                    desc: 'Modern Developer Email Infrastructure',
                    icon: <Send className="w-5 h-5 text-purple-600" />,
                  },
                  {
                    id: 'sendgrid',
                    label: 'SendGrid API',
                    desc: 'Twilio Enterprise Transactional Mail',
                    icon: <Mail className="w-5 h-5 text-blue-600" />,
                  },
                  {
                    id: 'none',
                    label: 'Disabled',
                    desc: 'No email service active',
                    icon: <X className="w-5 h-5 text-slate-400" />,
                  },
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setEmailProvider(p.id as any)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      emailProvider === p.id
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {p.icon}
                      <span
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          emailProvider === p.id
                            ? 'border-indigo-600 bg-indigo-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {emailProvider === p.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{p.label}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Provider Configuration Fields */}
            {emailProvider === 'smtp' && (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-indigo-600" /> SMTP Connection Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      SMTP Host Server *
                    </label>
                    <input
                      type="text"
                      required
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="e.g. smtp.gmail.com or mail.sparkgentechnology.com"
                      className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Port *</label>
                    <input
                      type="number"
                      required
                      value={smtpPort}
                      onChange={(e) => {
                        const portNum = Number(e.target.value);
                        setSmtpPort(portNum);
                        if (portNum === 465) {
                          setSmtpSecure(true);
                        } else if (portNum === 587 || portNum === 25) {
                          setSmtpSecure(false);
                        }
                      }}
                      placeholder="587 or 465"
                      className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      SMTP Username / Account Email *
                    </label>
                    <input
                      type="text"
                      required
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="sales@sparkgentechnology.in"
                      className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      SMTP Password / App Key
                      {hasExistingPassword && (
                        <span className="text-[10px] text-emerald-600 font-semibold ml-1.5">
                          ● Configured securely
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder={hasExistingPassword ? "••••••••" : "Enter SMTP password"}
                      className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      {hasExistingPassword
                        ? "Saved securely on server. Leave blank to preserve existing password."
                        : "Encrypted server-side. Never stored in public Firestore."}
                    </p>
                  </div>

                  <div className="sm:col-span-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span>Enforce SSL/TLS Encryption (Required for Port 465) — Uncheck for STARTTLS (Port 587)</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-600">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSmtpHost('smtp.titan.email');
                          setSmtpPort(465);
                          setSmtpSecure(true);
                        }}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                      >
                        Titan Email (Port 465 SSL)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSmtpHost('smtp.gmail.com');
                          setSmtpPort(587);
                          setSmtpSecure(false);
                        }}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                      >
                        Google Workspace / Gmail (587 TLS)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSmtpHost('smtp.office365.com');
                          setSmtpPort(587);
                          setSmtpSecure(false);
                        }}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                      >
                        Microsoft 365 (587 TLS)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(emailProvider === 'resend' || emailProvider === 'sendgrid') && (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-purple-600" /> {emailProvider.toUpperCase()} API Authentication
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Secret API Key *
                  </label>
                  <input
                    type="password"
                    value={providerApiKey}
                    onChange={(e) => setProviderApiKey(e.target.value)}
                    placeholder="re_... or SG.... (Leave blank to keep existing)"
                    className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Key is transmitted directly to server-side memory/config file and never surfaced to client sessions.
                  </p>
                </div>
              </div>
            )}

            {/* Sender Identity & Reply-To */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sender Display Name *</label>
                <input
                  type="text"
                  required
                  value={emailSenderName}
                  onChange={(e) => setEmailSenderName(e.target.value)}
                  placeholder="SparkGenTechnology"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sender Email Address *</label>
                <input
                  type="email"
                  required
                  value={emailSenderAddress}
                  onChange={(e) => setEmailSenderAddress(e.target.value)}
                  placeholder="sales@sparkgentechnology.in"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reply-To Address *</label>
                <input
                  type="email"
                  required
                  value={emailReplyTo}
                  onChange={(e) => setEmailReplyTo(e.target.value)}
                  placeholder="sales@sparkgentechnology.in"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex-1 w-full sm:w-auto">
                {emailSaveSuccess && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-xl shadow-2xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{emailSaveSuccess}</span>
                  </div>
                )}
                {emailSaveError && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{emailSaveError}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Email Provider Configuration</span>
                )}
              </button>
            </div>
          </form>

          {/* Section 24: TEST EMAIL DISPATCH FEATURE */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 pt-6">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-4 h-4 text-indigo-600" /> Send Test Email to Verify Integration
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sends an actual test verification message using the configured provider to confirm SMTP / API connectivity.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="email"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="Enter recipient email (e.g. shukla.by@gmail.com)"
                className="w-full sm:w-96 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTestEmail || !isEmailConfigured}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 shrink-0"
              >
                {isSendingTestEmail ? 'Sending Test...' : 'Send Test Email'}
              </button>
            </div>

            {testEmailResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                  testEmailResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testEmailResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testEmailResult.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 9: EMAIL TEMPLATES SYSTEM (Section 3)
         ========================================================================= */}
      {activeTab === 'email-templates' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Commercial Email Template Engine</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {emailTemplates.length} Templates Configured
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Manage customizable email bodies, subject lines, and dynamic CRM variable tags for client communications.
              </p>
            </div>

            <button
              onClick={() => handleOpenTemplateModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Create New Template
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
            {['ALL', 'Proposal Email', 'Follow-up Email', 'Welcome Email', 'Payment Reminder', 'Custom'].map((t) => (
              <button
                key={t}
                onClick={() => setTplTypeFilter(t as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                  tplTypeFilter === t
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emailTemplates
              .filter((tpl) => tplTypeFilter === 'ALL' || tpl.type === tplTypeFilter)
              .map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{tpl.templateName}</h4>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            tpl.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {tpl.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-mono font-semibold block mt-0.5">
                        {tpl.templateId} • {tpl.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenTemplateModal(tpl)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Template"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.templateName)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono">
                    <div className="text-[11px] text-slate-700 font-bold truncate">
                      <span className="text-slate-400 font-normal">Subject: </span>
                      {tpl.subject}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-3 font-sans leading-relaxed whitespace-pre-line">
                      {tpl.body}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Created: {tpl.createdBy}</span>
                    <span>Updated: {new Date(tpl.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 8: CONTACT INFORMATION (Section 1)
         ========================================================================= */}
      {activeTab === 'contact' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Corporate Contact & Regional Desks</h2>
            <p className="text-xs text-slate-500">
              Centralized corporate communication channels for SparkGenTechnology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Enterprise Inquiries</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-400">Sales Desk:</span>
                  <span className="font-semibold text-slate-900">{companySettings.email || 'sales@sparkgentechnology.com'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-400">Direct Phone:</span>
                  <span className="font-mono font-semibold text-slate-900">{companySettings.phone || '+91 98765 43210'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-400">Helpline / Alt:</span>
                  <span className="font-mono text-slate-800">{companySettings.alternatePhone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Web Portal:</span>
                  <span className="text-indigo-600">{companySettings.website || 'https://sparkgentechnology.com'}</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Registered Corporate Campus</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block mb-0.5">Address:</span>
                  <p className="font-medium text-slate-800 leading-relaxed">
                    {companySettings.address || 'SparkGen Technology Innovation Park, Phase 2, Tech Hub'}
                  </p>
                  <p className="text-slate-600">
                    {companySettings.city || 'Bengaluru'}, {companySettings.state || 'Karnataka'} - {companySettings.pincode || '560100'}, {companySettings.country || 'India'}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between">
                  <span className="text-slate-400">GSTIN:</span>
                  <span className="font-mono font-bold text-slate-900">{companySettings.gstNumber || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 9: SYSTEM PREFERENCES (Section 1)
         ========================================================================= */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">CRM Operational & System Preferences</h2>
            <p className="text-xs text-slate-500">
              System formatting conventions, tax parameters, and operational integrity policies
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary Currency</span>
              <h4 className="text-sm font-bold text-slate-900">INR (₹ - Indian Rupee)</h4>
              <p className="text-xs text-slate-500">Full Indian Lakhs / Crores notation format supported</p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Standard GST Engine</span>
              <h4 className="text-sm font-bold text-slate-900">18% Harmonized Rate</h4>
              <p className="text-xs text-slate-500">Auto line-item calculation with CGST/SGST/IGST compliance</p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Snapshot Integrity Policy</span>
              <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Active & Enforced
              </h4>
              <p className="text-xs text-slate-500">Finalized proposals are immutable and never updated by settings</p>
            </div>
          </div>

          {/* Section 23: REAL-TIME NOTIFICATION PREFERENCES */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-indigo-600" /> Real-Time Notification Preferences (Section 23)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure immediate popover alerts and notification center feeds for critical client lifecycle events.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Proposal Viewed Alerts</span>
                  <span className="text-[11px] text-slate-500">Trigger alert when a client opens a proposal link</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifProposalViewed}
                  onChange={(e) => setNotifProposalViewed(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Proposal Accepted Alerts</span>
                  <span className="text-[11px] text-slate-500">Instant notification when a proposal is approved</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifProposalAccepted}
                  onChange={(e) => setNotifProposalAccepted(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Proposal Rejected Alerts</span>
                  <span className="text-[11px] text-slate-500">Alert team when client submits a decline reason</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifProposalRejected}
                  onChange={(e) => setNotifProposalRejected(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Email Delivery Failure Alerts</span>
                  <span className="text-[11px] text-slate-500">Alert when provider fails to deliver proposal email</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifEmailFailed}
                  onChange={(e) => setNotifEmailFailed(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer sm:col-span-2">
                <div>
                  <span className="font-bold text-slate-800 block">Follow-up Due Reminders</span>
                  <span className="text-[11px] text-slate-500">Include scheduled touchpoints due today and overdue in the header alert bell</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifFollowupDue}
                  onChange={(e) => setNotifFollowupDue(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => notifySuccess('Real-time notification preferences saved successfully!')}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Save Notification Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 10: PERMISSIONS MATRIX (Section 1, 19)
         ========================================================================= */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Administrative Privileges & Access Control (RBAC)</h2>
              <p className="text-xs text-slate-500">
                Role boundary enforcement between Super Administrators and operational sales staff
              </p>
            </div>
            <button
              onClick={() => {
                window.history.pushState(null, '', '/admin/employees');
                window.location.reload();
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Manage Employees
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Security Rule Guarantees (Section 19)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <strong className="text-slate-900 block mb-1">Super Administrator Exclusives:</strong>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                  <li>Change corporate profile & identity</li>
                  <li>Upload & remove active logos & emblems</li>
                  <li>Add, modify, or deactivate bank accounts</li>
                  <li>Reconfigure proposal numbering & prefixes</li>
                  <li>Modify commercial terms & conditions</li>
                  <li>Configure proposal template presentation</li>
                </ul>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <strong className="text-slate-900 block mb-1">Operational Staff Permissions:</strong>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                  <li>Build proposals from active settings snapshot</li>
                  <li>Select from active registered bank accounts</li>
                  <li>Generate customer quotes with locked terms</li>
                  <li>Direct access to `/admin/settings` returns Access Denied</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 11: AUDIT LOG (Section 18)
         ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Settings Change Audit Trail</h2>
            <p className="text-xs text-slate-500">
              Tamper-evident record of all corporate identity, banking, branding, and template modifications
            </p>
          </div>

          {settingsActivities.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No administrative settings changes recorded yet in current audit window.
            </div>
          ) : (
            <div className="space-y-3">
              {settingsActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{act.title}</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {act.type}
                      </span>
                    </div>
                    <p className="text-slate-600">{act.description}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-slate-400 block text-[11px]">{new Date(act.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== PROPOSAL TEMPLATE PREVIEW MODAL ==================== */}
      <ProposalTemplatePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        companySettings={companySettings}
        brandingSettings={brandingSettings}
        defaultBank={defaultBankAcc}
        templateSettings={proposalTemplateSettings}
        signatorySettings={signatorySettings}
        termsList={termsList}
      />

      {/* ==================== EMAIL TEMPLATE ADD / EDIT MODAL ==================== */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTemplate ? 'Edit Email Template' : 'Create New Email Template'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure subject, message body, and dynamic CRM replacement tags
                </p>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Template Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={templateNameInput}
                    onChange={(e) => setTemplateNameInput(e.target.value)}
                    placeholder="e.g. Standard Proposal Dispatch"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Template Category / Type *
                  </label>
                  <select
                    value={templateTypeInput}
                    onChange={(e) => setTemplateTypeInput(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white font-medium"
                  >
                    <option value="Proposal Email">Proposal Email</option>
                    <option value="Follow-up Email">Follow-up Email</option>
                    <option value="Welcome Email">Welcome Email</option>
                    <option value="Payment Reminder">Payment Reminder</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Subject Line *
                </label>
                <input
                  type="text"
                  required
                  value={templateSubjectInput}
                  onChange={(e) => setTemplateSubjectInput(e.target.value)}
                  placeholder="e.g. Proposal {{proposalNumber}} from SparkGenTechnology"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 font-medium"
                />
              </div>

              {/* Dynamic Variables Inserter Bar (Section 3) */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                  Click Tag to Insert Dynamic Variable:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{{customerName}}',
                    '{{contactPerson}}',
                    '{{companyName}}',
                    '{{proposalNumber}}',
                    '{{grandTotal}}',
                    '{{validUntil}}',
                    '{{employeeName}}',
                    '{{employeePhone}}',
                    '{{secureProposalLink}}',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertVariable(tag)}
                      className="px-2 py-1 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-mono font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Message Body *
                </label>
                <textarea
                  rows={6}
                  required
                  value={templateBodyInput}
                  onChange={(e) => setTemplateBodyInput(e.target.value)}
                  placeholder="Enter message body here..."
                  className="w-full border border-slate-300 rounded-xl p-3.5 font-sans leading-relaxed text-xs"
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={templateStatusInput}
                  onChange={(e) => setTemplateStatusInput(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white font-medium"
                >
                  <option value="active">Active (Available for dispatches)</option>
                  <option value="inactive">Inactive (Disabled)</option>
                </select>
              </div>

              {/* Live Sample Preview */}
              <div className="p-4 bg-slate-900 text-slate-300 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                  Live Dynamic Preview (With Real Values Substituted — No "undefined"):
                </span>
                <div className="text-xs text-white font-semibold">
                  Subject: {templateSubjectInput
                    .replace(/\{\{proposalNumber\}\}/g, 'PROP-2026-0042')
                    .replace(/\{\{customerName\}\}/g, 'Acme Industrial Ltd.')
                    .replace(/\{\{companyName\}\}/g, 'Acme Industrial Ltd.')}
                </div>
                <div className="text-[11px] text-slate-300 font-mono whitespace-pre-line border-t border-slate-800 pt-2 leading-relaxed">
                  {templateBodyInput
                    .replace(/\{\{contactPerson\}\}/g, 'Rajesh Kumar')
                    .replace(/\{\{customerName\}\}/g, 'Acme Industrial Ltd.')
                    .replace(/\{\{companyName\}\}/g, 'Acme Industrial Ltd.')
                    .replace(/\{\{proposalNumber\}\}/g, 'PROP-2026-0042')
                    .replace(/\{\{grandTotal\}\}/g, '1,45,000.00')
                    .replace(/\{\{validUntil\}\}/g, '25 Oct 2026')
                    .replace(/\{\{employeeName\}\}/g, 'Rahul Sharma')
                    .replace(/\{\{employeePhone\}\}/g, '+91 98765 11102')
                    .replace(/\{\{secureProposalLink\}\}/g, 'https://salessphere.sparkgentechnology.com/proposal/tok_sec_9948')}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 14: PAYMENT GATEWAY (Phase 13)
         ========================================================================= */}
      {activeTab === 'payment' && (
        <PaymentGatewaySettingsView />
      )}

      {/* =========================================================================
          TAB 15: PRODUCT & INVENTORY SETTINGS (Phase 16)
         ========================================================================= */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Product, Stock & Inventory Settings</h2>
              <p className="text-xs text-slate-500">
                Configure auto-numbering prefixes, stock tracking thresholds, negative inventory rules, and default taxation
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-mono">
                Catalog & ERP Configuration
              </span>
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSaving(true);
              setErrorMsg('');
              setSaveSuccess(null);
              const form = e.currentTarget;
              const formData = new FormData(form);
              try {
                await updateProductSettings({
                  productCodePrefix: (formData.get('productCodePrefix') as string) || 'PRD',
                  serviceCodePrefix: (formData.get('serviceCodePrefix') as string) || 'SRV',
                  purchaseNumberPrefix: (formData.get('purchaseNumberPrefix') as string) || 'PO',
                  supplierCodePrefix: (formData.get('supplierCodePrefix') as string) || 'SUP',
                  stockTracking: formData.get('stockTracking') === 'on',
                  allowNegativeStock: formData.get('allowNegativeStock') === 'on',
                  lowStockThreshold: Number(formData.get('lowStockThreshold')) || 10,
                  defaultTaxRate: Number(formData.get('defaultTaxRate')) || 18,
                  maxDiscountPercent: Number(formData.get('maxDiscountPercent')) || 25,
                  requirePriceOverrideReason: formData.get('requirePriceOverrideReason') === 'on',
                  deductStockOn: (formData.get('deductStockOn') as any) || 'Invoice Issued',
                });
                setSaveSuccess('Product & Inventory settings saved successfully.');
              } catch (err: any) {
                setErrorMsg(err.message || 'Failed to update product settings.');
              } finally {
                setIsSaving(false);
              }
            }}
            className="space-y-6"
          >
            {/* Code Prefixes */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                Auto-Numbering Sequences & Prefixes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Code Prefix</label>
                  <input
                    name="productCodePrefix"
                    defaultValue={productSettings.productCodePrefix || 'PRD'}
                    className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3 py-2 uppercase"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">e.g. PRD-2026-0001</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Code Prefix</label>
                  <input
                    name="serviceCodePrefix"
                    defaultValue={productSettings.serviceCodePrefix || 'SRV'}
                    className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3 py-2 uppercase"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">e.g. SRV-2026-0001</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Order Prefix</label>
                  <input
                    name="purchaseNumberPrefix"
                    defaultValue={productSettings.purchaseNumberPrefix || 'PO'}
                    className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3 py-2 uppercase"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">e.g. PO-2026-0001</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Code Prefix</label>
                  <input
                    name="supplierCodePrefix"
                    defaultValue={productSettings.supplierCodePrefix || 'SUP'}
                    className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3 py-2 uppercase"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">e.g. SUP-2026-0001</span>
                </div>
              </div>
            </div>

            {/* Inventory Controls */}
            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                Stock & Inventory Controls
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Global Low Stock Warning Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="lowStockThreshold"
                    defaultValue={productSettings.lowStockThreshold || 10}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Default minimum quantity if not individually specified on a product
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default GST Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="defaultTaxRate"
                    defaultValue={productSettings.defaultTaxRate || 18}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Applied automatically to newly created products & services
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deduct Stock On
                  </label>
                  <select
                    name="deductStockOn"
                    defaultValue={productSettings.deductStockOn || 'Invoice Issued'}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="Invoice Issued">Invoice Issued (Finalized)</option>
                    <option value="Invoice Paid">Invoice Paid in Full</option>
                    <option value="Manual">Manual Dispatch / Delivery Confirmation</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Trigger for converting inventory reservation into physical stock deduction
                  </span>
                </div>
              </div>
            </div>

            {/* Policy Toggles */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Operational Policies
              </h3>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <input
                  type="checkbox"
                  id="stockTracking"
                  name="stockTracking"
                  defaultChecked={productSettings.stockTracking !== false}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="stockTracking" className="text-xs text-slate-700">
                  <span className="font-semibold block text-slate-900">Enable Global Inventory Tracking</span>
                  Track physical units, movements, and reservations across catalog items
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <input
                  type="checkbox"
                  id="allowNegativeStock"
                  name="allowNegativeStock"
                  defaultChecked={productSettings.allowNegativeStock === true}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="allowNegativeStock" className="text-xs text-slate-700">
                  <span className="font-semibold block text-slate-900">Allow Negative Inventory</span>
                  Permit sales and stock deductions even if on-hand physical stock reaches zero
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <input
                  type="checkbox"
                  id="requirePriceOverrideReason"
                  name="requirePriceOverrideReason"
                  defaultChecked={productSettings.requirePriceOverrideReason !== false}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="requirePriceOverrideReason" className="text-xs text-slate-700">
                  <span className="font-semibold block text-slate-900">Mandate Price Override Reason</span>
                  Require staff to supply an audit justification whenever overriding master catalog prices
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                {saveSuccess && <span className="text-xs text-emerald-600 font-semibold">{saveSuccess}</span>}
                {errorMsg && <span className="text-xs text-rose-600 font-semibold">{errorMsg}</span>}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {isSaving ? 'Saving Settings...' : 'Save Product & Stock Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
