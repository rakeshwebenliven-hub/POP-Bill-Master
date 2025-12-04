import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, X, Calculator, Pencil, Clock, Save, Search, 
  AlertCircle, Image as ImageIcon, Upload, Share2, Users, QrCode, 
  FilePlus, Moon, Sun, Mic, Building2, LogOut, Crown, Cloud, 
  RefreshCw, CheckCircle2, User, ChevronRight, Loader2, FileText, 
  LayoutList, Contact, FileCheck, Wallet, PieChart, ChevronLeft, 
  Menu, Settings, Check, ArrowRight, Home, ChevronDown, ChevronUp, 
  Landmark, Trash 
} from 'lucide-react';
import { APP_TEXT, CONSTRUCTION_UNITS, AUTO_SUGGEST_ITEMS, BUSINESS_CATEGORIES } from './constants';
import { 
  BillItem, ClientDetails, ContractorDetails, SavedBillData, 
  PaymentRecord, ExpenseRecord, DocumentType, ParsedBillItem, 
  UserProfile, PaymentStatus, EstimateStatus 
} from './types';
import { 
  saveToHistory, getHistory, getTrash, deleteFromHistory, 
  restoreFromTrash, permanentDelete, updateBillStatus, 
  updateEstimateStatus, saveProfile, getProfiles, saveClientProfile, 
  getClientProfiles, saveDraft, loadDraft, clearDraft, deleteProfile, deleteClientProfile 
} from './services/storageService';
import { generatePDF } from './services/pdfService';
import { generateExcel } from './services/excelService';
import { getCurrentUser, checkSubscriptionAccess, logoutUser } from './services/authService';
import { backupToDrive, restoreFromDrive } from './services/googleDriveService';

// Components
import VoiceEntryModal from './components/VoiceEntryModal';
import HistoryModal from './components/HistoryModal';
import CalculatorModal from './components/CalculatorModal';
import ShareModal from './components/ShareModal';
import ExpensesModal from './components/ExpensesModal';
import DashboardModal from './components/DashboardModal';
import ProfileModal from './components/ProfileModal';
import SubscriptionPlans from './components/SubscriptionPlans';
import OnboardingFlow from './components/OnboardingFlow';

const EMPTY_CONTRACTOR: ContractorDetails = {
  name: '', companyName: '', phone: '', email: '', website: '', socialLinks: [], logo: '', upiQrCode: ''
};

const EMPTY_CLIENT: ClientDetails = {
  name: '', phone: '', address: ''
};

