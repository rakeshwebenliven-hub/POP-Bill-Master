import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  Plus, Trash2, X, Calculator, Pencil, Clock, Save, Search, 
  AlertCircle, Upload, Share2, Users, QrCode, 
  FilePlus, Moon, Sun, Mic, Building2, LogOut, Crown, Cloud, 
  RefreshCw, CheckCircle2, User, ChevronRight, Loader2, FileText, 
  Wallet, PieChart, Menu, ArrowRight, ChevronDown, ChevronUp, 
  Landmark
} from 'lucide-react';

import { 
  BillItem, ContractorDetails, ClientDetails, SavedBillData, 
  PaymentStatus, PaymentRecord, ExpenseRecord, UserProfile, DocumentType 
} from './types';
import { 
  APP_TEXT, CONSTRUCTION_UNITS, BUSINESS_CATEGORIES, AUTO_SUGGEST_ITEMS 
} from './constants';
import { 
  saveDraft, loadDraft, saveToHistory, getHistory, 
  saveProfile, getProfiles, saveClientProfile, getClientProfiles, 
  deleteFromHistory, updateBillStatus, updateEstimateStatus 
} from './services/storageService';
import { generatePDF, printPDF } from './services/pdfService';
import { generateExcel } from './services/excelService';
import { checkSubscriptionAccess, logoutUser } from './services/authService';
import { backupToDrive, restoreFromDrive } from './services/googleDriveService';

// Lazy Load Components
const HistoryModal = React.lazy(() => import('./components/HistoryModal'));
const CalculatorModal = React.lazy(() => import('./components/CalculatorModal'));
const VoiceEntryModal = React.lazy(() => import('./components/VoiceEntryModal'));
const ShareModal = React.lazy(() => import('./components/ShareModal'));
const ProfileModal = React.lazy(() => import('./components/ProfileModal'));
const DashboardModal = React.lazy(() => import('./components/DashboardModal'));
const ExpensesModal = React.lazy(() => import('./components/ExpensesModal'));
const OnboardingFlow = React.lazy(() => import('./components/OnboardingFlow'));
const SubscriptionPlans = React.lazy(() => import('./components/SubscriptionPlans'));

