
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Plus, Trash2, X, Calculator, Pencil, Clock, Save, Search, AlertCircle, Image as ImageIcon, Upload, Share2, Users, QrCode, FilePlus, Moon, Sun, Mic, Building2, LogOut, Crown, Cloud, RefreshCw, CheckCircle2, User, ChevronRight, Loader2, FileText, LayoutList, Contact, FileCheck, Wallet, PieChart } from 'lucide-react';
import { BillItem, ClientDetails, ContractorDetails, SavedBillData, SocialLink, SocialPlatform, ContractorProfile, PaymentStatus, PaymentRecord, ParsedBillItem, UserProfile, ClientProfile, DocumentType, EstimateStatus, ExpenseRecord } from './types';
import { APP_TEXT, SUBSCRIPTION_PLANS, CONSTRUCTION_UNITS, AUTO_SUGGEST_ITEMS } from './constants';
import { generateExcel } from './services/excelService';
import { generatePDF } from './services/pdfService';
import { saveDraft, loadDraft, saveToHistory, getHistory, deleteFromHistory, saveProfile, getProfiles, deleteProfile, updateBillStatus, getTrash, restoreFromTrash, permanentDelete, saveClientProfile, getClientProfiles, deleteClientProfile, updateEstimateStatus } from './services/storageService';
import { getCurrentUser, checkSubscriptionAccess, logoutUser } from './services/authService';
import { initGoogleDrive, backupToDrive, restoreFromDrive } from './services/googleDriveService';

// Lazy Loaded Components
const HistoryModal = lazy(() => import('./components/HistoryModal'));
const CalculatorModal = lazy(() => import('./components/CalculatorModal'));
const VoiceEntryModal = lazy(() => import('./components/VoiceEntryModal'));
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow'));
const SubscriptionPlans = lazy(() => import('./components/SubscriptionPlans'));
const ShareModal = lazy(() => import('./components/ShareModal'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));
const ExpensesModal = lazy(() => import('./components/ExpensesModal'));
const DashboardModal = lazy(() => import('./components/DashboardModal'));

interface SwipeableItemProps {
  item: BillItem;
  index: number;
  onDelete: (id: string) => void;
  onEdit: (item: BillItem) => void;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({ 
  item, 
  index, 
  onDelete, 
  onEdit 
}) => {
  const [startX, setStartX] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const threshold = -100;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    if (diff < 0) {
      setOffsetX(diff);
    }
  };

  const handleTouchEnd = () => {
    if (offsetX < threshold) {
      onDelete(item.id);
    } 
    setOffsetX(0);
    setStartX(null);
    setIsSwiping(false);
  };