export const App = () => {
  const t = APP_TEXT;

  // Auth & User State
  const [user, setUser] = useState<UserProfile | null>(getCurrentUser());
  const [subscription, setSubscription] = useState(checkSubscriptionAccess());
  const [showSubscription, setShowSubscription] = useState(false);

  // App State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [createStep, setCreateStep] = useState<'parties' | 'items' | 'summary'>('parties');
  
  // Bill State
  const [documentType, setDocumentType] = useState<DocumentType>('invoice');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractor, setContractor] = useState<ContractorDetails>(EMPTY_CONTRACTOR);
  const [client, setClient] = useState<ClientDetails>(EMPTY_CLIENT);
  const [items, setItems] = useState<BillItem[]>([]);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(18);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  
  // Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  // Initial Load
  useEffect(() => {
    // Check Theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    // Load Draft if exists
    const draft = loadDraft();
    if (draft) {
      loadBillData(draft);
    }

    // Load Default Profile if exists
    const profiles = getProfiles();
    if (profiles.length > 0 && !draft) {
      setContractor(profiles[0].details);
    }
  }, []);

  // Save Draft on change
  useEffect(() => {
    if (items.length > 0 || client.name) {
      saveDraft({
        billNumber,
        billDate,
        contractor,
        client,
        items,
        gstEnabled,
        gstRate,
        paymentStatus: 'Pending',
        advanceAmount: '', // Legacy field
        payments,
        expenses,
        disclaimer,
        type: documentType,
        originalId: currentBillId
      });
    }
  }, [items, client, contractor, billNumber, billDate, gstEnabled, gstRate, payments, expenses, disclaimer, documentType, currentBillId]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleNewBill = () => {
    if (window.confirm("Start new bill? Unsaved changes will be cleared.")) {
      clearDraft();
      setCurrentBillId(null);
      setItems([]);
      setClient(EMPTY_CLIENT);
      setPayments([]);
      setExpenses([]);
      setBillNumber('');
      setBillDate(new Date().toISOString().split('T')[0]);
      setCreateStep('parties');
    }
  };

  const validateAndNext = (step: 'items' | 'summary') => {
    if (step === 'items') {
      if (!client.name) {
        alert("Please enter client name");
        return;
      }
      setCreateStep('items');
    } else if (step === 'summary') {
      if (items.length === 0) {
        alert("Please add at least one item");
        return;
      }
      setCreateStep('summary');
    }
  };

  const loadBillData = (data: SavedBillData) => {
    setCurrentBillId(data.id || null);
    setDocumentType(data.type || 'invoice');
    setBillNumber(data.billNumber);
    setBillDate(data.billDate || new Date().toISOString().split('T')[0]);
    setContractor(data.contractor);
    setClient(data.client);
    setItems(data.items);
    setGstEnabled(data.gstEnabled);
    setGstRate(data.gstRate || 18);
    setPayments(data.payments || []);
    setExpenses(data.expenses || []);
    setDisclaimer(data.disclaimer);
  };

  if (!user) {
    return <OnboardingFlow onComplete={setUser} />;
  }

  // Determine Subscription State
  if (!subscription.hasAccess && !showSubscription) {
    return (
       <SubscriptionPlans 
          onSuccess={(u) => { setUser(u); setSubscription(checkSubscriptionAccess()); }} 
          planId={user.planId || undefined}
       />
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 ${isDarkMode ? 'dark' : ''}`}>
             
             {/* 3-Step Wizard Header */}
             <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 safe-area-top">
                <div className="max-w-4xl mx-auto px-4 py-3">
                   <div className="flex justify-between items-center mb-4">
                      <h1 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                         {documentType === 'estimate' ? <FilePlus className="w-5 h-5 text-amber-600" /> : <FileText className="w-5 h-5 text-indigo-600" />}
                         {documentType === 'invoice' ? 'New Invoice' : 'New Estimate'}
                      </h1>
                      <div className="flex gap-2">
                         <button onClick={() => setIsCalcOpen(true)} className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full font-bold text-xs hover:bg-indigo-200 transition">
                            <Calculator className="w-3.5 h-3.5" /> Calc
                         </button>
                         <button onClick={handleNewBill} className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition">Reset</button>
                         <button onClick={toggleTheme} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">{isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
                         <button onClick={() => setIsProfileModalOpen(true)} className="p-1 bg-indigo-100 dark:bg-indigo-900 rounded-full text-indigo-600 dark:text-indigo-300"><User className="w-5 h-5" /></button>
                      </div>
                   </div>
                   
                   {/* Step Indicator */}
                   <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl relative">
                      {/* Animated Background */}
                      <div 
                        className={`absolute top-1 bottom-1 w-1/3 bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-all duration-300 ease-in-out ${
                           createStep === 'parties' ? 'left-1' : createStep === 'items' ? 'left-[33.33%]' : 'left-[66.66%]'
                        }`}
                      ></div>
                      
                      <button onClick={() => setCreateStep('parties')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${createStep === 'parties' ? 'text-indigo-600 dark:text-white' : 'text-slate-500'}`}>1. {t.stepParties}</button>
                      <button onClick={() => validateAndNext('items')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${createStep === 'items' ? 'text-indigo-600 dark:text-white' : 'text-slate-500'}`}>2. {t.stepItems}</button>
                      <button onClick={() => validateAndNext('summary')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${createStep === 'summary' ? 'text-indigo-600 dark:text-white' : 'text-slate-500'}`}>3. {t.stepSummary}</button>
                   </div>
                </div>
             </div>

            {/* Main Content Area */}
            <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
                {createStep === 'parties' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                         <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                             <h3 className="font-bold text-slate-800 dark:text-white mb-4">Client Details</h3>
                             <input 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl mb-3 border border-slate-200 dark:border-slate-700 outline-none"
                                placeholder="Client Name"
                                value={client.name}
                                onChange={e => setClient({...client, name: e.target.value})}
                             />
                             <input 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl mb-3 border border-slate-200 dark:border-slate-700 outline-none"
                                placeholder="Phone Number"
                                value={client.phone}
                                onChange={e => setClient({...client, phone: e.target.value})}
                             />
                             <textarea 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                                placeholder="Address"
                                value={client.address}
                                onChange={e => setClient({...client, address: e.target.value})}
                             />
                         </div>

                         <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                             <h3 className="font-bold text-slate-800 dark:text-white mb-4">Document Details</h3>
                             <div className="flex gap-3 mb-4">
                                <button 
                                  onClick={() => setDocumentType('invoice')}
                                  className={`flex-1 py-3 rounded-xl font-bold border transition ${documentType === 'invoice' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                >
                                  Tax Invoice
                                </button>
                                <button 
                                  onClick={() => setDocumentType('estimate')}
                                  className={`flex-1 py-3 rounded-xl font-bold border transition ${documentType === 'estimate' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                >
                                  Estimate / Quote
                                </button>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Number</label>
                                    <input 
                                        className="w-full p-3 mt-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold"
                                        placeholder="Auto"
                                        value={billNumber}
                                        onChange={e => setBillNumber(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Date</label>
                                    <input 
                                        type="date"
                                        className="w-full p-3 mt-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold"
                                        value={billDate}
                                        onChange={e => setBillDate(e.target.value)}
                                    />
                                </div>
                             </div>
                         </div>
                         
                         <button onClick={() => validateAndNext('items')} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition">
                            Next: Add Items
                         </button>
                    </div>
                )}

                {createStep === 'items' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-center">
                             {items.length === 0 ? (
                                 <div className="py-8">
                                     <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                         <Plus className="w-8 h-8 text-slate-400" />
                                     </div>
                                     <p className="text-slate-500 mb-4">No items added yet</p>
                                     <button onClick={() => setIsVoiceOpen(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition">
                                        <Mic className="w-5 h-5 inline mr-2" /> Add Item via Voice
                                     </button>
                                 </div>
                             ) : (
                                 <div className="space-y-3">
                                     {items.map((item, idx) => (
                                         <div key={idx} className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                             <span>{item.description}</span>
                                             <span className="font-bold">₹{item.amount}</span>
                                         </div>
                                     ))}
                                     <button onClick={() => setIsVoiceOpen(true)} className="w-full py-3 mt-4 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition">
                                        + Add Another Item
                                     </button>
                                 </div>
                             )}
                         </div>

                         <div className="flex gap-3">
                            <button onClick={() => setCreateStep('parties')} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl">Back</button>
                            <button onClick={() => validateAndNext('summary')} className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition">Next: Summary</button>
                         </div>
                    </div>
                )}

                {createStep === 'summary' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                             <h3 className="font-bold text-slate-800 dark:text-white mb-4">Bill Summary</h3>
                             <div className="flex justify-between mb-2">
                                 <span className="text-slate-500">Sub Total</span>
                                 <span className="font-bold">₹{items.reduce((acc, i) => acc + i.amount, 0)}</span>
                             </div>
                         </div>
                         <button onClick={() => alert("Saved!")} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition">
                            <Save className="w-5 h-5 inline mr-2" /> Save & Share
                         </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
            <VoiceEntryModal 
                isOpen={isVoiceOpen} 
                onClose={() => setIsVoiceOpen(false)} 
                onConfirm={(item) => {
                    const newItem: BillItem = {
                        ...item,
                        id: Date.now().toString(),
                        amount: item.quantity * item.rate, // Simplified logic
                        unit: item.unit
                    };
                    setItems([...items, newItem]);
                    setIsVoiceOpen(false);
                }} 
            />
            <ProfileModal 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)}
                user={user}
                planDetails={{ name: user.planId === 'trial' ? 'Free Trial' : 'Premium', expiry: new Date(user.trialEndDate).toLocaleDateString() }}
                onLogout={() => { logoutUser(); setUser(null); }}
                onBackup={async () => { setIsSyncing(true); await backupToDrive(); setIsSyncing(false); }}
                onRestore={async () => { setIsSyncing(true); await restoreFromDrive(); setIsSyncing(false); }}
                onUpgrade={() => setShowSubscription(true)}
                isSyncing={isSyncing}
            />

            {showSubscription && (
                <div className="fixed inset-0 z-[60] bg-white dark:bg-slate-950">
                    <SubscriptionPlans 
                        onSuccess={(u) => { setUser(u); setShowSubscription(false); }}
                        onBack={() => setShowSubscription(false)}
                        planId={user.planId || undefined}
                    />
                </div>
            )}
    </div>
  );
}