export const App = () => {
  const t = APP_TEXT;

  // --- Global State ---
  const [user, setUser] = useState<UserProfile | null>(null);
  const [access, setAccess] = useState({ hasAccess: false, daysLeft: 0, isTrial: false });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState<'create' | 'history' | 'analytics' | 'profile'>('create');
  
  // --- Create Bill State ---
  const [createStep, setCreateStep] = useState<'parties' | 'items' | 'summary'>('parties');
  const [documentType, setDocumentType] = useState<DocumentType>('invoice');
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [contractor, setContractor] = useState<ContractorDetails>({
    name: '', companyName: '', phone: '', email: '', website: '', 
    socialLinks: [], logo: '', upiQrCode: '', 
    bankDetails: { holderName: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '', branchAddress: '' }
  });
  const [client, setClient] = useState<ClientDetails>({ name: '', phone: '', address: '' });
  const [items, setItems] = useState<BillItem[]>([]);
  
  // Item Entry
  const [currentItem, setCurrentItem] = useState<BillItem>({
    id: '', description: '', length: 0, width: 0, height: 0, quantity: 1, unit: 'sq.ft', rate: 0, amount: 0, floor: ''
  });
  const [isAddItemOpen, setIsAddItemOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Financials
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(18);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [includeBankDetails, setIncludeBankDetails] = useState(true);

  // --- UI State ---
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  
  const [toast, setToast] = useState<{ msg: string, type: 'success'|'error' } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Init ---
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const savedUser = localStorage.getItem('pop_user_profile');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      setAccess(checkSubscriptionAccess());
    }

    const draft = loadDraft();
    if (draft) {
      loadBillData(draft);
      if (draft.contractor?.bankDetails) setIncludeBankDetails(true);
    } else {
      const profiles = getProfiles();
      if (profiles.length > 0) {
        setContractor(profiles[0].details);
        setSelectedProfileId(profiles[0].id);
      }
      setBillNumber(generateNextBillNumber());
    }
  }, []);

  useEffect(() => {
    if (user) setAccess(checkSubscriptionAccess());
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const dataToSave = {
        billNumber, billDate, contractor, client, items, gstEnabled, gstRate, 
        payments, expenses, disclaimer, type: documentType, paymentStatus: 'Pending' as PaymentStatus,
        advanceAmount: '', originalId: currentBillId
    };
    saveDraft(dataToSave);
    if (currentBillId) saveToHistory(dataToSave, currentBillId);
  }, [billNumber, billDate, contractor, client, items, gstEnabled, gstRate, payments, expenses, disclaimer, documentType, currentBillId, user]);

  // --- Helpers ---
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const generateNextBillNumber = () => {
    const history = getHistory();
    const invoiceHistory = history.filter(h => (h.type || 'invoice') === 'invoice');
    if (invoiceHistory.length > 0) {
      const last = invoiceHistory[0].billNumber;
      const numPart = last.match(/(\d+)$/);
      if (numPart) {
        const nextNum = parseInt(numPart[0]) + 1;
        return last.replace(numPart[0], nextNum.toString().padStart(numPart[0].length, '0'));
      }
    }
    return 'INV-001';
  };

  // --- Calculations ---
  const calculateItemArea = (l: number, w: number, h: number, unit: string, qty: number): number => {
    if (['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(unit)) return l * w;
    if (['cu.ft', 'cu.mt'].includes(unit)) return l * w * (h || 0);
    if (unit === 'brass') return (l * w * (h || 0)) / 100;
    if (['rft', 'r.mt'].includes(unit)) return l;
    return qty;
  };

  const calculateAmount = (l: number, w: number, h: number, qty: number, rate: number, unit: string) => {
    let val = 0;
    const q = qty || 1;
    if (['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(unit)) val = l * w * q;
    else if (['cu.ft', 'cu.mt'].includes(unit)) val = l * w * (h || 0) * q;
    else if (unit === 'brass') val = (l * w * (h || 0) * q) / 100;
    else if (['rft', 'r.mt'].includes(unit)) val = l * q;
    else val = q;
    return parseFloat((val * rate).toFixed(2));
  };

  // --- Actions ---
  const handleAddItem = () => {
    if (!currentItem.description) return showToast("Description required", 'error');
    if (!currentItem.rate && currentItem.rate !== 0) return showToast("Rate required", 'error');

    const newItem = {
      ...currentItem,
      id: editingId || Date.now().toString(),
      amount: calculateAmount(currentItem.length, currentItem.width, currentItem.height || 0, currentItem.quantity, currentItem.rate, currentItem.unit)
    };

    if (editingId) {
      setItems(items.map(i => i.id === editingId ? newItem : i));
      setEditingId(null);
      showToast("Item Updated");
    } else {
      setItems([...items, newItem]);
      showToast("Item Added");
    }
    // Keep unit/floor context for speed
    setCurrentItem({ ...currentItem, description: '', amount: 0, length: 0, width: 0, height: 0, quantity: 1, rate: 0 });
  };

  const handleEditItem = (item: BillItem) => {
    setCurrentItem(item);
    setEditingId(item.id);
    setIsAddItemOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm("Delete item?")) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const loadBillData = (bill: SavedBillData) => {
    setContractor(bill.contractor);
    setClient(bill.client);
    setItems(bill.items);
    setBillNumber(bill.billNumber);
    setBillDate(bill.billDate || new Date().toISOString().split('T')[0]);
    setGstEnabled(bill.gstEnabled);
    setGstRate(bill.gstRate || 18);
    setPayments(bill.payments || []);
    setExpenses(bill.expenses || []);
    setDisclaimer(bill.disclaimer);
    setDocumentType(bill.type || 'invoice');
    setCurrentBillId(bill.id);
    if (bill.items.length > 0) setCreateStep('items');
  };

  const handleNewBill = () => {
    setClient({ name: '', phone: '', address: '' });
    setItems([]);
    setBillNumber(generateNextBillNumber());
    setPayments([]);
    setExpenses([]);
    setCurrentBillId(null);
    setCreateStep('parties');
    setDocumentType('invoice');
    showToast("New Bill Started");
  };

  const validateAndNext = (targetStep: 'parties' | 'items' | 'summary') => {
     if (targetStep === 'items' || targetStep === 'summary') {
        if (!contractor.name && !contractor.companyName) return showToast("Enter Business Name", 'error');
        if (!client.name) return showToast("Enter Client Name", 'error');
     }
     if (targetStep === 'summary') {
        if (items.length === 0) return showToast("Add at least one item", 'error');
     }
     setCreateStep(targetStep);
  };

  const getTotals = () => {
    const subTotal = items.reduce((s, i) => s + i.amount, 0);
    const gst = gstEnabled ? subTotal * (gstRate / 100) : 0;
    const grandTotal = subTotal + gst;
    const totalAdvance = payments.reduce((s, p) => s + p.amount, 0);
    const balance = grandTotal - totalAdvance;
    return { subTotal, gst, grandTotal, balance, advance: totalAdvance };
  };

  const handleExport = (type: 'pdf' | 'excel', status: PaymentStatus, action: 'share' | 'download') => {
    const totals = getTotals();
    const finalContractor = { ...contractor, bankDetails: includeBankDetails ? contractor.bankDetails : undefined };
    const generator = type === 'pdf' ? generatePDF : generateExcel;
    
    if (action === 'share') {
       // @ts-ignore
       const blob = generator(items, finalContractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, status, totals, billDate, documentType, true);
       if (navigator.share) {
          const file = new File([blob], `${documentType}_${billNumber}.${type === 'pdf' ? 'pdf' : 'xlsx'}`, { type: blob.type });
          navigator.share({ files: [file], title: `${documentType === 'invoice' ? 'Bill' : 'Estimate'} ${billNumber}` }).catch(console.error);
       } else {
          showToast("Sharing not supported on this device", 'error');
       }
    } else {
       // @ts-ignore
       generator(items, finalContractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, status, totals, billDate, documentType, false);
       showToast("Downloading...");
    }
  };

  const handlePrint = (status: PaymentStatus) => {
      const totals = getTotals();
      const finalContractor = { ...contractor, bankDetails: includeBankDetails ? contractor.bankDetails : undefined };
      printPDF(items, finalContractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, status, totals, billDate, documentType);
  };

  const isConstructionMode = useMemo(() => {
    const cat = contractor.businessCategory || '';
    return cat.includes('Contractor') || cat.includes('Builder') || cat.includes('Architect') || cat.includes('Fabrication');
  }, [contractor.businessCategory]);

  const showFloorInput = useMemo(() => {
    const cat = (contractor.businessCategory || '').toLowerCase();
    const kws = ['civil', 'pop', 'paint', 'electric', 'plumb', 'hvac', 'interior', 'architect', 'real estate'];
    return kws.some(k => cat.includes(k));
  }, [contractor.businessCategory]);

  const getPriorityUnits = () => {
    const cat = (contractor.businessCategory || '').toLowerCase();
    if (cat.includes('retail') || cat.includes('shop')) return ['pcs', 'nos', 'pkt', 'box', 'set', 'kg', 'ltr'];
    if (cat.includes('civil') || cat.includes('pop')) return ['sq.ft', 'brass', 'cu.ft', 'rft', 'nos', 'bag'];
    return ['nos', 'sq.ft'];
  };

  if (!user) {
    return (
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>}>
         <OnboardingFlow onComplete={(u) => { setUser(u); setAccess(checkSubscriptionAccess()); }} />
      </Suspense>
    );
  }

  if ((!access.hasAccess && !showSubscription) || showSubscription) {
    return (
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>}>
         <SubscriptionPlans 
            onSuccess={(u) => { setUser(u); setAccess(checkSubscriptionAccess()); setShowSubscription(false); }} 
            planId={user.planId || undefined}
            remainingDays={access.daysLeft}
            onBack={access.hasAccess ? () => setShowSubscription(false) : undefined}
         />
      </Suspense>
    );
  }

  return (
    <div className={`min-h-screen pb-20 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200 ${documentType === 'estimate' ? 'bg-amber-50/30 dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-950'}`}>
      
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-slide-up ${toast.type === 'success' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="font-bold text-sm">{toast.msg}</span>
        </div>
      )}

      <main className="max-w-5xl mx-auto min-h-[90vh]">
        
        {/* VIEW: CREATE */}
        {currentView === 'create' && (
          <div className="animate-in fade-in duration-300">
             
             {/* Header */}
             <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 safe-area-top">
                <div className="max-w-5xl mx-auto px-4 py-3">
                   <div className="flex justify-between items-center mb-4">
                      <h1 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                         {documentType === 'estimate' ? <FilePlus className="w-5 h-5 text-amber-600" /> : <FileText className="w-5 h-5 text-indigo-600" />}
                         {documentType === 'invoice' ? 'New Invoice' : 'New Estimate'}
                      </h1>
                      
                      <div className="flex items-center gap-2">
                         <div className="hidden md:flex gap-2 mr-4 border-r border-slate-200 dark:border-slate-800 pr-4">
                            <button onClick={() => setCurrentView('create')} className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg">Create</button>
                            <button onClick={() => setCurrentView('history')} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">History</button>
                            <button onClick={() => setCurrentView('analytics')} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Stats</button>
                         </div>
                         <button onClick={() => setIsCalcOpen(true)} className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full sm:rounded-lg font-bold text-xs hover:bg-indigo-200 transition flex items-center gap-1">
                            <Calculator className="w-4 h-4" /> <span className="hidden sm:inline">Calc</span>
                         </button>
                         <button onClick={handleNewBill} className="hidden sm:block text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-200 transition">Reset</button>
                         <button onClick={toggleTheme} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">{isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
                         <button onClick={() => setIsProfileModalOpen(true)} className="p-1 bg-indigo-100 dark:bg-indigo-900 rounded-full text-indigo-600 dark:text-indigo-300"><User className="w-5 h-5" /></button>
                      </div>
                   </div>
                   
                   <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl relative">
                      <div className={`absolute top-1 bottom-1 w-1/3 bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-all duration-300 ease-in-out ${createStep === 'parties' ? 'left-1' : createStep === 'items' ? 'left-[33.33%]' : 'left-[66.66%]'}`}></div>
                      <button onClick={() => setCreateStep('parties')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${createStep === 'parties' ? 'text-indigo-600 dark:text-white' : 'text-slate-500'}`}>1. {t.stepParties}</button>
                      <button onClick={() => validateAndNext('items')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${createStep === 'items' ? 'text-indigo-600 dark:text-white' : 'text-slate-500'}`}>2. {t.stepItems}</button>
                      <button onClick={() => validateAndNext('summary')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${createStep === 'summary' ? 'text-indigo-600 dark:text-white' : 'text-slate-500'}`}>3. {t.stepSummary}</button>
                   </div>
                </div>
             </div>

             <div className="p-4 space-y-6">
                
                {/* STEP 1: PARTIES */}
                {createStep === 'parties' && (
                   <div className="space-y-6 animate-slide-up">
                      <div className="relative max-w-sm mx-auto sm:mx-0 sm:max-w-full">
                         <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${documentType === 'estimate' ? 'text-amber-600' : 'text-indigo-600'}`}>{documentType === 'estimate' ? <FilePlus className="w-5 h-5" /> : <FileText className="w-5 h-5" />}</div>
                         <select value={documentType} onChange={(e) => setDocumentType(e.target.value as DocumentType)} className={`w-full pl-10 p-4 rounded-xl border-2 appearance-none outline-none font-bold text-lg transition-colors cursor-pointer ${documentType === 'estimate' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200' : 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-200'}`}>
                            <option value="invoice">{t.modeInvoice}</option>
                            <option value="estimate">{t.modeEstimate}</option>
                         </select>
                         <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${documentType === 'estimate' ? 'text-amber-600' : 'text-indigo-600'}`} />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="card p-5 space-y-4">
                           <div className="flex justify-between items-center">
                              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-500" /> {t.contractorDetails}</h3>
                              <div className="flex gap-1">
                                 <button onClick={() => setContractor({...contractor, name: '', companyName: '', logo: ''})} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"><FilePlus className="w-4 h-4"/></button>
                                 <select onChange={(e) => { const prof = getProfiles().find(p => p.id === e.target.value); if(prof) { setContractor(prof.details); setSelectedProfileId(prof.id); }}} value={selectedProfileId} className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1.5 px-2 font-medium w-32 truncate">
                                    <option value="">Load Profile...</option>
                                    {getProfiles().map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                 </select>
                              </div>
                           </div>
                           <div className="grid gap-3">
                              <select value={contractor.businessCategory || ''} onChange={(e) => setContractor({...contractor, businessCategory: e.target.value})} className="input-field">
                                 <option value="">Select Business Category</option>
                                 {BUSINESS_CATEGORIES.map(grp => (<optgroup key={grp.name} label={grp.name}>{grp.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</optgroup>))}
                              </select>
                              <input type="text" placeholder={t.company} value={contractor.companyName} onChange={e => setContractor({...contractor, companyName: e.target.value})} className="input-field" />
                              <input type="text" placeholder={t.name} value={contractor.name} onChange={e => setContractor({...contractor, name: e.target.value})} className="input-field" />
                              <div className="grid grid-cols-2 gap-3">
                                 <input type="text" placeholder={t.phone} value={contractor.phone} onChange={e => setContractor({...contractor, phone: e.target.value})} className="input-field" inputMode="tel" />
                                 <input type="text" placeholder={t.gstin} value={contractor.gstin || ''} onChange={e => setContractor({...contractor, gstin: e.target.value.toUpperCase()})} className="input-field" />
                              </div>
                              <input type="email" placeholder={t.email} value={contractor.email} onChange={e => setContractor({...contractor, email: e.target.value})} className="input-field" />
                              <input type="text" placeholder="Website" value={contractor.website} onChange={e => setContractor({...contractor, website: e.target.value})} className="input-field" />
                              <div className="flex justify-between items-center pt-2">
                                 <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg relative overflow-hidden"><Upload className="w-3 h-3" /> {contractor.logo ? 'Change Logo' : 'Upload Logo'}<input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { const file = e.target.files?.[0]; if(file) { const reader = new FileReader(); reader.onloadend = () => setContractor({...contractor, logo: reader.result as string}); reader.readAsDataURL(file); }}} /></button>
                                 <button onClick={() => { const saved = saveProfile(contractor, undefined, 'auto'); setSelectedProfileId(saved.id); showToast(t.profileSaved); }} className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-indigo-600 transition"><Save className="w-3 h-3" /> {t.saveProfile}</button>
                              </div>
                           </div>
                        </div>

                        <div className="card p-5 space-y-4">
                           <div className="flex justify-between items-center">
                              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><User className="w-5 h-5 text-indigo-500" /> {t.clientDetails}</h3>
                              <select onChange={(e) => { const prof = getClientProfiles().find(p => p.id === e.target.value); if(prof) { setClient(prof.details); setSelectedClientId(prof.id); }}} value={selectedClientId} className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1.5 px-2 font-medium w-32 truncate">
                                 <option value="">Load Client...</option>
                                 {getClientProfiles().filter(p => !p.contractorId || p.contractorId === selectedProfileId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                           </div>
                           <div className="grid gap-3">
                              <input type="text" placeholder="Client Name" value={client.name} onChange={e => setClient({...client, name: e.target.value})} className="input-field" />
                              <input type="text" placeholder="Phone Number" value={client.phone} onChange={e => setClient({...client, phone: e.target.value})} className="input-field" inputMode="tel" />
                              <textarea placeholder="Address / Site Location" value={client.address} onChange={e => setClient({...client, address: e.target.value})} className="input-field min-h-[80px]" />
                              <div className="flex justify-end pt-2">
                                 <button onClick={() => { const saved = saveClientProfile(client, selectedProfileId); setSelectedClientId(saved.id); showToast(t.clientSaved); }} className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-indigo-600 transition"><Save className="w-3 h-3" /> {t.saveClient}</button>
                              </div>
                           </div>
                        </div>
                        
                        <div className="card p-5 flex items-center justify-between">
                           <div>
                              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Project Expenses</h3>
                              <p className="text-xs text-slate-500">Add transport, labor, or lump sum costs</p>
                           </div>
                           <button onClick={() => setIsExpensesOpen(true)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 transition flex items-center gap-2"><Wallet className="w-4 h-4"/> Manage Costs</button>
                        </div>
                      </div>

                      <button onClick={() => validateAndNext('items')} className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2">Next: Add Items <ArrowRight className="w-5 h-5" /></button>
                   </div>
                )}

                {/* STEP 2: ITEMS */}
                {createStep === 'items' && (
                   <div className="space-y-4 animate-slide-up">
                      <div className="sticky top-[130px] z-20 bg-slate-900 text-white p-3 rounded-xl shadow-lg flex justify-between items-center mb-4">
                         <div className="text-xs text-slate-300 font-medium">{items.length} Items Added</div>
                         <div className="text-xl font-bold">₹{items.reduce((s,i) => s+i.amount, 0).toFixed(0)}</div>
                      </div>

                      <div className="card overflow-hidden">
                         <div className="bg-slate-50 dark:bg-slate-800/50 p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsAddItemOpen(!isAddItemOpen)}>
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">{editingId ? <Pencil className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4 text-indigo-500" />} {editingId ? 'Edit Item' : 'Add New Item'}</h3>
                            {isAddItemOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                         </div>
                         
                         {isAddItemOpen && (
                            <div className="p-4 space-y-4">
                               <div className="grid grid-cols-12 gap-3">
                                  <div className={`${showFloorInput ? 'col-span-6 sm:col-span-2' : 'col-span-12 sm:col-span-2'}`}>
                                     <select className="input-field text-center font-bold" value={currentItem.unit} onChange={(e) => setCurrentItem({...currentItem, unit: e.target.value})}>
                                        <optgroup label="Recommended">{getPriorityUnits().map(u => { const unitObj = CONSTRUCTION_UNITS.find(cu => cu.value === u); return unitObj ? <option key={u} value={u}>{unitObj.label}</option> : null; })}</optgroup>
                                        <optgroup label="Others">{CONSTRUCTION_UNITS.filter(u => !getPriorityUnits().includes(u.value)).map(u => (<option key={u.value} value={u.value}>{u.label}</option>))}</optgroup>
                                     </select>
                                  </div>
                                  
                                  {showFloorInput && (
                                     <div className="col-span-6 sm:col-span-2">
                                        <input type="text" className="input-field" placeholder="Floor" list="floors" value={currentItem.floor} onChange={e => setCurrentItem({...currentItem, floor: e.target.value})} />
                                        <datalist id="floors">{Object.values(APP_TEXT.floors).map(f => <option key={f} value={f} />)}</datalist>
                                     </div>
                                  )}

                                  <div className={`${showFloorInput ? 'col-span-12 sm:col-span-4' : 'col-span-12 sm:col-span-6'} relative`}>
                                     <input type="text" placeholder={t.description} value={currentItem.description} onChange={(e) => { const val = e.target.value; setCurrentItem({...currentItem, description: val}); if (val.length > 1) { const matches = AUTO_SUGGEST_ITEMS.filter(i => i.toLowerCase().includes(val.toLowerCase())).slice(0, 5); setSuggestions(matches); setShowSuggestions(true); } else { setShowSuggestions(false); }}} onFocus={() => { if(currentItem.description) setShowSuggestions(true); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} className="input-field" />
                                     {showSuggestions && suggestions.length > 0 && (
                                        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                           {suggestions.map((s, i) => (<li key={i} className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm font-medium" onClick={() => setCurrentItem({...currentItem, description: s})}>{s}</li>))}
                                        </ul>
                                     )}
                                  </div>

                                  {isConstructionMode && (
                                     <>
                                        <div className="col-span-4 sm:col-span-2"><input type="number" placeholder="L" className="input-field text-center" value={currentItem.length || ''} onChange={e => setCurrentItem({...currentItem, length: parseFloat(e.target.value)})} /></div>
                                        <div className="col-span-4 sm:col-span-2"><input type="number" placeholder="W" className="input-field text-center" value={currentItem.width || ''} onChange={e => setCurrentItem({...currentItem, width: parseFloat(e.target.value)})} /></div>
                                        {['cu.ft', 'cu.mt', 'brass'].includes(currentItem.unit) && (
                                           <div className="col-span-4 sm:col-span-2"><input type="number" placeholder="H" className="input-field text-center" value={currentItem.height || ''} onChange={e => setCurrentItem({...currentItem, height: parseFloat(e.target.value)})} /></div>
                                        )}
                                        {!['cu.ft','brass'].includes(currentItem.unit) && ['sq.ft','sq.mt'].includes(currentItem.unit) && (
                                           <div className="col-span-4 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-xs font-bold text-slate-500 md:hidden">{calculateItemArea(currentItem.length, currentItem.width, 0, currentItem.unit, 1).toFixed(1)}</div>
                                        )}
                                     </>
                                  )}

                                  <div className="col-span-6 sm:col-span-2">
                                     <label className="text-[10px] uppercase font-bold text-slate-400 pl-1 block sm:hidden">Qty</label>
                                     <input type="number" className="input-field font-bold text-lg" placeholder="Qty" value={currentItem.quantity || ''} onChange={e => setCurrentItem({...currentItem, quantity: parseFloat(e.target.value)})} onFocus={e => e.target.select()} />
                                  </div>
                                  <div className="col-span-6 sm:col-span-2">
                                     <label className="text-[10px] uppercase font-bold text-slate-400 pl-1 block sm:hidden">Rate</label>
                                     <input type="number" className="input-field font-bold text-lg" placeholder="Rate" value={currentItem.rate || ''} onChange={e => setCurrentItem({...currentItem, rate: parseFloat(e.target.value)})} onFocus={e => e.target.select()} />
                                  </div>

                                  <div className="col-span-4 sm:col-span-2 flex items-end">
                                     <button onClick={() => setIsVoiceOpen(true)} className="w-full h-[50px] rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><Mic className="w-6 h-6" /></button>
                                  </div>
                                  
                                  <div className="col-span-8 sm:col-span-4">
                                     <div className="bg-black dark:bg-slate-950 rounded-xl p-3 flex justify-between items-center h-[50px]">
                                        <span className="text-slate-400 text-xs font-bold uppercase">Amount</span>
                                        <span className="text-green-400 text-xl font-mono font-bold">{calculateAmount(currentItem.length, currentItem.width, currentItem.height || 0, currentItem.quantity, currentItem.rate, currentItem.unit)}</span>
                                     </div>
                                  </div>
                                  
                                  <div className="col-span-12 mt-2">
                                     <button onClick={handleAddItem} className="w-full btn-primary py-3.5 text-lg">{editingId ? t.updateItem : t.confirm}</button>
                                  </div>
                               </div>
                            </div>
                         )}
                      </div>

                      <div className="space-y-3 pb-20">
                         {items.length === 0 ? (
                            <div className="text-center py-10 text-slate-400"><FilePlus className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>{t.emptyList}</p></div>
                         ) : (
                            items.map((item) => (
                               <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 relative group">
                                  <div className="flex justify-between items-start mb-2">
                                     <div>
                                        <h4 className="font-bold text-slate-800 dark:text-white text-lg">{item.description}</h4>
                                        <div className="text-xs text-slate-500 font-medium mt-1">
                                           {item.floor && <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-2">{item.floor}</span>}
                                           {['sq.ft','cu.ft','brass'].includes(item.unit) && (<span>{item.length} x {item.width} {item.height ? `x ${item.height}` : ''}</span>)}
                                        </div>
                                     </div>
                                     <div className="text-right">
                                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{item.amount}</div>
                                        <div className="text-xs text-slate-400">{item.quantity} {item.unit} x {item.rate}</div>
                                     </div>
                                  </div>
                                  <div className="flex justify-end gap-3 mt-3 border-t border-slate-100 dark:border-slate-800 pt-2">
                                     <button onClick={() => handleEditItem(item)} className="p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                     <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                               </div>
                            ))
                         )}
                      </div>
                      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none md:hidden">
                         <button onClick={() => validateAndNext('summary')} className="w-full max-w-4xl mx-auto btn-primary py-3.5 shadow-xl pointer-events-auto flex items-center justify-center gap-2">Next: Summary <ArrowRight className="w-5 h-5" /></button>
                      </div>
                   </div>
                )}

                {/* STEP 3: SUMMARY */}
                {createStep === 'summary' && (
                   <div className="space-y-6 animate-slide-up pb-24">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="card p-4 grid grid-cols-2 gap-4">
                           <div><label className="text-xs font-bold text-slate-400 uppercase">Bill No</label><input type="text" value={billNumber} onChange={e => setBillNumber(e.target.value)} className="input-field font-mono" /></div>
                           <div><label className="text-xs font-bold text-slate-400 uppercase">Date</label><input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="input-field" /></div>
                        </div>
                        <div className="card p-5">
                           <div className="flex justify-between mb-2"><span className="text-slate-600 dark:text-slate-400 font-medium">{t.subTotal}</span><span className="font-bold">₹{getTotals().subTotal.toFixed(2)}</span></div>
                           <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center gap-2"><input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} className="w-4 h-4 accent-indigo-600" /><span className="text-sm font-medium">{t.addGst}</span>{gstEnabled && (<input type="number" value={gstRate} onChange={e => setGstRate(parseFloat(e.target.value))} className="w-12 p-1 text-center border rounded text-xs font-bold" />)}</div>
                              {gstEnabled && <span>₹{getTotals().gst.toFixed(2)}</span>}
                           </div>
                           <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center"><span className="text-lg font-bold">{t.grandTotal}</span><span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">₹{getTotals().grandTotal.toFixed(0)}</span></div>
                        </div>
                      </div>

                      {documentType === 'invoice' && (
                         <div className="card p-5">
                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold flex items-center gap-2"><Wallet className="w-5 h-5 text-green-600" /> Payments Received</h3><button onClick={() => { const amt = prompt("Enter Amount"); if(amt) setPayments([...payments, { id: Date.now().toString(), amount: parseFloat(amt), date: new Date().toISOString(), notes: 'Advance' }]); }} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-bold hover:bg-green-100">+ Add</button></div>
                            <div className="space-y-2 mb-4">{payments.map(p => (<div key={p.id} className="flex justify-between text-sm"><span>{new Date(p.date).toLocaleDateString()} - {p.notes}</span><div className="flex items-center gap-2"><span className="font-bold text-green-600">-₹{p.amount}</span><button onClick={() => setPayments(payments.filter(px => px.id !== p.id))}><X className="w-3 h-3 text-slate-400" /></button></div></div>))}</div>
                            <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800"><span className="font-bold text-slate-600 dark:text-slate-400">{t.balanceDue}</span><span className="text-xl font-bold text-red-500">₹{getTotals().balance.toFixed(0)}</span></div>
                         </div>
                      )}

                      <div className="card p-5">
                         <div className="flex items-center gap-2 mb-4"><input type="checkbox" checked={includeBankDetails} onChange={e => setIncludeBankDetails(e.target.checked)} className="w-5 h-5 accent-indigo-600" /><h3 className="font-bold flex items-center gap-2"><Landmark className="w-5 h-5 text-slate-600" /> Include Bank Details</h3></div>
                         {includeBankDetails && (
                            <div className="space-y-3 animate-fade-in grid md:grid-cols-2 gap-4">
                               <div className="md:col-span-2"><input type="text" placeholder="Account Name" value={contractor.bankDetails?.holderName || ''} onChange={e => setContractor({...contractor, bankDetails: {...contractor.bankDetails!, holderName: e.target.value}})} className="input-field" /></div>
                               <input type="text" placeholder="Account No" value={contractor.bankDetails?.accountNumber || ''} onChange={e => setContractor({...contractor, bankDetails: {...contractor.bankDetails!, accountNumber: e.target.value}})} className="input-field" />
                               <input type="text" placeholder="IFSC Code" value={contractor.bankDetails?.ifscCode || ''} onChange={e => setContractor({...contractor, bankDetails: {...contractor.bankDetails!, ifscCode: e.target.value.toUpperCase()}})} className="input-field" />
                               <input type="text" placeholder="Bank Name" value={contractor.bankDetails?.bankName || ''} onChange={e => setContractor({...contractor, bankDetails: {...contractor.bankDetails!, bankName: e.target.value}})} className="input-field" />
                               <input type="text" placeholder="UPI ID (Optional)" value={contractor.bankDetails?.upiId || ''} onChange={e => setContractor({...contractor, bankDetails: {...contractor.bankDetails!, upiId: e.target.value}})} className="input-field" />
                               <div className="pt-2 md:col-span-2"><label className="text-xs font-bold text-slate-400 mb-2 block">Payment QR Code</label>{contractor.upiQrCode ? (<div className="relative w-24 h-24 border rounded-xl overflow-hidden"><img src={contractor.upiQrCode} className="w-full h-full object-cover" alt="QR" /><button onClick={() => setContractor({...contractor, upiQrCode: ''})} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button></div>) : (<label className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50"><QrCode className="w-6 h-6 mb-1" /><span className="text-[10px]">Upload</span><input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = () => setContractor({...contractor, upiQrCode: r.result as string}); r.readAsDataURL(f); }}} /></label>)}</div>
                            </div>
                         )}
                      </div>
                      <button onClick={() => setIsShareOpen(true)} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg active:scale-95 transition"><Share2 className="w-6 h-6" /> Export / Share Bill</button>
                   </div>
                )}
             </div>
          </div>
        )}

        {/* OTHER VIEWS */}
        {currentView === 'history' && <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto mt-10"/>}><HistoryModal isOpen={true} onClose={() => setCurrentView('create')} history={getHistory()} trash={[]} onLoad={(bill) => { loadBillData(bill); setCurrentView('create'); }} onDelete={(id) => { deleteFromHistory(id); setCurrentView('history'); }} onRestore={() => {}} onPermanentDelete={() => {}} onUpdateStatus={updateBillStatus} onUpdateEstimateStatus={updateEstimateStatus} onConvertToInvoice={() => {}} /></Suspense>}
        {currentView === 'analytics' && <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto mt-10"/>}><DashboardModal isOpen={true} onClose={() => setCurrentView('create')} history={getHistory()} /></Suspense>}
        {currentView === 'profile' && user && <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto mt-10"/>}><ProfileModal isOpen={true} onClose={() => setCurrentView('create')} user={user} planDetails={{ name: access.isTrial ? 'Free Trial' : 'Premium', expiry: '3 Days' }} onLogout={() => { logoutUser(); setUser(null); }} onBackup={async () => { setIsSyncing(true); await backupToDrive(); setIsSyncing(false); showToast("Backup Done"); }} onRestore={async () => { setIsSyncing(true); await restoreFromDrive(); setIsSyncing(false); }} onUpgrade={() => setShowSubscription(true)} isSyncing={isSyncing} /></Suspense>}

      </main>

      {/* MOBILE NAV BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-40 safe-area-bottom md:hidden">
         <div className="max-w-4xl mx-auto flex justify-around items-center h-16">
            <button onClick={() => setCurrentView('create')} className={`flex flex-col items-center gap-1 w-16 ${currentView === 'create' ? 'text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}><FilePlus className="w-6 h-6" /><span className="text-[10px] font-bold">Create</span></button>
            <button onClick={() => setCurrentView('history')} className={`flex flex-col items-center gap-1 w-16 ${currentView === 'history' ? 'text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}><Clock className="w-6 h-6" /><span className="text-[10px] font-bold">History</span></button>
            <div className="relative -top-6"><button onClick={() => setIsCalcOpen(true)} className="w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition"><Calculator className="w-7 h-7" /></button></div>
            <button onClick={() => setCurrentView('analytics')} className={`flex flex-col items-center gap-1 w-16 ${currentView === 'analytics' ? 'text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}><PieChart className="w-6 h-6" /><span className="text-[10px] font-bold">Stats</span></button>
            <button onClick={() => setCurrentView('profile')} className={`flex flex-col items-center gap-1 w-16 ${currentView === 'profile' ? 'text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}><Menu className="w-6 h-6" /><span className="text-[10px] font-bold">Menu</span></button>
         </div>
      </nav>

      {/* OVERLAYS */}
      <Suspense fallback={null}>
         <VoiceEntryModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} onConfirm={(item) => { setCurrentItem({...currentItem, ...item, amount: calculateAmount(item.length, item.width, item.height || 0, item.quantity, item.rate, item.unit)}); setIsVoiceOpen(false); }} />
         <CalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
         <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} documentType={documentType} previewText={`Bill from ${contractor.companyName}`} onShareText={() => {}} onSharePdf={async (s) => handleExport('pdf', s, 'share')} onShareExcel={async (s) => handleExport('excel', s, 'share')} onDownloadPdf={(s) => handleExport('pdf', s, 'download')} onDownloadExcel={(s) => handleExport('excel', s, 'download')} onPrint={handlePrint} />
         <ExpensesModal isOpen={isExpensesOpen} onClose={() => setIsExpensesOpen(false)} expenses={expenses} onAddExpense={(e) => setExpenses([...expenses, e])} onDeleteExpense={(id) => setExpenses(expenses.filter(e => e.id !== id))} onSetExpenses={(exps) => setExpenses(exps)} billTotal={getTotals().grandTotal} />
         {showSubscription && <SubscriptionPlans onSuccess={(u) => { setUser(u); setShowSubscription(false); }} onBack={() => setShowSubscription(false)} planId={user.planId || undefined} />}
      </Suspense>
    </div>
  );
};