  return (
    <div className="relative overflow-hidden mb-0">
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end px-6 rounded-none sm:rounded-lg">
        <Trash2 className="w-6 h-6 text-white" />
      </div>

      <div 
        className={`relative bg-white dark:bg-slate-900 p-4 border-b sm:border border-slate-100 dark:border-slate-800 sm:rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex justify-between items-start group ${isSwiping ? '' : 'transition-transform duration-300'}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
          <div className="flex gap-4 w-full">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 flex-wrap mb-1">
                  <span>{item.description}</span>
                  {item.floor && <span className="text-[10px] uppercase font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded tracking-wide">{item.floor}</span>}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(item.unit) && (
                        <span>{item.length} x {item.width} {item.quantity > 1 && <span className="text-indigo-600 dark:text-indigo-400 font-bold">x {item.quantity}</span>} = <span className="font-bold">{(item.length * item.width * (item.quantity || 1)).toFixed(2)}</span></span>
                    )}
                    {['cu.ft', 'cu.mt'].includes(item.unit) && (
                        <span>{item.length}x{item.width}x{item.height} {item.quantity > 1 && <span className="text-indigo-600 dark:text-indigo-400 font-bold">x {item.quantity}</span>} = <span className="font-bold">{(item.length * item.width * (item.height || 0) * (item.quantity || 1)).toFixed(2)}</span></span>
                    )}
                    {item.unit === 'brass' && (
                        <span>{item.length}x{item.width}x{item.height} {item.quantity > 1 && <span className="text-indigo-600 dark:text-indigo-400 font-bold">x {item.quantity}</span>} / 100 = <span className="font-bold">{((item.length * item.width * (item.height || 0) * (item.quantity || 1)) / 100).toFixed(2)}</span></span>
                    )}
                    {['rft', 'r.mt'].includes(item.unit) && (
                        <span>{item.length} {item.quantity > 1 && <span className="text-indigo-600 dark:text-indigo-400 font-bold">x {item.quantity}</span>} = <span className="font-bold">{(item.length * (item.quantity || 1)).toFixed(2)}</span></span>
                    )}
                    {!['sq.ft', 'sq.mt', 'sq.yd', 'acre', 'cu.ft', 'cu.mt', 'brass', 'rft', 'r.mt'].includes(item.unit) && (
                        <span>{item.quantity}</span>
                    )}
                  </span>
                  <span className="text-xs uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{item.unit}</span>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span className="font-medium">@{item.rate}</span>
                </div>
              </div>
          </div>
          <div className="text-right pl-2">
              <div className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">₹{item.amount.toFixed(0)}</div>
              <div className="flex justify-end gap-2 mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg transition"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => onDelete(item.id)} className="p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
              </div>
          </div>
      </div>
    </div>
  );
};

const LoadingFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-lg flex items-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      <span className="font-medium text-slate-700 dark:text-slate-200">Loading...</span>
    </div>
  </div>
);


const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [access, setAccess] = useState<{ hasAccess: boolean; daysLeft: number; isTrial: boolean }>({ hasAccess: false, daysLeft: 0, isTrial: false });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showSubscription, setShowSubscription] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const t = APP_TEXT;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // State
  const [documentType, setDocumentType] = useState<DocumentType>('invoice');
  const [estimateStatus, setEstimateStatus] = useState<EstimateStatus>('Draft');
  
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pending');

  const [contractor, setContractor] = useState<ContractorDetails>({
    name: '',
    companyName: '',
    gstin: '',
    phone: '',
    email: '',
    website: '',
    socialLinks: [],
    accountDetails: '', 
    bankDetails: {
      holderName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
      branchAddress: ''
    },
    logo: '',
    upiQrCode: ''
  });

  const [profiles, setProfiles] = useState<ContractorProfile[]>([]);
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  
  const [client, setClient] = useState<ClientDetails>({
    name: '',
    phone: '',
    address: ''
  });

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState<number>(18);
  const [disclaimer, setDisclaimer] = useState<string>('');
  
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPaymentNote, setNewPaymentNote] = useState('');

  const [items, setItems] = useState<BillItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Auto Suggest State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [currentItem, setCurrentItem] = useState<Partial<BillItem>>({
    description: '',
    length: 0,
    width: 0,
    height: 0,
    quantity: 1,
    rate: 0,
    unit: 'sq.ft',
    floor: ''
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'details' | 'items'>('details');
  const [historyItems, setHistoryItems] = useState<SavedBillData[]>([]);
  const [trashItems, setTrashItems] = useState<SavedBillData[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setAccess(checkSubscriptionAccess());
      setContractor(prev => ({
        ...prev,
        name: prev.name || currentUser.name,
        phone: prev.phone || currentUser.phone,
        email: prev.email || currentUser.email
      }));
    }
    setIsLoadingAuth(false);
    initGoogleDrive().catch(e => console.error("Drive Init Error", e));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return; 
    setAccess(checkSubscriptionAccess());
    setProfiles(getProfiles());
    setClientProfiles(getClientProfiles());
    const draft = loadDraft();
    const history = getHistory();
    setHistoryItems(history);
    setTrashItems(getTrash());
    let nextBillNum = generateNextBillNumber(history, documentType);

    if (draft) {
      setDocumentType(draft.type || 'invoice');
      setEstimateStatus(draft.estimateStatus || 'Draft');
      setContractor({
         ...draft.contractor,
         bankDetails: draft.contractor.bankDetails || {
            holderName: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '', branchAddress: ''
         }
      });
      setClient(draft.client);
      setItems(draft.items);
      setGstEnabled(draft.gstEnabled);
      setGstRate(draft.gstRate || 18);
      setBillNumber(draft.billNumber || nextBillNum);
      setBillDate(draft.billDate || new Date().toISOString().split('T')[0]);
      setPaymentStatus(draft.paymentStatus || 'Pending');
      setDisclaimer(draft.disclaimer || '');
      setExpenses(draft.expenses || []);
      
      if (draft.payments && draft.payments.length > 0) {
        setPayments(draft.payments);
      } else if (draft.advanceAmount) {
        const amt = parseFloat(draft.advanceAmount);
        if (amt > 0) {
           setPayments([{
              id: Date.now().toString(),
              amount: amt,
              date: new Date().toISOString().split('T')[0],
              notes: 'Advance'
           }]);
        }
      } else {
        setPayments([]);
      }
    } else {
       if (history.length > 0) {
          const lastBill = history[0];
          setContractor({
             ...lastBill.contractor,
             bankDetails: lastBill.contractor.bankDetails || {
                holderName: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '', branchAddress: ''
             }
          });
          setGstEnabled(lastBill.gstEnabled);
          setGstRate(lastBill.gstRate || 18);
          setDisclaimer(lastBill.disclaimer || '');
       }
       setBillNumber(nextBillNum);
    }
  }, [user]);

  // Generate Document Number automatically when switching types
  useEffect(() => {
      const history = getHistory();
      setBillNumber(generateNextBillNumber(history, documentType));
  }, [documentType]);

  useEffect(() => {
    if (!user) return;
    if (items.length > 0 || client.name || contractor.companyName) {
      const billData = {
        type: documentType,
        estimateStatus,
        billNumber,
        billDate,
        paymentStatus,
        contractor,
        client,
        items,
        gstEnabled,
        gstRate,
        advanceAmount: '', 
        payments,
        expenses,
        disclaimer
      };
      saveDraft(billData);
      const history = getHistory();
      const existingIndex = history.findIndex(b => b.billNumber === billNumber);
      if (existingIndex >= 0) {
         saveToHistory(billData);
      }
    }
  }, [items, client, contractor, gstEnabled, gstRate, billNumber, billDate, paymentStatus, payments, expenses, disclaimer, user, documentType, estimateStatus]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleCloudBackup = async () => {
      setIsSyncing(true);
      try {
          await backupToDrive();
          showToast("Backup successful!");
      } catch (e) {
          showToast("Backup failed. Check internet.", 'error');
      } finally {
          setIsSyncing(false);
      }
  };

  const handleCloudRestore = async () => {
      if(!window.confirm("Restore will overwrite your current data. Continue?")) return;
      setIsSyncing(true);
      try {
          const success = await restoreFromDrive();
          if (success) {
              showToast("Restore successful! Reloading...");
              window.location.reload();
          }
      } catch (e) {
          showToast("Restore failed.", 'error');
      } finally {
          setIsSyncing(false);
      }
  };

  const generateNextBillNumber = (history: SavedBillData[], type: DocumentType = 'invoice') => {
     // Filter history by type
     const relevantHistory = history.filter(h => (h.type || 'invoice') === type);
     const prefix = type === 'invoice' ? 'INV' : 'EST';
     
     if (relevantHistory.length === 0) return `${prefix}-001`;
     
     const lastBill = relevantHistory[0].billNumber;
     const match = lastBill.match(/(\d+)$/);
     if (match) {
        const num = parseInt(match[1]);
        const nextNum = num + 1;
        const prefixStr = lastBill.slice(0, match.index);
        const paddedNum = nextNum.toString().padStart(match[0].length, '0');
        return prefixStr + paddedNum;
     }
     return `${prefix}-${(relevantHistory.length + 1).toString().padStart(3, '0')}`;
  };

  const calculateItemArea = (len: number, wid: number, h: number, qty: number, unit: string) => {
    const q = parseFloat(String(qty)) || 1;
    const l = parseFloat(String(len)) || 0;
    const w = parseFloat(String(wid)) || 0;
    const ht = parseFloat(String(h)) || 0;
    
    if (['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(unit)) return l * w * q;
    if (['cu.ft', 'cu.mt'].includes(unit)) return l * w * ht * q;
    if (unit === 'brass') return (l * w * ht * q) / 100;
    if (['rft', 'r.mt'].includes(unit)) return l * q;
    return q; 
  };

  const calculateAmount = (len: number, wid: number, h: number, qty: number, rate: number, unit: string) => {
    const totalQty = calculateItemArea(len, wid, h, qty, unit);
    const r = parseFloat(String(rate)) || 0;
    return totalQty * r;
  };

  const validateAndSwitchToItems = () => {
      // Validate Contractor Details (Either Name or Company Name required)
      if (!contractor.companyName?.trim() && !contractor.name?.trim()) {
          showToast("Please fill Contractor / Business Details", 'error');
          return;
      }
      
      // Validate Client Details
      if (!client.name?.trim()) {
          showToast("Please fill Client Name", 'error');
          return;
      }

      setActiveTab('items');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddItem = () => {
    if (!currentItem.description || !currentItem.rate) return;
    const len = Number(currentItem.length) || 0;
    const wid = Number(currentItem.width) || 0;
    const ht = Number(currentItem.height) || 0;
    const qty = Number(currentItem.quantity) || 1;
    const rt = Number(currentItem.rate) || 0;
    const unt = currentItem.unit || 'sq.ft';
    const amount = calculateAmount(len, wid, ht, qty, rt, unt);

    const newItem: BillItem = {
      id: editingId || Date.now().toString(),
      description: currentItem.description,
      length: len,
      width: wid,
      height: ht,
      quantity: qty,
      unit: unt,
      rate: rt,
      amount: amount,
      floor: currentItem.floor,
      isPaid: false
    };

    if (editingId) {
       setItems(prev => prev.map(item => item.id === editingId ? { ...newItem, isPaid: item.isPaid } : item));
       setEditingId(null);
       showToast("Item updated successfully");
    } else {
        setItems(prev => [...prev, newItem]);
        showToast("Item added");
    }

    setCurrentItem(prev => ({
      description: '',
      length: 0,
      width: 0,
      height: 0,
      quantity: 1,
      rate: 0,
      unit: prev.unit || 'sq.ft',
      floor: prev.floor
    }));
  };

  const handleEditItem = (item: BillItem) => {
     setEditingId(item.id);
     setCurrentItem(item);
     setActiveTab('items');
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
     setEditingId(null);
     setCurrentItem(prev => ({
        description: '',
        length: 0,
        width: 0,
        height: 0,
        quantity: 1,
        rate: 0,
        unit: 'sq.ft',
        floor: prev.floor
     }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    showToast("Item removed");
  };

  const handleVoiceConfirm = (parsed: ParsedBillItem) => {
    if (!parsed) return;
    setCurrentItem(prev => ({
      description: parsed.description,
      length: parsed.length || 0,
      width: parsed.width || 0,
      height: parsed.height || 0,
      quantity: parsed.quantity || 1,
      rate: parsed.rate || 0,
      unit: parsed.unit as any,
      floor: parsed.floor || prev.floor
    }));
    setIsVoiceModalOpen(false);
  };

  const handleDescriptionChange = (text: string) => {
      setCurrentItem({ ...currentItem, description: text });
      
      if (text.trim().length > 1) {
          const filtered = AUTO_SUGGEST_ITEMS.filter(item => 
              item.toLowerCase().includes(text.toLowerCase())
          ).slice(0, 6); // Limit to top 6 suggestions
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
      } else {
          setShowSuggestions(false);
      }
  };

  const handleSelectSuggestion = (text: string) => {
      setCurrentItem({ ...currentItem, description: text });
      setShowSuggestions(false);
  };

  const handleAddPayment = () => {
    const amt = parseFloat(newPaymentAmount);
    if (!newPaymentAmount || isNaN(amt) || amt <= 0) return;
    const newPay: PaymentRecord = {
       id: Date.now().toString(),
       amount: amt,
       date: newPaymentDate, 
       notes: newPaymentNote
    };
    setPayments(prev => [...prev, newPay]);
    setNewPaymentAmount('');
    setNewPaymentNote('');
    setNewPaymentDate(new Date().toISOString().split('T')[0]);
    showToast("Payment added");
  };

  const handleDeletePayment = (id: string) => {
     setPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleAddExpense = (exp: ExpenseRecord) => {
     setExpenses(prev => [...prev, exp]);
     showToast("Expense added");
  };

  const handleDeleteExpense = (id: string) => {
     setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const totals = useMemo(() => {
    const subTotal = items.reduce((acc, item) => acc + item.amount, 0);
    const totalQty = items.reduce((acc, item) => {
       const qty = calculateItemArea(item.length, item.width, item.height || 0, item.quantity, item.unit);
       return acc + qty;
    }, 0);
    const rate = gstRate || 18;
    const gst = gstEnabled ? subTotal * (rate / 100) : 0;
    const grandTotal = subTotal + gst;
    const advance = payments ? payments.reduce((sum, p) => sum + p.amount, 0) : 0;
    const balance = grandTotal - advance;
    return { subTotal, totalQty, gst, grandTotal, advance, balance };
  }, [items, gstEnabled, gstRate, payments]);

  const handleSaveBill = () => {
    saveToHistory({
      type: documentType,
      estimateStatus: documentType === 'estimate' ? estimateStatus : undefined,
      billNumber,
      billDate,
      paymentStatus,
      contractor,
      client,
      items,
      gstEnabled,
      gstRate,
      advanceAmount: '', 
      payments,
      expenses,
      disclaimer
    });
    setHistoryItems(getHistory());
    showToast(documentType === 'invoice' ? t.billSaved : t.estimateSaved);
  };

  const handleNewBill = () => {
     if (items.length > 0 && !window.confirm("Start new document? Unsaved changes will be lost.")) {
        return;
     }
     setClient({ name: '', phone: '', address: '' });
     setItems([]);
     setPayments([]);
     setExpenses([]);
     setBillNumber(generateNextBillNumber(historyItems, documentType));
     setBillDate(new Date().toISOString().split('T')[0]);
     setPaymentStatus('Pending');
     setEstimateStatus('Draft');
     showToast("New document started");
  };

  const handleLoadBill = (bill: SavedBillData) => {
    setDocumentType(bill.type || 'invoice');
    setEstimateStatus(bill.estimateStatus || 'Draft');
    setBillNumber(bill.billNumber || '');
    setBillDate(bill.billDate || new Date(bill.timestamp).toISOString().split('T')[0]);
    setPaymentStatus(bill.paymentStatus || 'Pending');
    setContractor({
       ...bill.contractor,
       bankDetails: bill.contractor.bankDetails || {
          holderName: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '', branchAddress: ''
       }
    });
    setClient(bill.client);
    setItems(bill.items);
    setGstEnabled(bill.gstEnabled);
    setGstRate(bill.gstRate || 18);
    setDisclaimer(bill.disclaimer || '');
    setExpenses(bill.expenses || []);
    
    if (bill.payments && bill.payments.length > 0) {
       setPayments(bill.payments);
    } else if (bill.advanceAmount) {
       const amt = parseFloat(bill.advanceAmount);
        if (amt > 0) {
           setPayments([{
              id: Date.now().toString(),
              amount: amt,
              date: new Date(bill.timestamp).toISOString().split('T')[0],
              notes: 'Advance'
           }]);
        } else {
           setPayments([]);
        }
    } else {
       setPayments([]);
    }
    setIsHistoryModalOpen(false);
    showToast(t.loadDraft);
  };

  const handleDeleteBill = (id: string) => {
     deleteFromHistory(id);
     setHistoryItems(getHistory());
     setTrashItems(getTrash());
     showToast("Moved to trash");
  };

  const handleRestoreBill = (id: string) => {
     restoreFromTrash(id);
     setHistoryItems(getHistory());
     setTrashItems(getTrash());
     showToast("Restored");
  };

  const handlePermanentDelete = (id: string) => {
     permanentDelete(id);
     setTrashItems(getTrash());
     showToast("Deleted forever");
  };

  const handleUpdateHistoryStatus = (id: string, status: PaymentStatus) => {
     updateBillStatus(id, status);
     setHistoryItems(getHistory());
  };

  const handleUpdateEstimateStatus = (id: string, status: EstimateStatus) => {
     updateEstimateStatus(id, status);
     setHistoryItems(getHistory());
  };

  // Convert Estimate to Invoice
  const handleConvertToInvoice = (estimate: SavedBillData) => {
      if(!window.confirm("Convert this approved estimate to an invoice? This will create a new invoice.")) return;

      const history = getHistory();
      const newBillNumber = generateNextBillNumber(history, 'invoice');
      
      const newInvoice: any = {
          ...estimate,
          id: Date.now().toString(),
          timestamp: Date.now(),
          type: 'invoice',
          billNumber: newBillNumber,
          paymentStatus: 'Pending',
          estimateStatus: undefined,
          convertedToBillId: undefined, // New invoice shouldn't link to anything yet
          expenses: [] // Do not carry over expenses from Estimate to Invoice typically, or maybe yes? Let's reset for fresh tracking.
      };

      saveToHistory(newInvoice);
      setHistoryItems(getHistory());
      
      showToast("Converted to Invoice successfully!");
      
      // Load the new invoice
      handleLoadBill(newInvoice);
  };

  const handleSaveProfile = () => {
     const newProfile = saveProfile(contractor);
     // Reload profiles from storage to handle updates correctly
     setProfiles(getProfiles());
     setSelectedProfileId(newProfile.id);
     showToast(t.profileSaved);
  };

  const handleLoadProfile = (id: string) => {
     const profile = profiles.find(p => p.id === id);
     if (profile) {
        setContractor(profile.details);
        setSelectedProfileId(id);
        showToast("Profile loaded");
     }
  };

  const handleNewContractorProfile = () => {
      setContractor({
        name: '', companyName: '', gstin: '', phone: '', email: '', website: '', socialLinks: [], accountDetails: '', 
        bankDetails: { holderName: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '', branchAddress: '' },
        logo: '', upiQrCode: ''
      });
      setSelectedProfileId('');
      showToast("Form cleared for new profile");
  };

  const handleDeleteProfile = (id: string) => {
     if(window.confirm(t.confirmDelete)) {
        deleteProfile(id);
        setProfiles(prev => prev.filter(p => p.id !== id));
        if (selectedProfileId === id) setSelectedProfileId('');
        showToast("Profile deleted");
     }
  };

  // --- Client Profile Handlers ---
  const handleSaveClientProfile = () => {
     if (!client.name) {
       showToast("Client name is required", 'error');
       return;
     }
     // Pass current Contractor ID to link client to this business profile
     const newProfile = saveClientProfile(client, selectedProfileId);
     
     // Reload client profiles from storage to handle updates correctly
     setClientProfiles(getClientProfiles());
     setSelectedClientId(newProfile.id);
     showToast(t.clientSaved);
  };

  const handleLoadClientProfile = (id: string) => {
     const profile = clientProfiles.find(p => p.id === id);
     if (profile) {
        setClient(profile.details);
        setSelectedClientId(id);
        showToast("Client loaded");
     }
  };

  const handleNewClientProfile = () => {
      setClient({ name: '', phone: '', address: '' });
      setSelectedClientId('');
      showToast("Form cleared for new client");
  };

  const handleDeleteClientProfile = (id: string) => {
     if(window.confirm(t.confirmDelete)) {
        deleteClientProfile(id);
        setClientProfiles(prev => prev.filter(p => p.id !== id));
        if (selectedClientId === id) setSelectedClientId('');
        showToast("Client deleted");
     }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'upiQrCode') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
         showToast("Image too large. Please select under 500KB.", 'error');
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setContractor(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter clients based on selected contractor profile
  const filteredClientProfiles = useMemo(() => {
      if (!selectedProfileId) return clientProfiles;
      // Show clients linked to this contractor OR global clients (no contractorId)
      return clientProfiles.filter(p => !p.contractorId || p.contractorId === selectedProfileId);
  }, [clientProfiles, selectedProfileId]);

  const generateBillText = () => {
      const dateStr = new Date(billDate).toLocaleDateString();
      const typeLabel = documentType === 'invoice' ? 'INVOICE / BILL' : 'ESTIMATE / QUOTE';
      let text = `*${typeLabel}*\n`;
      text += `No: ${billNumber}\n`;
      text += `Date: ${dateStr}\n\n`;
      text += `*From:*\n${contractor.companyName || contractor.name}\n${contractor.phone}\n\n`;
      text += `*To:*\n${client.name}\n\n`;
      text += `*Items:*\n`;
      items.forEach((item, idx) => {
          text += `${idx+1}. ${item.description} - ${item.quantity} ${item.unit} x ${item.rate} = ₹${item.amount.toFixed(0)}\n`;
      });
      text += `\n*Total: ₹${totals.grandTotal.toFixed(2)}*`;
      if (totals.advance > 0 && documentType === 'invoice') text += `\nPaid: ₹${totals.advance.toFixed(2)}\nBalance: ₹${totals.balance.toFixed(2)}`;
      
      if (contractor.bankDetails?.upiId && documentType === 'invoice') {
          text += `\n\nPay via UPI: ${contractor.bankDetails.upiId}`;
      }
      return text;
  };

  const handleShareText = (status: PaymentStatus) => {
     const text = generateBillText();
     if (navigator.share) {
        navigator.share({ title: documentType === 'invoice' ? 'Bill Summary' : 'Estimate Summary', text }).catch(() => {});
     } else {
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
     }
  };

  const handleShareFile = async (type: 'pdf' | 'excel', status: PaymentStatus) => {
      const safeBillNum = (billNumber || 'Draft').replace(/[^a-z0-9]/gi, '_');
      const fileName = `${documentType === 'invoice' ? 'Bill' : 'Estimate'}_${safeBillNum}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      let blob: Blob;

      if (type === 'pdf') {
          // @ts-ignore
          blob = generatePDF(items, contractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, status, totals, billDate, documentType, true);
      } else {
          // @ts-ignore
          blob = generateExcel(items, contractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, status, billDate, documentType, true);
      }

      if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: blob.type })] })) {
          try {
              await navigator.share({
                  files: [new File([blob], fileName, { type: blob.type })],
                  title: documentType === 'invoice' ? 'Share Bill' : 'Share Estimate',
                  text: `Here is the ${documentType} ${fileName}`
              });
          } catch (e) {
              console.error("Share failed", e);
          }
      } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          showToast(`Downloaded ${fileName}`);
      }
      setIsShareModalOpen(false);
  };

  const handleDownloadFile = (type: 'pdf' | 'excel', status: PaymentStatus) => {
      if (type === 'pdf') {
          generatePDF(items, contractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, status, totals, billDate, documentType, false);
      } else {
          generateExcel(items, contractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, status, billDate, documentType, false);
      }
      setIsShareModalOpen(false);
  };

  const handleHistoryDownloadPdf = (bill: SavedBillData) => {
      const subTotal = bill.items.reduce((acc, item) => acc + item.amount, 0);
      const rate = bill.gstRate || 18;
      const gst = bill.gstEnabled ? subTotal * (rate / 100) : 0;
      const grandTotal = subTotal + gst;
      
      let advance = 0;
      let billPayments: PaymentRecord[] = [];

      if (bill.payments && bill.payments.length > 0) {
         billPayments = bill.payments;
         advance = billPayments.reduce((s, p) => s + p.amount, 0);
      } else if (bill.advanceAmount) {
         const amt = parseFloat(bill.advanceAmount);
         advance = amt;
         if (amt > 0) {
            billPayments = [{ id: 'legacy', amount: amt, date: '', notes: 'Advance' }];
         }
      }
      const balance = grandTotal - advance;
      const safeBillNum = (bill.billNumber || 'Draft').replace(/[\/\\?%*:|"<>]/g, '_');

      generatePDF(
         bill.items,
         bill.contractor,
         bill.client,
         bill.gstEnabled,
         bill.gstRate || 18,
         billPayments,
         bill.disclaimer || '',
         safeBillNum,
         bill.paymentStatus || 'Pending',
         { subTotal, gst, grandTotal, balance, advance },
         bill.billDate || new Date(bill.timestamp).toISOString().split('T')[0],
         bill.type || 'invoice',
         false
      );
  };

  const handleHistoryDownloadExcel = (bill: SavedBillData) => {
      let billPayments: PaymentRecord[] = [];
      if (bill.payments && bill.payments.length > 0) {
         billPayments = bill.payments;
      } else if (bill.advanceAmount) {
         const amt = parseFloat(bill.advanceAmount);
         if (amt > 0) {
            billPayments = [{ id: 'legacy', amount: amt, date: '', notes: 'Advance' }];
         }
      }
      const safeBillNum = (bill.billNumber || 'Draft').replace(/[\/\\?%*:|"<>]/g, '_');

      generateExcel(
         bill.items,
         bill.contractor,
         bill.client,
         bill.gstEnabled,
         bill.gstRate || 18,
         billPayments,
         bill.disclaimer || '',
         safeBillNum,
         bill.paymentStatus || 'Pending',
         bill.billDate || new Date(bill.timestamp).toISOString().split('T')[0],
         bill.type || 'invoice',
         false
      );
  };

  const filteredItems = useMemo(() => {
     if (!debouncedSearchQuery) return items;
     return items.filter(item => item.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
  }, [items, debouncedSearchQuery]);
  
  const getPlanDetails = () => {
     if (access.isTrial) return { name: "Free Trial", expiry: `${access.daysLeft} days remaining` };
     const plan = SUBSCRIPTION_PLANS.find(p => p.id === user?.planId);
     const date = user?.subscriptionEndDate ? new Date(user.subscriptionEndDate).toLocaleDateString() : "";
     return { 
        name: plan ? plan.name : "Unknown Plan", 
        expiry: `Valid until ${date}`
     };
  };

  const isVolumetric = ['cu.ft', 'cu.mt', 'brass'].includes(currentItem.unit || '');
  const isSimpleUnit = ['nos', 'kg', 'ton', 'lsum', 'point', 'hours', 'days', '%', 'bag', 'box', 'pkt', 'ltr', 'visit', 'month', 'kw', 'hp', 'set', 'quintal'].includes(currentItem.unit || '');
  const isLinear = ['rft', 'r.mt'].includes(currentItem.unit || '');

  const getAmountGridClass = () => {
      if (['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(currentItem.unit || '')) return "col-span-1 sm:col-span-2";
      if (['cu.ft', 'cu.mt', 'brass'].includes(currentItem.unit || '')) return "col-span-2 sm:col-span-1";
      if (['rft', 'r.mt'].includes(currentItem.unit || '')) return "col-span-2 sm:col-span-3";
      return "col-span-2 sm:col-span-5";
  };

  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-indigo-600"><div className="animate-spin text-2xl"><Loader2 className="w-10 h-10 animate-spin" /></div></div>;
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
         <OnboardingFlow onComplete={(newUser) => { setUser(newUser); setAccess(checkSubscriptionAccess()); }} />
      </Suspense>
    );
  }
  
  if (!access.hasAccess) {
     return (
        <Suspense fallback={<LoadingFallback />}>
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center safe-area-top">
             <span className="font-bold text-lg">Bill Master</span>
             <button onClick={() => { logoutUser(); setUser(null); }} className="text-sm underline opacity-80">Logout</button>
          </div>
          <SubscriptionPlans onSuccess={(updatedUser) => { setUser(updatedUser); setAccess(checkSubscriptionAccess()); }} planId={user.planId} remainingDays={access.daysLeft} />
        </Suspense>
     );
  }
  
  if (showSubscription) {
     return (
       <Suspense fallback={<LoadingFallback />}>
          <SubscriptionPlans onSuccess={(updatedUser) => { setUser(updatedUser); setAccess(checkSubscriptionAccess()); setShowSubscription(false); }} planId={user.planId} remainingDays={access.daysLeft} onBack={() => setShowSubscription(false)} />
       </Suspense>
     );
  }

  return (
    <div className={`min-h-screen pb-36 sm:pb-40 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200 ${documentType === 'estimate' ? 'bg-amber-50/30 dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-950'}`}>
      
      {toast && (
         <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-xl animate-in slide-in-from-top duration-300 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
             {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
             <span className="font-medium text-sm">{toast.message}</span>
         </div>
      )}

      {/* --- HEADER --- */}
      <header className={`sticky top-0 z-30 safe-area-top glass-panel backdrop-blur-xl text-white shadow-lg border-b border-white/10 transition-colors duration-300 ${documentType === 'estimate' ? 'bg-amber-600/95 dark:bg-amber-900/90' : 'bg-indigo-600/95 dark:bg-indigo-950/90'}`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 tracking-tight text-white drop-shadow-sm">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white/90" />
              <span className="hidden sm:inline">Contractor Bill Master</span>
              <span className="sm:hidden">Bill Master</span>
              {access.isTrial && (
                 <span className="inline-flex items-center text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/30 tracking-wide uppercase ml-1 align-middle self-center leading-none whitespace-nowrap backdrop-blur-md">
                   Trial: {access.daysLeft}d
                 </span>
              )}
            </h1>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setIsDashboardModalOpen(true)} className="p-2 rounded-full hover:bg-white/10 transition active:scale-95" title="Dashboard">
                <PieChart className="w-5 h-5 text-white" />
              </button>
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 transition active:scale-95">
                {isDarkMode ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-indigo-100" />}
              </button>
              <button onClick={() => setIsHistoryModalOpen(true)} className="p-2 rounded-full hover:bg-white/10 transition relative active:scale-95">
                <Clock className="w-5 h-5 text-white" />
                {historyItems.length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse ring-2 ring-indigo-600"></span>}
              </button>
              
              <button 
                onClick={() => setIsProfileModalOpen(true)} 
                className="ml-1 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white font-bold text-sm border border-white/10 transition active:scale-95 shadow-sm"
                title="My Profile"
              >
                 {user.name.charAt(0).toUpperCase()}
              </button>
            </div>
          </div>
          
          <div className="flex bg-black/20 p-1 rounded-xl gap-1 backdrop-blur-md">
             <button onClick={() => setActiveTab('details')} className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${activeTab === 'details' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-md transform scale-[1.01]' : 'text-indigo-200 hover:bg-white/5'}`}>
               <Contact className="w-4 h-4 sm:hidden" />
               <span className="hidden sm:inline">Contractor/Business & Client Details</span>
               <span className="sm:hidden">Details</span>
             </button>
             <button onClick={() => validateAndSwitchToItems()} className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${activeTab === 'items' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-md transform scale-[1.01]' : 'text-indigo-200 hover:bg-white/5'}`}>
               <LayoutList className="w-4 h-4 sm:hidden" />
               <span className="hidden sm:inline">{t.addItem}</span>
               <span className="sm:hidden">Items</span>
               <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] ml-1">{items.length}</span>
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 sm:p-5 space-y-4 sm:space-y-6">
        {/* Paid Plan Renewal Banner */}
        {!access.isTrial && access.hasAccess && access.daysLeft <= 3 && (
           <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-800 flex justify-between items-center shadow-sm">
             <div>
                <h3 className="font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2">
                   <RefreshCw className="w-5 h-5" /> Plan Expiring Soon
                </h3>
                <p className="text-sm text-orange-600 dark:text-orange-300 hidden sm:block">Expires in {access.daysLeft} day{access.daysLeft !== 1 ? 's' : ''}.</p>
             </div>
             <button onClick={() => setShowSubscription(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-lg transition active:scale-95">
                Renew
             </button>
           </div>
        )}

        {/* --- DETAILS TAB --- */}
        {activeTab === 'details' && (
          <div className="space-y-4 sm:space-y-6 animate-slide-up">
            
            {/* Document Type Switcher */}
            <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
               <button 
                 onClick={() => setDocumentType('invoice')}
                 className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${documentType === 'invoice' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600'}`}
               >
                  <FileText className="w-4 h-4" /> {t.modeInvoice}
               </button>
               <button 
                 onClick={() => setDocumentType('estimate')}
                 className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${documentType === 'estimate' ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-amber-600'}`}
               >
                  <FilePlus className="w-4 h-4" /> {t.modeEstimate}
               </button>
            </div>

            {/* Bill Meta - New Bill Button moved to Header */}
            <div className={`card p-4 sm:p-5 grid grid-cols-2 gap-4 ${documentType === 'estimate' ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-slate-900' : ''}`}>
                <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{documentType === 'invoice' ? t.billNumber : t.estimateNumber}</label>
                   <input type="text" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800/80 border-none rounded-xl font-mono font-bold text-base sm:text-lg dark:text-white focus:ring-2 focus:ring-indigo-500 p-2.5 tracking-wide" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{documentType === 'invoice' ? t.billDate : t.estimateDate}</label>
                    <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800/80 border-none rounded-xl font-mono font-bold text-base sm:text-lg dark:text-white focus:ring-2 focus:ring-indigo-500 p-2.5 tracking-wide" />
                </div>
                
                {/* Estimate Status Selector (Only for Estimates) */}
                {documentType === 'estimate' && (
                   <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t.estimateStatus}</label>
                      <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                         {(['Draft', 'Pending Approval', 'In Review', 'Approved', 'Rejected'] as EstimateStatus[]).map(status => (
                            <button
                               key={status}
                               onClick={() => setEstimateStatus(status)}
                               className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${estimateStatus === status ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                               {status === 'Pending Approval' ? 'Pending' : status}
                            </button>
                         ))}
                      </div>
                   </div>
                )}
            </div>

            {/* Contractor Form */}
            <div className="card p-4 sm:p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                 <h2 className="text-lg font-bold flex items-center gap-2">
                   <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg"><User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div> {t.contractorDetails}
                 </h2>
                 {/* Saved Profiles Toolbar */}
                 <div className="flex gap-2 items-center">
                    <select 
                       className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-lg p-1.5 outline-none max-w-[100px] sm:max-w-[160px] dark:text-white"
                       value={selectedProfileId} 
                       onChange={(e) => handleLoadProfile(e.target.value)}
                    >
                        <option value="">Load Profile...</option>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    
                    <button onClick={handleNewContractorProfile} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95" title="New / Clear">
                       <FilePlus className="w-4 h-4" />
                    </button>

                    <button onClick={handleSaveProfile} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition active:scale-95" title={t.saveProfile}>
                       <Save className="w-4 h-4" />
                    </button>

                    {selectedProfileId && (
                      <button onClick={() => handleDeleteProfile(selectedProfileId)} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition active:scale-95" title="Delete Profile">
                         <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                   {contractor.logo ? (
                     <div className="relative group">
                       <img src={contractor.logo} alt="Logo" className="w-14 h-14 object-contain bg-white rounded-lg shadow-sm" />
                       <button onClick={() => setContractor({...contractor, logo: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"><X className="w-3 h-3" /></button>
                     </div>
                   ) : (
                     <div className="w-14 h-14 bg-white dark:bg-slate-700/50 rounded-lg flex items-center justify-center text-slate-300 border border-slate-200 dark:border-slate-600"><ImageIcon className="w-6 h-6 opacity-50" /></div>
                   )}
                   <div className="flex-1">
                     <label className="cursor-pointer bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition inline-block shadow-sm">
                        <Upload className="w-3 h-3 inline mr-1.5" /> {contractor.logo ? 'Change Logo' : t.uploadLogo}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} />
                     </label>
                   </div>
                </div>

                <div className="sm:col-span-2">
                   <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Firm Name</label>
                   <input type="text" placeholder={t.company} value={contractor.companyName} onChange={e => setContractor({...contractor, companyName: e.target.value})} className="input-field font-bold text-lg" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">GSTIN</label>
                   <input type="text" placeholder={t.gstin} value={contractor.gstin || ''} onChange={e => setContractor({...contractor, gstin: e.target.value.toUpperCase()})} className="input-field uppercase font-mono" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Contact Person</label>
                   <input type="text" placeholder={t.name} value={contractor.name} onChange={e => setContractor({...contractor, name: e.target.value})} className="input-field" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Phone</label>
                   <input type="tel" inputMode="numeric" placeholder={t.phone} value={contractor.phone} onChange={e => setContractor({...contractor, phone: e.target.value})} className="input-field" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Email</label>
                   <input type="email" placeholder={t.email} value={contractor.email} onChange={e => setContractor({...contractor, email: e.target.value})} className="input-field" />
                </div>
                
                {/* Bank Details */}
                <div className="sm:col-span-2 bg-indigo-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-indigo-100 dark:border-slate-800 space-y-4 mt-2">
                    <h4 className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 border-b border-indigo-100 dark:border-slate-700 pb-2"><Building2 className="w-4 h-4" /> {t.accountDetails}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1 ml-1">{t.bankFields.holderName}</label><input type="text" value={contractor.bankDetails?.holderName || ''} onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, holderName: e.target.value }})} className="input-field text-sm p-2.5" /></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1 ml-1">{t.bankFields.accountNumber}</label><input type="text" inputMode="numeric" value={contractor.bankDetails?.accountNumber || ''} onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, accountNumber: e.target.value }})} className="input-field text-sm p-2.5 font-mono" /></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1 ml-1">{t.bankFields.bankName}</label><input type="text" value={contractor.bankDetails?.bankName || ''} onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, bankName: e.target.value }})} className="input-field text-sm p-2.5" /></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1 ml-1">{t.bankFields.ifscCode}</label><input type="text" value={contractor.bankDetails?.ifscCode || ''} onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, ifscCode: e.target.value.toUpperCase() }})} className="input-field text-sm p-2.5 uppercase font-mono" /></div>
                        <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-slate-500 mb-1 ml-1">{t.bankFields.upiId}</label><input type="text" value={contractor.bankDetails?.upiId || ''} onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, upiId: e.target.value }})} className="input-field text-sm p-2.5" /></div>
                    </div>
                </div>

                {/* QR Code */}
                <div className="sm:col-span-2 flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-300"><QrCode className="w-6 h-6 opacity-50" /></div>
                      <div><h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{t.paymentQr}</h4></div>
                    </div>
                    <label className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-bold text-xs bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg hover:bg-indigo-100 transition">
                        {contractor.upiQrCode ? t.removeQr : t.uploadQr}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { if(contractor.upiQrCode) setContractor({...contractor, upiQrCode: ''}); else handleImageUpload(e, 'upiQrCode'); }} />
                    </label>
                </div>
              </div>
            </div>

            {/* Client Form - UPDATED WITH SAVED PROFILES */}
            <div className="card p-4 sm:p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                 <h2 className="text-lg font-bold flex items-center gap-2">
                   <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg"><Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div> {t.clientDetails}
                 </h2>
                 {/* Saved Client Profiles Toolbar */}
                 <div className="flex gap-2 items-center">
                    <select 
                       className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-lg p-1.5 outline-none max-w-[100px] sm:max-w-[160px] dark:text-white"
                       value={selectedClientId} 
                       onChange={(e) => handleLoadClientProfile(e.target.value)}
                    >
                        <option value="">Load Client...</option>
                        {filteredClientProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <button onClick={handleNewClientProfile} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95" title="New / Clear">
                       <FilePlus className="w-4 h-4" />
                    </button>

                    <button onClick={handleSaveClientProfile} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition active:scale-95" title={t.saveClient}>
                       <Save className="w-4 h-4" />
                    </button>

                    {selectedClientId && (
                      <button onClick={() => handleDeleteClientProfile(selectedClientId)} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition active:scale-95" title="Delete Client">
                         <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                 </div>
              </div>

              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Client Name</label><input type="text" value={client.name} onChange={e => setClient({...client, name: e.target.value})} className="input-field" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Client Phone</label><input type="tel" inputMode="numeric" value={client.phone} onChange={e => setClient({...client, phone: e.target.value})} className="input-field" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Site Address</label><input type="text" value={client.address} onChange={e => setClient({...client, address: e.target.value})} className="input-field" /></div>
            </div>
            
            <div className="flex justify-end pt-4">
               <button onClick={validateAndSwitchToItems} className="btn-primary py-3 px-6 flex items-center gap-2 text-base font-bold">Next: Add Items <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
        
        {/* --- ITEMS TAB --- */}
        {activeTab === 'items' && (
          <div className="space-y-4 sm:space-y-6 animate-slide-up">
            <div className="card p-4 sm:p-6 relative overflow-hidden ring-1 ring-slate-900/5">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">{editingId ? t.updateItem : t.addItem}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setIsExpensesModalOpen(true)} className="p-2.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition flex items-center gap-2 active:scale-95 border border-green-100 dark:border-green-900">
                     <Wallet className="w-5 h-5" />
                     <span className="text-xs font-bold hidden sm:inline">Expenses</span>
                  </button>
                  <button onClick={() => setIsVoiceModalOpen(true)} className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition flex items-center gap-2 group active:scale-95 border border-indigo-100 dark:border-indigo-900">
                     <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     <span className="text-xs font-bold hidden sm:inline">{t.voiceEntry}</span>
                  </button>
                  <button onClick={() => setIsCalcOpen(true)} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"><Calculator className="w-5 h-5" /></button>
                </div>
              </div>

              {/* Universal Input Grid - Compact Mode */}
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 mb-5">
                <div className="col-span-2 sm:col-span-2">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 ml-1">{t.floor}</label>
                   <input list="floors" placeholder="Ground Floor" className="input-field text-sm" value={currentItem.floor || ''} onChange={e => setCurrentItem({...currentItem, floor: e.target.value})} />
                   <datalist id="floors">{Object.values(t.floors).map(f => <option key={f} value={f} />)}</datalist>
                </div>
                
                <div className={`col-span-2 ${isSimpleUnit ? 'sm:col-span-2' : 'sm:col-span-1'}`}>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 ml-1">{t.unit}</label>
                  <select className="input-field appearance-none text-center text-sm" value={currentItem.unit} onChange={e => setCurrentItem({...currentItem, unit: e.target.value as any})}>
                    {CONSTRUCTION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>

                <div className={`col-span-2 ${isSimpleUnit ? 'sm:col-span-3' : 'sm:col-span-4'} relative z-20`}>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 ml-1">{t.description}</label>
                  <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Description" 
                        className="input-field text-sm w-full" 
                        value={currentItem.description} 
                        onChange={e => handleDescriptionChange(e.target.value)}
                        onFocus={() => {
                            if (currentItem.description && currentItem.description.length > 1) {
                                setShowSuggestions(true);
                            }
                        }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      />
                      {showSuggestions && suggestions.length > 0 && (
                          <ul className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                              {suggestions.map((s, i) => (
                                  <li 
                                    key={i} 
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }}
                                    className="px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                                  >
                                      {s}
                                  </li>
                              ))}
                          </ul>
                      )}
                  </div>
                </div>
                
                {!isSimpleUnit && (
                    <>
                        <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 ml-1">{t.length}</label>
                            <input type="number" inputMode="decimal" min="0" placeholder="0" className="input-field text-center text-sm" value={currentItem.length || ''} onChange={e => setCurrentItem({...currentItem, length: parseFloat(e.target.value)})} onFocus={(e) => e.target.select()} />
                        </div>
                        {!isLinear && (
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 ml-1">{t.width}</label>
                                <input type="number" inputMode="decimal" min="0" placeholder="0" className="input-field text-center text-sm" value={currentItem.width || ''} onChange={e => setCurrentItem({...currentItem, width: parseFloat(e.target.value)})} onFocus={(e) => e.target.select()} />
                            </div>
                        )}
                        {isVolumetric && (
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 ml-1">{t.height}</label>
                                <input type="number" inputMode="decimal" min="0" placeholder="0" className="input-field text-center text-sm" value={currentItem.height || ''} onChange={e => setCurrentItem({...currentItem, height: parseFloat(e.target.value)})} onFocus={(e) => e.target.select()} />
                            </div>
                        )}
                    </>
                )}

                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 ml-1">{t.quantity}</label>
                  <input type="number" inputMode="decimal" min="1" placeholder="1" className="input-field text-center text-sm" value={currentItem.quantity || ''} onChange={e => setCurrentItem({...currentItem, quantity: parseFloat(e.target.value)})} onFocus={(e) => e.target.select()} />
                </div>
                
                <div className="col-span-1">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 ml-1">{t.rate}</label>
                   <input type="number" inputMode="decimal" min="0" placeholder="0" className="input-field text-center font-bold text-slate-700 dark:text-white text-sm" value={currentItem.rate || ''} onChange={e => setCurrentItem({...currentItem, rate: parseFloat(e.target.value)})} onFocus={(e) => e.target.select()} />
                </div>

                {!isSimpleUnit && (
                    <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 ml-1">Area</label>
                    <div className="input-field bg-slate-100 dark:bg-slate-800 text-center flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 truncate text-xs p-0">
                        {calculateItemArea(currentItem.length || 0, currentItem.width || 0, currentItem.height || 0, currentItem.quantity || 1, currentItem.unit || 'sq.ft').toFixed(2)}
                    </div>
                    </div>
                )}
                
                <div className={`${getAmountGridClass()} flex items-end`}>
                   <div className="w-full h-[46px] bg-slate-900 dark:bg-black px-3 rounded-xl border border-transparent text-right font-mono font-bold text-green-400 flex items-center justify-end shadow-inner tracking-widest text-lg overflow-hidden">
                      {calculateAmount(currentItem.length || 0, currentItem.width || 0, currentItem.height || 0, currentItem.quantity || 1, currentItem.rate || 0, currentItem.unit || 'sq.ft').toFixed(0)}
                   </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2 relative z-10">
                 {editingId && (
                   <button onClick={handleCancelEdit} className="flex-1 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition text-sm">{t.cancelEdit}</button>
                 )}
                 <button onClick={handleAddItem} disabled={!currentItem.description || !currentItem.rate} className="flex-1 btn-primary py-3 flex justify-center items-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-sm">
                  {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? t.updateItem : t.confirm}
                </button>
              </div>
            </div>

            <div className="card overflow-hidden">
               {items.length > 0 && (
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex gap-2 bg-slate-50/50 dark:bg-slate-900">
                     <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder={t.searchPlaceholder} className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-indigo-500 transition-colors" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                     </div>
                  </div>
               )}
               
               <div className="max-h-[50vh] overflow-y-auto custom-scrollbar touch-pan-y">
                  {filteredItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-slate-600 flex flex-col items-center">
                       <FileText className="w-10 h-10 opacity-30 mb-2" />
                       <p className="font-medium text-sm">{t.emptyList}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredItems.map((item, idx) => (
                        <SwipeableItem 
                            key={item.id} 
                            item={item} 
                            index={idx} 
                            onDelete={handleRemoveItem} 
                            onEdit={handleEditItem}
                        />
                      ))}
                    </div>
                  )}
               </div>
               {items.length > 0 && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wide">
                     <span>Total: {items.length}</span>
                  </div>
               )}
            </div>
            
            {/* Bill Summary */}
            <div className={`card p-4 sm:p-5 space-y-3 ${documentType === 'estimate' ? 'border-amber-200 dark:border-amber-900/30' : ''}`}>
               <h3 className="font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-2 mb-1 flex items-center gap-2"><FileText className={`w-4 h-4 ${documentType === 'estimate' ? 'text-amber-600' : 'text-indigo-600'}`} />{t.billSummary}</h3>
               
               <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm"><span>{t.totalArea}</span><span className="font-bold text-slate-900 dark:text-white">{totals.totalQty.toFixed(2)}</span></div>
               <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm"><span>{t.subTotal}</span><span className="font-bold text-slate-900 dark:text-white">₹{totals.subTotal.toFixed(2)}</span></div>
               
               <div className="flex items-center justify-between py-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                     <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${gstEnabled ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}>
                        {gstEnabled && <CheckCircle2 className="w-3 h-3 text-white" />}
                     </div>
                     <input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} className="hidden" />
                     <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.addGst}</span>
                  </label>
                  {gstEnabled && (
                     <div className="flex items-center gap-1">
                        <input type="number" value={gstRate} onChange={e => setGstRate(parseFloat(e.target.value))} onFocus={(e) => e.target.select()} className="w-12 p-1 text-center bg-slate-100 dark:bg-slate-800 rounded text-sm font-bold outline-none" />
                        <span className="text-sm font-bold text-slate-500">%</span>
                     </div>
                  )}
               </div>

               {gstEnabled && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm"><span>GST Amount</span><span className="font-bold text-slate-900 dark:text-white">₹{totals.gst.toFixed(2)}</span></div>
               )}
               
               <div className="flex justify-between items-end pt-3 pb-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                  <span className={`text-base font-bold ${documentType === 'estimate' ? 'text-amber-900 dark:text-amber-200' : 'text-indigo-900 dark:text-indigo-200'}`}>{t.grandTotal}</span>
                  <span className={`text-2xl font-extrabold tracking-tight ${documentType === 'estimate' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>₹{totals.grandTotal.toFixed(2)}</span>
               </div>
               
               {/* Only Show Payments/Balance for Invoices, NOT Estimates */}
               {documentType === 'invoice' && (
                   <>
                        <div className="pt-3 border-t-2 border-dashed border-slate-200 dark:border-slate-800">
                            <h4 className="font-bold text-[10px] text-slate-500 uppercase mb-3 flex justify-between items-center tracking-wider">{t.paymentHistory}<span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">₹{totals.advance.toFixed(2)}</span></h4>
                            
                            <div className="grid grid-cols-12 gap-2 mb-3">
                                <input type="date" className="col-span-12 sm:col-span-3 p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 dark:text-white outline-none" value={newPaymentDate} onChange={e => setNewPaymentDate(e.target.value)} />
                                <div className="col-span-8 sm:col-span-3">
                                    <input type="number" inputMode="decimal" min="0" className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 dark:text-white outline-none font-bold" placeholder="Amount" value={newPaymentAmount} onChange={e => setNewPaymentAmount(e.target.value)} onFocus={(e) => e.target.select()} />
                                </div>
                                <button onClick={handleAddPayment} className="col-span-4 sm:col-span-1 p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center shadow-sm active:scale-95 transition"><Plus className="w-4 h-4" /></button>
                            </div>

                            {payments.length > 0 && (
                                <div className="space-y-1.5 mb-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg max-h-32 overflow-y-auto custom-scrollbar">
                                    {payments.map(p => (
                                    <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                                        <span className="font-bold text-slate-800 dark:text-slate-100">₹{p.amount}</span>
                                        <span className="text-slate-400">{p.date ? new Date(p.date).toLocaleDateString() : ''}</span>
                                        <button onClick={() => handleDeletePayment(p.id)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                    </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-indigo-600 text-white p-4 rounded-xl flex justify-between items-center shadow-lg shadow-indigo-200 dark:shadow-none">
                            <span className="font-medium opacity-90 text-sm">{t.balanceDue}</span>
                            <span className="text-xl font-bold">₹{totals.balance.toFixed(2)}</span>
                        </div>
                   </>
               )}
               
               <div className="pt-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block flex items-center gap-1 tracking-wider"><AlertCircle className="w-3 h-3" /> {t.disclaimer}</label>
                  <textarea className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition" rows={2} placeholder="Terms..." value={disclaimer} onChange={e => setDisclaimer(e.target.value)} />
               </div>
            </div>
          </div>
        )}
      </main>

      {/* --- BOTTOM ACTION BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 glass-panel z-40 safe-area-bottom pb-4 sm:pb-3 shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
         <div className="max-w-4xl mx-auto px-4 py-3 grid grid-cols-2 gap-3">
            <button onClick={() => setIsShareModalOpen(true)} className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700 text-sm" disabled={items.length === 0}><Share2 className="w-4 h-4" /> Export / Share</button>
            <button 
                onClick={handleSaveBill} 
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white transition shadow-lg active:scale-95 text-sm ${documentType === 'estimate' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200 dark:shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none'}`}
            >
                <Save className="w-4 h-4" /> {documentType === 'estimate' ? t.saveEstimate : t.saveBill}
            </button>
         </div>
      </div>

      <Suspense fallback={<LoadingFallback />}>
         {isHistoryModalOpen && <HistoryModal 
            isOpen={isHistoryModalOpen} 
            onClose={() => setIsHistoryModalOpen(false)} 
            history={historyItems} 
            trash={trashItems} 
            onLoad={handleLoadBill} 
            onDelete={handleDeleteBill} 
            onRestore={handleRestoreBill} 
            onPermanentDelete={handlePermanentDelete} 
            onUpdateStatus={handleUpdateHistoryStatus} 
            onUpdateEstimateStatus={handleUpdateEstimateStatus}
            onConvertToInvoice={handleConvertToInvoice}
            onDownloadPdf={handleHistoryDownloadPdf} 
            onDownloadExcel={handleHistoryDownloadExcel} 
         />}
         {isCalcOpen && <CalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />}
         {isVoiceModalOpen && <VoiceEntryModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} onConfirm={handleVoiceConfirm} />}
         {isShareModalOpen && <ShareModal 
            isOpen={isShareModalOpen} 
            onClose={() => setIsShareModalOpen(false)}
            onShareText={(status) => handleShareText(status)}
            onSharePdf={(status) => handleShareFile('pdf', status)}
            onShareExcel={(status) => handleShareFile('excel', status)}
            onDownloadPdf={(status) => handleDownloadFile('pdf', status)}
            onDownloadExcel={(status) => handleDownloadFile('excel', status)}
            previewText={generateBillText()}
            documentType={documentType}
         />}
         {isProfileModalOpen && <ProfileModal 
            isOpen={isProfileModalOpen} 
            onClose={() => setIsProfileModalOpen(false)}
            user={user}
            planDetails={getPlanDetails()}
            onLogout={() => { logoutUser(); setUser(null); }}
            onBackup={handleCloudBackup}
            onRestore={handleCloudRestore}
            onUpgrade={() => { setIsProfileModalOpen(false); setShowSubscription(true); }}
            isSyncing={isSyncing}
         />}
         {isExpensesModalOpen && <ExpensesModal 
            isOpen={isExpensesModalOpen}
            onClose={() => setIsExpensesModalOpen(false)}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            billTotal={totals.grandTotal}
         />}
         {isDashboardModalOpen && <DashboardModal 
            isOpen={isDashboardModalOpen}
            onClose={() => setIsDashboardModalOpen(false)}
            history={historyItems}
         />}
      </Suspense>
    </div>
  );
};

export default App;
