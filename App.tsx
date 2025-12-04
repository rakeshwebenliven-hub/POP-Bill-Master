
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Plus, Trash2, X, Calculator, Pencil, Clock, Save, Search, AlertCircle, Image as ImageIcon, Upload, Share2, Users, QrCode, FilePlus, Moon, Sun, Mic, Building2, LogOut, Crown, Cloud, RefreshCw, CheckCircle2, User, ChevronRight, Loader2, FileText, LayoutList, Contact, FileCheck, Wallet, PieChart, ChevronLeft, Menu, Settings, Check, ArrowRight, Home, ChevronDown, ChevronUp, Landmark } from 'lucide-react';
import { BillItem, ClientDetails, ContractorDetails, SavedBillData, SocialLink, SocialPlatform, ContractorProfile, PaymentStatus, PaymentRecord, ParsedBillItem, UserProfile, ClientProfile, DocumentType, EstimateStatus, ExpenseRecord } from './types';
import { APP_TEXT, SUBSCRIPTION_PLANS, CONSTRUCTION_UNITS, AUTO_SUGGEST_ITEMS, BUSINESS_CATEGORIES } from './constants';
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
    <div className="relative overflow-hidden mb-3">
      {/* Swipe Background (Red) */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end px-6 rounded-2xl">
        <Trash2 className="w-6 h-6 text-white" />
      </div>

      <div 
        className={`relative bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex justify-between items-center group ${isSwiping ? '' : 'transition-transform duration-300'}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
          <div className="flex gap-3 w-full items-start">
              {/* Index Number */}
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-0.5">
                 {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 flex-wrap mb-1">
                  <span>{item.description}</span>
                  {item.floor && <span className="text-[10px] uppercase font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded tracking-wide border border-indigo-100 dark:border-indigo-800">{item.floor}</span>}
                </div>
                
                <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                  {/* Smart Dimensions Display */}
                  <span className="font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">
                    {['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(item.unit) && (
                        <span>{item.length} <span className="text-slate-400">x</span> {item.width}</span>
                    )}
                    {['cu.ft', 'cu.mt', 'brass'].includes(item.unit) && (
                        <span>{item.length}<span className="text-slate-400">x</span>{item.width}<span className="text-slate-400">x</span>{item.height}</span>
                    )}
                    {['rft', 'r.mt'].includes(item.unit) && (
                        <span>{item.length} <span className="text-[10px] text-slate-400">LEN</span></span>
                    )}
                    {!['sq.ft', 'sq.mt', 'sq.yd', 'acre', 'cu.ft', 'cu.mt', 'brass', 'rft', 'r.mt'].includes(item.unit) && (
                        <span>{item.quantity} <span className="text-[10px] text-slate-400 uppercase">{item.unit}</span></span>
                    )}
                  </span>
                  
                  {/* Quantity Badge if > 1 */}
                  {item.quantity > 1 && ['sq.ft', 'sq.mt', 'sq.yd', 'acre', 'cu.ft', 'cu.mt', 'brass', 'rft', 'r.mt'].includes(item.unit) && (
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">x {item.quantity}</span>
                  )}

                  {/* Rate Badge */}
                  <span className="text-xs font-medium text-slate-500">@ ₹{item.rate}</span>
                </div>
              </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1.5 pl-2">
              <div className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">₹{item.amount.toFixed(0)}</div>
              
              {/* Visible Action Buttons */}
              <div className="flex gap-2">
                <button 
                    onClick={() => onEdit(item)}
                    className="p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 transition border border-indigo-100 dark:border-indigo-800"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 transition border border-red-100 dark:border-red-800"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
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

type ViewType = 'create' | 'history' | 'analytics' | 'profile';
type CreateStep = 'parties' | 'items' | 'summary';

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

  // Navigation State
  const [currentView, setCurrentView] = useState<ViewType>('create');
  const [createStep, setCreateStep] = useState<CreateStep>('parties');
  const [isAddItemOpen, setIsAddItemOpen] = useState(true); // Toggle for Item Form

  // State
  const [documentType, setDocumentType] = useState<DocumentType>('invoice');
  const [estimateStatus, setEstimateStatus] = useState<EstimateStatus>('Draft');
  
  // Track specific Bill ID being edited to prevent duplicates
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);

  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pending');

  const [contractor, setContractor] = useState<ContractorDetails>({
    name: '',
    companyName: '',
    businessCategory: '',
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

  const [includeBankDetails, setIncludeBankDetails] = useState(true);

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

  // Modals (kept for specific actions)
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);
  
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
    const draft: any = loadDraft(); // Type cast for originalId property
    const history = getHistory();
    setHistoryItems(history);
    setTrashItems(getTrash());
    let nextBillNum = generateNextBillNumber(history, documentType);

    if (draft) {
      // Restore ID if draft was editing an existing bill
      if (draft.id && draft.id !== 'draft') {
          setCurrentBillId(draft.id);
      }

      setDocumentType(draft.type || 'invoice');
      setEstimateStatus(draft.estimateStatus || 'Draft');
      setContractor({
         ...draft.contractor,
         bankDetails: draft.contractor.bankDetails || {
            holderName: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '', branchAddress: ''
         }
      });
      // Auto-enable bank details if saved info exists
      const hasBank = !!(draft.contractor.bankDetails?.accountNumber || draft.contractor.upiQrCode);
      setIncludeBankDetails(hasBank);

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
          // Auto-enable bank details if saved info exists
          const hasBank = !!(lastBill.contractor.bankDetails?.accountNumber || lastBill.contractor.upiQrCode);
          setIncludeBankDetails(hasBank);

          setGstEnabled(lastBill.gstEnabled);
          setGstRate(lastBill.gstRate || 18);
          setDisclaimer(lastBill.disclaimer || '');
       }
       setBillNumber(nextBillNum);
    }
  }, [user]);

  // Handle Document Type Switch
  useEffect(() => {
      // If we are switching types (Invoice <-> Estimate), we are effectively creating a new document context
      // We should detach from the current ID to prevent overwriting the previous document type
      if (currentBillId) {
          const history = getHistory();
          const currentRecord = history.find(h => h.id === currentBillId);
          if (currentRecord && (currentRecord.type || 'invoice') !== documentType) {
              setCurrentBillId(null); // Detach ID, next save will be new
          }
      }

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
        disclaimer,
        originalId: currentBillId // Persist current ID in draft
      };
      saveDraft(billData);
      
      // Auto-save to history IF we are editing an existing record
      // This prevents "Ghost Drafts" that don't match the history
      if (currentBillId) {
         saveToHistory(billData, currentBillId);
         setHistoryItems(getHistory());
      }
    }
  }, [items, client, contractor, gstEnabled, gstRate, billNumber, billDate, paymentStatus, payments, expenses, disclaimer, user, documentType, estimateStatus, currentBillId]);

  // Determine if the current business category requires detailed dimension inputs (L x W x H)
  const isConstructionMode = useMemo(() => {
      const cat = contractor.businessCategory || '';
      const constructionKeywords = ['Construction', 'Contractor', 'Manufacturing', 'Fabrication', 'Interior', 'Civil', 'POP', 'Plumbing', 'Electrical', 'Painting', 'Masonry'];
      const isConstruct = !cat || constructionKeywords.some(k => cat.includes(k));
      if (cat.includes('Shop') || cat.includes('Store') || cat.includes('Retail') || cat.includes('Wholesaler')) {
          return false;
      }
      return isConstruct;
  }, [contractor.businessCategory]);

  const showFloorInput = useMemo(() => {
      const cat = contractor.businessCategory || '';
      if (!cat) return true;
      const allowedKeywords = [
          'Construction', 'Contractor', 'Builder', 'Interior', 'Architect', 'Civil', 'POP', 
          'Plumbing', 'Electrical', 'Painting', 'Masonry', 'Fabrication', 'Fitting', 'Installer',
          'Repair', 'Service Centre', 'Real Estate', 'HVAC', 'Roofing', 'Solar', 'CCTV', 'Security',
          'Carpenter', 'Decorator'
      ];
      const excludedKeywords = [
          'Shop', 'Store', 'Retail', 'Wholesaler', 'Distributor', 'Agency', 'Consultant', 
          'Marketing', 'Developer', 'Accountant', 'Lawyer', 'Travel', 'Restaurant', 'Cafe', 
          'Bakery', 'Manufacturing', 'Logistics', 'Transport', 'Dealer'
      ];
      if (excludedKeywords.some(k => cat.includes(k))) {
          if (cat.includes('Architect') || cat.includes('Interior')) return true;
          return false;
      }
      if (allowedKeywords.some(k => cat.includes(k))) return true;
      return false;
  }, [contractor.businessCategory]);

  useEffect(() => {
      if (!showFloorInput && currentItem.floor) {
          setCurrentItem(prev => ({ ...prev, floor: '' }));
      }
  }, [showFloorInput]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const getPriorityUnits = (category: string): string[] => {
      if (!category) return ['sq.ft', 'nos'];
      const cat = category.toLowerCase();
      if (cat.includes('retail') || cat.includes('shop') || cat.includes('store') || cat.includes('wholesaler')) {
          return ['nos', 'pcs', 'pkt', 'box', 'kg', 'ltr', 'set'];
      }
      if (cat.includes('civil') || cat.includes('masonry') || cat.includes('construction')) {
          return ['sq.ft', 'cu.ft', 'brass', 'rft', 'bag', 'nos'];
      }
      if (cat.includes('fabrication') || cat.includes('steel')) {
          return ['kg', 'ton', 'rft', 'sq.ft', 'nos'];
      }
      if (cat.includes('electrical') || cat.includes('plumbing')) {
          return ['point', 'rft', 'nos', 'set', 'kw', 'hp'];
      }
      if (cat.includes('interior') || cat.includes('pop') || cat.includes('painting')) {
          return ['sq.ft', 'rft', 'nos', 'lsum'];
      }
      if (cat.includes('service') || cat.includes('consultant') || cat.includes('agency')) {
          return ['visit', 'hours', 'month', 'lsum'];
      }
      if (cat.includes('agriculture') || cat.includes('farm')) {
          return ['kg', 'quintal', 'ton', 'ltr', 'pkt'];
      }
      if (cat.includes('real estate') || cat.includes('builder')) {
          return ['sq.yd', 'acre', 'sq.mt', 'sq.ft'];
      }
      return ['nos', 'sq.ft', 'rft'];
  };

  const { priorityOptions, otherOptions } = useMemo(() => {
      const priorityKeys = getPriorityUnits(contractor.businessCategory || '');
      const pOptions = CONSTRUCTION_UNITS.filter(u => priorityKeys.includes(u.value));
      pOptions.sort((a, b) => priorityKeys.indexOf(a.value) - priorityKeys.indexOf(b.value));
      const oOptions = CONSTRUCTION_UNITS.filter(u => !priorityKeys.includes(u.value));
      return { priorityOptions: pOptions, otherOptions: oOptions };
  }, [contractor.businessCategory]);

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
     const relevantHistory = history.filter(h => (h.type || 'invoice') === type);
     const prefix = type === 'invoice' ? 'INV' : 'EST';
     if (relevantHistory.length === 0) return `${prefix}-001`;
     const lastBill = relevantHistory[0].billNumber;
     const match = lastBill.match(/(\d+)$/);
     if (match) {
        const num = parseInt(match[1]);
        const nextNum = num + 1;
        const prefixStr = lastBill.slice(0, match.index);
        return prefixStr + nextNum.toString().padStart(match[0].length, '0');
     }
     return `${prefix}-${(relevantHistory.length + 1).toString().padStart(3, '0')}`;
  };

  const validateAndSwitchToItems = () => {
      if (!contractor.companyName?.trim() && !contractor.name?.trim()) {
          showToast("Please fill My Business Details", 'error');
          return;
      }
      if (!client.name?.trim()) {
          showToast("Please fill Client Name", 'error');
          return;
      }
      setCreateStep('items');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateAndNext = (nextStep: CreateStep) => {
      if (nextStep === 'items' || nextStep === 'summary') {
          if (!contractor.companyName?.trim() && !contractor.name?.trim()) {
              showToast("Please fill My Business Details", 'error');
              return;
          }
          if (!client.name?.trim()) {
              showToast("Please fill Client Name", 'error');
              return;
          }
      }
      if (nextStep === 'summary') {
          if (items.length === 0) {
              showToast("Please add at least one item before proceeding to summary", 'error');
              return;
          }
      }
      setCreateStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddItem = () => {
    if (!currentItem.description || !currentItem.rate) return;
    const len = Number(currentItem.length) || 0;
    const wid = Number(currentItem.width) || 0;
    const ht = Number(currentItem.height) || 0;
    const qty = Number(currentItem.quantity) || 1;
    const rt = Number(currentItem.rate) || 0;
    const defaultUnit = priorityOptions.length > 0 ? priorityOptions[0].value : 'sq.ft';
    const unt = currentItem.unit || defaultUnit;
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
      unit: prev.unit || defaultUnit,
      floor: prev.floor
    }));
  };

  const handleEditItem = (item: BillItem) => {
     setEditingId(item.id);
     setCurrentItem(item);
     setIsAddItemOpen(true);
     setCreateStep('items');
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
        unit: priorityOptions[0]?.value || 'sq.ft',
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
          ).slice(0, 6); 
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

  const handleSetExpenses = (newExpenses: ExpenseRecord[]) => {
     setExpenses(newExpenses);
     showToast("Expenses updated");
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
    const savedBill = saveToHistory({
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
    }, currentBillId);
    
    // IMPORTANT: Update current ID to lock onto this saved record
    setCurrentBillId(savedBill.id);
    
    setHistoryItems(getHistory());
    showToast(documentType === 'invoice' ? t.billSaved : t.estimateSaved);
  };

  const handleNewBill = () => {
     if (items.length > 0 && !window.confirm("Start new document? Unsaved changes will be lost.")) {
        return;
     }
     setCurrentBillId(null); // Clear ID to start fresh
     setClient({ name: '', phone: '', address: '' });
     setItems([]);
     setPayments([]);
     setExpenses([]);
     setBillNumber(generateNextBillNumber(historyItems, documentType));
     setBillDate(new Date().toISOString().split('T')[0]);
     setPaymentStatus('Pending');
     setEstimateStatus('Draft');
     setCreateStep('parties'); 
     showToast("New document started");
  };

  const handleLoadBill = (bill: SavedBillData) => {
    setCurrentBillId(bill.id); // Track this specific bill ID
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
    // Auto enable if bank details exist
    const hasBank = !!(bill.contractor.bankDetails?.accountNumber || bill.contractor.upiQrCode);
    setIncludeBankDetails(hasBank);

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
    setCurrentView('create');
    setCreateStep('summary');
    showToast(t.loadDraft);
  };

  const handleDeleteBill = (id: string) => { 
      deleteFromHistory(id); 
      setHistoryItems(getHistory()); 
      setTrashItems(getTrash()); 
      if (currentBillId === id) setCurrentBillId(null);
      showToast("Moved to trash"); 
  };
  const handleRestoreBill = (id: string) => { restoreFromTrash(id); setHistoryItems(getHistory()); setTrashItems(getTrash()); showToast("Restored"); };
  const handlePermanentDelete = (id: string) => { permanentDelete(id); setTrashItems(getTrash()); showToast("Deleted forever"); };
  const handleUpdateHistoryStatus = (id: string, status: PaymentStatus) => { updateBillStatus(id, status); setHistoryItems(getHistory()); };
  const handleUpdateEstimateStatus = (id: string, status: EstimateStatus) => { updateEstimateStatus(id, status); setHistoryItems(getHistory()); };
  
  const handleConvertToInvoice = (estimate: SavedBillData) => {
      if(!window.confirm("Convert this approved estimate to an invoice?")) return;
      const history = getHistory();
      const newBillNumber = generateNextBillNumber(history, 'invoice');
      const newInvoice: any = {
          ...estimate, id: Date.now().toString(), timestamp: Date.now(), type: 'invoice', billNumber: newBillNumber,
          paymentStatus: 'Pending', estimateStatus: undefined, convertedToBillId: undefined, expenses: []
      };
      saveToHistory(newInvoice);
      setHistoryItems(getHistory());
      showToast("Converted to Invoice successfully!");
      handleLoadBill(newInvoice);
  };

  // ... (Rest of logic remains identical)
  const handleSaveProfile = () => { 
      let saveMode: 'auto' | 'update' | 'create' = 'auto';
      let targetId = selectedProfileId;

      if (selectedProfileId) {
          const original = profiles.find(p => p.id === selectedProfileId);
          if (original && original.details.businessCategory !== contractor.businessCategory) {
              const confirmUpdate = window.confirm(
                  `Business Category changed from "${original.details.businessCategory || 'None'}" to "${contractor.businessCategory || 'None'}".\n\nPress OK to UPDATE existing profile.\nPress CANCEL to Create a NEW Profile.`
              );
              
              if (confirmUpdate) {
                  saveMode = 'update';
              } else {
                  saveMode = 'create';
                  targetId = ''; 
                  if (!window.confirm("Saving as a NEW profile. Continue?")) return;
              }
          } else {
              saveMode = 'update';
          }
      }

      const newProfile = saveProfile(contractor, undefined, saveMode, targetId); 
      setProfiles(getProfiles()); 
      setSelectedProfileId(newProfile.id); 
      showToast(t.profileSaved); 
  };

  const handleLoadProfile = (id: string) => { 
      const profile = profiles.find(p => p.id === id); 
      if (profile) { 
          setContractor(profile.details); 
          setSelectedProfileId(id);
          const hasBank = !!(profile.details.bankDetails?.accountNumber || profile.details.upiQrCode);
          setIncludeBankDetails(hasBank);
          showToast("Profile loaded"); 
      } 
  };
  const handleNewContractorProfile = () => { setContractor({ name: '', companyName: '', gstin: '', phone: '', email: '', website: '', socialLinks: [], accountDetails: '', bankDetails: { holderName: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '', branchAddress: '' }, logo: '', upiQrCode: '' }); setSelectedProfileId(''); showToast("Form cleared"); };
  const handleDeleteProfile = (id: string) => { if(window.confirm(t.confirmDelete)) { deleteProfile(id); setProfiles(prev => prev.filter(p => p.id !== id)); if (selectedProfileId === id) setSelectedProfileId(''); showToast("Profile deleted"); } };
  const handleSaveClientProfile = () => { if (!client.name) { showToast("Client name is required", 'error'); return; } const newProfile = saveClientProfile(client, selectedProfileId); setClientProfiles(getClientProfiles()); setSelectedClientId(newProfile.id); showToast(t.clientSaved); };
  const handleLoadClientProfile = (id: string) => { const profile = clientProfiles.find(p => p.id === id); if (profile) { setClient(profile.details); setSelectedClientId(id); showToast("Client loaded"); } };
  const handleNewClientProfile = () => { setClient({ name: '', phone: '', address: '' }); setSelectedClientId(''); showToast("Form cleared"); };
  const handleDeleteClientProfile = (id: string) => { if(window.confirm(t.confirmDelete)) { deleteClientProfile(id); setClientProfiles(prev => prev.filter(p => p.id !== id)); if (selectedClientId === id) setSelectedClientId(''); showToast("Client deleted"); } };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'upiQrCode') => { const file = e.target.files?.[0]; if (file) { if (file.size > 500 * 1024) { showToast("Image too large. Please select under 500KB.", 'error'); return; } const reader = new FileReader(); reader.onloadend = () => { setContractor(prev => ({ ...prev, [field]: reader.result as string })); }; reader.readAsDataURL(file); } };
  const filteredClientProfiles = useMemo(() => { if (!selectedProfileId) return clientProfiles; return clientProfiles.filter(p => !p.contractorId || p.contractorId === selectedProfileId); }, [clientProfiles, selectedProfileId]);

  // Sharing
  const generateBillText = () => {
      const dateStr = new Date(billDate).toLocaleDateString();
      const typeLabel = documentType === 'invoice' ? 'INVOICE / BILL' : 'ESTIMATE / QUOTE';
      let text = `*${typeLabel}*\nNo: ${billNumber}\nDate: ${dateStr}\n\n*From:*\n${contractor.companyName || contractor.name}\n${contractor.phone}\n\n*To:*\n${client.name}\n\n*Items:*\n`;
      items.forEach((item, idx) => { text += `${idx+1}. ${item.description} - ${item.quantity} ${item.unit} x ${item.rate} = ₹${item.amount.toFixed(0)}\n`; });
      text += `\n*Total: ₹${totals.grandTotal.toFixed(2)}*`;
      if (totals.advance > 0 && documentType === 'invoice') text += `\nPaid: ₹${totals.advance.toFixed(2)}\nBalance: ₹${totals.balance.toFixed(2)}`;
      
      if (includeBankDetails && contractor.bankDetails?.upiId && documentType === 'invoice') {
          text += `\n\nPay via UPI: ${contractor.bankDetails.upiId}`;
      }
      return text;
  };
  const handleShareText = (status: PaymentStatus) => { const text = generateBillText(); if (navigator.share) navigator.share({ title: 'Bill Summary', text }).catch(() => {}); else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'); };
  
  const handleShareFile = async (type: 'pdf' | 'excel', status: PaymentStatus) => { 
      const safeBillNum = (billNumber || 'Draft').replace(/[^a-z0-9]/gi, '_'); 
      const fileName = `${documentType === 'invoice' ? 'Bill' : 'Estimate'}_${safeBillNum}.${type === 'pdf' ? 'pdf' : 'xlsx'}`; 
      let blob: Blob;
      
      const finalContractor = {
          ...contractor,
          bankDetails: includeBankDetails ? contractor.bankDetails : undefined,
          accountDetails: includeBankDetails ? contractor.accountDetails : undefined,
          upiQrCode: includeBankDetails ? contractor.upiQrCode : ''
      };

      // @ts-ignore
      if (type === 'pdf') blob = generatePDF(items, finalContractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, status, totals, billDate, documentType, true);
      // @ts-ignore
      else blob = generateExcel(items, finalContractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, status, billDate, documentType, true);
      
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: blob.type })] })) { try { await navigator.share({ files: [new File([blob], fileName, { type: blob.type })], title: 'Share Bill', text: `Here is the ${documentType} ${fileName}` }); } catch (e) { console.error("Share failed", e); } } else { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); showToast(`Downloaded ${fileName}`); } setIsShareModalOpen(false); 
  };
  
  const handleDownloadFile = (type: 'pdf' | 'excel', status: PaymentStatus) => { 
      const finalContractor = {
          ...contractor,
          bankDetails: includeBankDetails ? contractor.bankDetails : undefined,
          accountDetails: includeBankDetails ? contractor.accountDetails : undefined,
          upiQrCode: includeBankDetails ? contractor.upiQrCode : ''
      };

      if (type === 'pdf') generatePDF(items, finalContractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, status, totals, billDate, documentType, false); 
      else generateExcel(items, finalContractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, status, billDate, documentType, false); 
      setIsShareModalOpen(false); 
  };
  
  const handleHistoryDownloadPdf = (bill: SavedBillData) => { 
      const finalContractor = bill.contractor;
      const tts = { subTotal: 0, gst: 0, grandTotal: 0, balance: 0, advance: 0 }; 
      // Simplified regen... better to reuse logic or rely on generatePDF internal calc
      // Note: The HistoryModal handler typically downloads straight from stored data
      generatePDF(bill.items, finalContractor, bill.client, bill.gstEnabled, bill.gstRate || 18, bill.payments, bill.disclaimer, bill.billNumber, bill.paymentStatus, tts, bill.billDate || '', bill.type || 'invoice', false);
  };
  const handleHistoryDownloadExcel = (bill: SavedBillData) => { 
      generateExcel(bill.items, bill.contractor, bill.client, bill.gstEnabled, bill.gstRate || 18, bill.payments, bill.disclaimer, bill.billNumber, bill.paymentStatus, bill.billDate || '', bill.type || 'invoice', false);
  };

  const getPlanDetails = () => { if (access.isTrial) return { name: "Free Trial", expiry: `${access.daysLeft} days remaining` }; const plan = SUBSCRIPTION_PLANS.find(p => p.id === user?.planId); const date = user?.subscriptionEndDate ? new Date(user.subscriptionEndDate).toLocaleDateString() : ""; return { name: plan ? plan.name : "Unknown Plan", expiry: `Valid until ${date}` }; };
  const isVolumetric = ['cu.ft', 'cu.mt', 'brass'].includes(currentItem.unit || '');
  const isSimpleUnit = ['nos', 'kg', 'ton', 'lsum', 'point', 'hours', 'days', '%', 'bag', 'box', 'pkt', 'ltr', 'visit', 'month', 'kw', 'hp', 'set', 'quintal'].includes(currentItem.unit || '');
  const isLinear = ['rft', 'r.mt'].includes(currentItem.unit || '');
  const getAmountGridClass = () => { if (['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(currentItem.unit || '')) return "col-span-12 sm:col-span-2"; if (['cu.ft', 'cu.mt', 'brass'].includes(currentItem.unit || '')) return "col-span-12 sm:col-span-1"; if (['rft', 'r.mt'].includes(currentItem.unit || '')) return "col-span-12 sm:col-span-3"; return "col-span-12 sm:col-span-5"; };
  
  const filteredItems = useMemo(() => { if (!debouncedSearchQuery) return items; return items.filter(item => item.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase())); }, [items, debouncedSearchQuery]);

  if (isLoadingAuth) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-indigo-600"><div className="animate-spin text-2xl"><Loader2 className="w-10 h-10 animate-spin" /></div></div>;
  if (!user) return <Suspense fallback={<LoadingFallback />}><OnboardingFlow onComplete={(newUser) => { setUser(newUser); setAccess(checkSubscriptionAccess()); }} /></Suspense>;
  if (!access.hasAccess || showSubscription) return <Suspense fallback={<LoadingFallback />}><SubscriptionPlans onSuccess={(updatedUser) => { setUser(updatedUser); setAccess(checkSubscriptionAccess()); setShowSubscription(false); }} planId={user.planId} remainingDays={access.daysLeft} onBack={() => setShowSubscription(false)} /></Suspense>;

  return (
    <div className={`min-h-screen pb-20 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200 ${documentType === 'estimate' ? 'bg-amber-50/30 dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-950'}`}>
      
      {toast && (
         <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-3 rounded-full shadow-xl animate-in slide-in-from-top duration-300 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
             {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
             <span className="font-medium text-sm">{toast.message}</span>
         </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto min-h-[90vh]">
        
        {/* --- VIEW: CREATE BILL (EDITOR) --- */}
        {currentView === 'create' && (
          <div className="animate-in fade-in duration-300">
             
             {/* 3-Step Wizard Header */}
             <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 safe-area-top">
                <div className="max-w-4xl mx-auto px-4 py-3">
                   <div className="flex justify-between items-center mb-4">
                      <h1 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                         {documentType === 'estimate' ? <FilePlus className="w-5 h-5 text-amber-600" /> : <FileText className="w-5 h-5 text-indigo-600" />}
                         {documentType === 'invoice' ? 'New Invoice' : 'New Estimate'}
                      </h1>
                      <div className="flex gap-2">
                         <button onClick={handleNewBill} className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition">Reset</button>
                         <button onClick={toggleTheme} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">{isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
                      </div>
                   </div>
                   
                   {/* Step Indicator */}
                   <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl relative">
                      <button onClick={() => setCreateStep('parties')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all z-10 ${createStep === 'parties' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}>{t.stepParties}</button>
                      <button onClick={() => validateAndSwitchToItems()} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all z-10 ${createStep === 'items' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}>{t.stepItems}</button>
                      <button onClick={() => validateAndNext('summary')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all z-10 ${createStep === 'summary' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}>{t.stepSummary}</button>
                   </div>
                </div>
             </div>

             <div className="p-4 pb-24 space-y-4">
                
                {/* STEP 1: PARTIES */}
                {createStep === 'parties' && (
                   <div className="space-y-4 animate-slide-up">
                      {/* Doc Type Selection Dropdown */}
                      <div className="relative">
                        <select
                          value={documentType}
                          onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                          className={`w-full appearance-none p-4 rounded-xl border-2 font-bold text-lg outline-none transition-all cursor-pointer ${
                            documentType === 'estimate' 
                              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200' 
                              : 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-slate-700 text-indigo-800 dark:text-indigo-200'
                          }`}
                        >
                          <option value="invoice">Tax Invoice / Bill</option>
                          <option value="estimate">Estimate / Quote</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
                          {documentType === 'estimate' 
                            ? <FilePlus className="w-5 h-5 text-amber-600 dark:text-amber-400" /> 
                            : <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          }
                          <ChevronDown className={`w-4 h-4 ${documentType === 'estimate' ? 'text-amber-400' : 'text-slate-400'}`} />
                        </div>
                      </div>

                      <div className="card p-4 space-y-3">
                         <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase text-slate-400">Date</label><input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="bg-transparent text-sm font-bold text-right outline-none dark:text-white" /></div>
                         <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase text-slate-400">No.</label><input type="text" value={billNumber} onChange={e => setBillNumber(e.target.value)} className="bg-transparent text-sm font-bold text-right outline-none dark:text-white w-24" /></div>
                      </div>

                      {/* Contractor Details */}
                      <div className="card p-4 space-y-4">
                         <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="font-bold flex items-center gap-2"><Building2 className="w-4 h-4 text-indigo-500" /> {t.contractorDetails}</h2>
                            <div className="flex gap-1">
                               <select className="bg-slate-50 dark:bg-slate-800 text-xs p-1.5 rounded outline-none max-w-[100px]" value={selectedProfileId} onChange={(e) => handleLoadProfile(e.target.value)}><option value="">Load Profile</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                               <button onClick={handleNewContractorProfile} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded"><FilePlus className="w-3 h-3" /></button>
                               {selectedProfileId && <button onClick={() => handleDeleteProfile(selectedProfileId)} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>}
                               <button onClick={handleSaveProfile} className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded"><Save className="w-3 h-3" /></button>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 gap-3">
                            {/* Logo Upload Section */}
                            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 relative group">
                                    {contractor.logo ? (
                                        <>
                                            <img src={contractor.logo} alt="Logo" className="w-full h-full object-cover" />
                                            <button onClick={() => setContractor({...contractor, logo: ''})} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><X className="w-5 h-5 text-white" /></button>
                                        </>
                                    ) : (
                                        <ImageIcon className="w-6 h-6 text-slate-300" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">Business Logo</p>
                                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-100 transition">
                                        <Upload className="w-3 h-3" /> Upload
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} />
                                    </label>
                                </div>
                            </div>

                            <select 
                                value={contractor.businessCategory || ''} 
                                onChange={(e) => setContractor({...contractor, businessCategory: e.target.value})} 
                                className="input-field text-sm font-medium"
                            >
                                <option value="">Select Business Category</option>
                                {BUSINESS_CATEGORIES.map(group => (
                                    <optgroup key={group.name} label={group.name}>
                                        {group.categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <input type="text" placeholder={t.company} value={contractor.companyName} onChange={e => setContractor({...contractor, companyName: e.target.value})} className="input-field" />
                            <div className="flex gap-2">
                               <input type="text" placeholder={t.name} value={contractor.name} onChange={e => setContractor({...contractor, name: e.target.value})} className="input-field" />
                               <input type="tel" placeholder={t.phone} value={contractor.phone} onChange={e => setContractor({...contractor, phone: e.target.value})} className="input-field" />
                            </div>
                            <input type="email" placeholder="Email Address" value={contractor.email} onChange={e => setContractor({...contractor, email: e.target.value})} className="input-field" />
                            <input type="text" placeholder="Website URL" value={contractor.website} onChange={e => setContractor({...contractor, website: e.target.value})} className="input-field" />
                            <input type="text" placeholder="GSTIN (Optional)" value={contractor.gstin} onChange={e => setContractor({...contractor, gstin: e.target.value})} className="input-field" />
                         </div>
                      </div>

                      {/* Client Details */}
                      <div className="card p-4 space-y-4">
                         <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="font-bold flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> {t.clientDetails}</h2>
                            <div className="flex gap-1">
                               <select className="bg-slate-50 dark:bg-slate-800 text-xs p-1.5 rounded outline-none max-w-[100px]" value={selectedClientId} onChange={(e) => handleLoadClientProfile(e.target.value)}><option value="">Load Client</option>{filteredClientProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                               <button onClick={handleNewClientProfile} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded"><FilePlus className="w-3 h-3" /></button>
                               {selectedClientId && <button onClick={() => handleDeleteClientProfile(selectedClientId)} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>}
                               <button onClick={handleSaveClientProfile} className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded"><Save className="w-3 h-3" /></button>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 gap-3">
                            <input type="text" placeholder="Client Name" value={client.name} onChange={e => setClient({...client, name: e.target.value})} className="input-field" />
                            <input type="tel" placeholder="Phone" value={client.phone} onChange={e => setClient({...client, phone: e.target.value})} className="input-field" />
                            <textarea placeholder="Address" value={client.address} onChange={e => setClient({...client, address: e.target.value})} className="input-field h-20" />
                         </div>
                      </div>

                      <div className="card p-4 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <span className="text-sm font-bold flex items-center gap-2"><Wallet className="w-4 h-4 text-indigo-500" /> Project Expenses</span>
                          <button onClick={() => setIsExpensesModalOpen(true)} className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded font-bold hover:bg-slate-200 transition">Manage</button>
                      </div>

                      <button onClick={() => validateAndSwitchToItems()} className="w-full btn-primary py-4 text-lg shadow-xl flex items-center justify-center gap-2">Next: Items <ArrowRight className="w-5 h-5" /></button>
                   </div>
                )}

                {/* STEP 2: ITEMS */}
                {createStep === 'items' && (
                   <div className="space-y-4 animate-slide-up">
                      {/* Sticky Total Header */}
                      <div className="sticky top-[130px] z-20 bg-slate-900 text-white p-3 rounded-xl shadow-lg flex justify-between items-center -mx-2 sm:mx-0">
                         <span className="text-xs font-medium opacity-80 uppercase tracking-wide">Total Amount</span>
                         <span className="text-xl font-bold font-mono">₹{totals.grandTotal.toFixed(0)}</span>
                      </div>

                      {/* Collapsible Add Form */}
                      <div className="card overflow-hidden transition-all shadow-md">
                         <div className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${isAddItemOpen ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-white dark:bg-slate-900'}`} onClick={() => setIsAddItemOpen(!isAddItemOpen)}>
                            <h3 className="font-bold text-sm flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                               {editingId ? <><Pencil className="w-4 h-4" /> Edit Item</> : <><Plus className="w-4 h-4" /> Add New Item</>}
                            </h3>
                            {isAddItemOpen ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                         </div>
                         
                         {isAddItemOpen && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                               <div className="grid grid-cols-12 gap-3 mb-4">
                                  {/* Unit Selection */}
                                  <div className={`col-span-12 ${showFloorInput ? 'sm:col-span-2' : 'sm:col-span-3'}`}>
                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">UNIT</label>
                                      <select 
                                        className="input-field text-sm p-2 text-center" 
                                        value={currentItem.unit} 
                                        onChange={e => setCurrentItem({...currentItem, unit: e.target.value as any})}
                                      >
                                        <optgroup label="Suggested">
                                            {priorityOptions.map(u => (
                                                <option key={u.value} value={u.value}>{u.label}</option>
                                            ))}
                                        </optgroup>
                                        {otherOptions.length > 0 && (
                                            <optgroup label="Others">
                                                {otherOptions.map(u => (
                                                    <option key={u.value} value={u.value}>{u.label}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                      </select>
                                  </div>
                                  
                                  {/* Floor / Location - Conditionally Visible */}
                                  {showFloorInput && (
                                    <div className="col-span-12 sm:col-span-2">
                                        <label className="text-[10px] font-bold text-slate-400 block mb-1">FLOOR/LOC</label>
                                        <input list="floors" className="input-field text-sm p-2" placeholder="Loc" value={currentItem.floor || ''} onChange={e => setCurrentItem({...currentItem, floor: e.target.value})} />
                                        <datalist id="floors">{Object.values(t.floors).map(f => <option key={f} value={f} />)}</datalist>
                                    </div>
                                  )}
                                  
                                  {/* Description - Spans more if floor is hidden */}
                                  <div className={`col-span-12 ${showFloorInput ? 'sm:col-span-8' : 'sm:col-span-9'} relative`}>
                                     <label className="text-[10px] font-bold text-slate-400 block mb-1">DESCRIPTION</label>
                                     <input type="text" className="input-field text-sm p-2 w-full font-bold" placeholder="Item Name" value={currentItem.description} onChange={e => handleDescriptionChange(e.target.value)} onFocus={() => currentItem.description && setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} />
                                     {showSuggestions && suggestions.length > 0 && <ul className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">{suggestions.map((s,i) => <li key={i} onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }} className="px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">{s}</li>)}</ul>}
                                  </div>
                                  
                                  {/* Dimensions Row - Show only if Construction Mode */}
                                  {isConstructionMode && !isSimpleUnit && (
                                     <>
                                        <div className="col-span-4"><label className="text-[10px] font-bold text-slate-400 block mb-1">LENGTH</label><input type="number" inputMode="decimal" className="input-field text-center p-2 text-sm" placeholder="0" value={currentItem.length || ''} onChange={e => setCurrentItem({...currentItem, length: parseFloat(e.target.value)})} onFocus={e => e.target.select()} /></div>
                                        {!isLinear && <div className="col-span-4"><label className="text-[10px] font-bold text-slate-400 block mb-1">WIDTH</label><input type="number" inputMode="decimal" className="input-field text-center p-2 text-sm" placeholder="0" value={currentItem.width || ''} onChange={e => setCurrentItem({...currentItem, width: parseFloat(e.target.value)})} onFocus={e => e.target.select()} /></div>}
                                        {isVolumetric && <div className="col-span-4"><label className="text-[10px] font-bold text-slate-400 block mb-1">HEIGHT</label><input type="number" inputMode="decimal" className="input-field text-center p-2 text-sm" placeholder="0" value={currentItem.height || ''} onChange={e => setCurrentItem({...currentItem, height: parseFloat(e.target.value)})} onFocus={e => e.target.select()} /></div>}
                                     </>
                                  )}
                                  
                                  <div className="col-span-6 sm:col-span-2"><label className="text-[10px] font-bold text-slate-400 block mb-1">QTY</label><input type="number" inputMode="decimal" className="input-field text-center p-2 text-lg font-bold" placeholder="1" value={currentItem.quantity || ''} onChange={e => setCurrentItem({...currentItem, quantity: parseFloat(e.target.value)})} onFocus={e => e.target.select()} /></div>
                                  <div className="col-span-6 sm:col-span-2"><label className="text-[10px] font-bold text-slate-400 block mb-1">RATE</label><input type="number" inputMode="decimal" className="input-field text-center p-2 text-lg font-bold" placeholder="0" value={currentItem.rate || ''} onChange={e => setCurrentItem({...currentItem, rate: parseFloat(e.target.value)})} onFocus={e => e.target.select()} /></div>
                                  
                                  <div className="col-span-12 mt-2">
                                     <div className="bg-slate-900 text-green-400 p-4 rounded-xl flex justify-between items-center font-mono font-bold shadow-inner">
                                        <span className="text-xs text-slate-500 uppercase tracking-widest">Amount</span>
                                        <span className="text-2xl">₹{calculateAmount(currentItem.length || 0, currentItem.width || 0, currentItem.height || 0, currentItem.quantity || 1, currentItem.rate || 0, currentItem.unit || 'sq.ft').toFixed(0)}</span>
                                     </div>
                                  </div>
                                </div>
                               
                               <div className="flex gap-3">
                                  <button onClick={() => setIsVoiceModalOpen(true)} className="w-16 h-14 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none animate-pulse hover:animate-none active:scale-95 transition"><Mic className="w-7 h-7 text-white" /></button>
                                  <button onClick={handleAddItem} disabled={!currentItem.description || !currentItem.rate} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 text-lg">{editingId ? 'Update Item' : 'Add Item'}</button>
                                </div>
                            </div>
                         )}
                      </div>

                      {/* Items List */}
                      <div className="space-y-3">
                         {filteredItems.map((item, idx) => (
                            <SwipeableItem key={item.id} item={item} index={idx} onDelete={handleRemoveItem} onEdit={handleEditItem} />
                         ))}
                         {items.length === 0 && <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm font-medium border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">No items yet.<br/>Tap the Mic or Add button above to start.</div>}
                      </div>

                      <button onClick={() => validateAndNext('summary')} disabled={items.length === 0} className="w-full btn-primary py-4 text-lg shadow-xl flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed">Next: Summary <ArrowRight className="w-5 h-5" /></button>
                   </div>
                )}

                {/* STEP 3: SUMMARY */}
                {createStep === 'summary' && (
                   <div className="space-y-4 animate-slide-up">
                      <div className="card p-5 space-y-4 border-l-4 border-indigo-500">
                         <h2 className="font-bold text-lg">Bill Summary</h2>
                         <div className="flex justify-between text-sm"><span>Sub Total</span><span className="font-bold">₹{totals.subTotal.toFixed(2)}</span></div>
                         <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /> Add GST</label>
                            {gstEnabled && <div className="flex items-center gap-1"><input type="number" value={gstRate} onChange={e => setGstRate(parseFloat(e.target.value))} className="w-12 bg-slate-100 p-1.5 rounded text-center text-sm font-bold" />%</div>}
                         </div>
                         {gstEnabled && <div className="flex justify-between text-sm text-slate-500"><span>GST Amount</span><span>₹{totals.gst.toFixed(2)}</span></div>}
                         <div className="flex justify-between items-end pt-3 border-t border-slate-200 dark:border-slate-700"><span className="font-bold text-lg">Grand Total</span><span className="font-extrabold text-3xl text-indigo-600 dark:text-indigo-400">₹{totals.grandTotal.toFixed(0)}</span></div>
                      </div>

                      {documentType === 'invoice' && (
                         <div className="card p-4 space-y-3">
                            <h3 className="font-bold text-sm uppercase text-slate-500">{t.paymentHistory}</h3>
                            {payments.map(p => <div key={p.id} className="flex justify-between text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-lg"><span>{new Date(p.date).toLocaleDateString()}</span><span className="font-bold text-green-600 dark:text-green-400">₹{p.amount}</span><button onClick={() => handleDeletePayment(p.id)}><X className="w-4 h-4 text-slate-400" /></button></div>)}
                            <div className="flex gap-2">
                               <input type="number" placeholder="Amount" value={newPaymentAmount} onChange={e => setNewPaymentAmount(e.target.value)} className="input-field py-2 font-bold" />
                               <button onClick={handleAddPayment} className="bg-green-600 text-white px-4 rounded-xl shadow-lg active:scale-95 transition"><Plus className="w-6 h-6" /></button>
                            </div>
                            <div className="bg-indigo-600 text-white p-4 rounded-xl flex justify-between font-bold shadow-lg"><span>Balance Due</span><span>₹{totals.balance.toFixed(0)}</span></div>
                         </div>
                      )}

                      {/* Optional Bank Details Section */}
                      <div className="card p-4 space-y-4 border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                              <h3 className="font-bold text-sm flex items-center gap-2"><Landmark className="w-4 h-4 text-indigo-500" /> Bank Account Details</h3>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={includeBankDetails} onChange={e => setIncludeBankDetails(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                              </label>
                          </div>
                          
                          {includeBankDetails && (
                              <div className="grid grid-cols-1 gap-3 pt-2 animate-in slide-in-from-top-2">
                                  <div className="grid grid-cols-2 gap-3">
                                      <div><label className="text-[10px] text-slate-400 font-bold block mb-1">BANK NAME</label><input type="text" placeholder="Bank" value={contractor.bankDetails?.bankName} onChange={e => setContractor({...contractor, bankDetails: {...contractor.bankDetails!, bankName: e.target.value}})} className="input-field text-xs p-2" /></div>
                                      <div><label className="text-[10px] text-slate-400 font-bold block mb-1">IFSC CODE</label><input type="text" placeholder="IFSC" value={contractor.bankDetails?.ifscCode} onChange={e => setContractor({...contractor, bankDetails: {...contractor.bankDetails!, ifscCode: e.target.value.toUpperCase()}})} className="input-field text-xs p-2 uppercase" /></div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div><label className="text-[10px] text-slate-400 font-bold block mb-1">ACCOUNT NO</label><input type="text" placeholder="Acc No" value={contractor.bankDetails?.accountNumber} onChange={e => setContractor({...contractor, bankDetails: {...contractor.bankDetails!, accountNumber: e.target.value}})} className="input-field text-xs p-2" /></div>
                                      <div><label className="text-[10px] text-slate-400 font-bold block mb-1">UPI ID</label><input type="text" placeholder="UPI ID" value={contractor.bankDetails?.upiId} onChange={e => setContractor({...contractor, bankDetails: {...contractor.bankDetails!, upiId: e.target.value}})} className="input-field text-xs p-2" /></div>
                                  </div>
                                  <div><label className="text-[10px] text-slate-400 font-bold block mb-1">ACCOUNT HOLDER</label><input type="text" placeholder="Holder Name" value={contractor.bankDetails?.holderName} onChange={e => setContractor({...contractor, bankDetails: {...contractor.bankDetails!, holderName: e.target.value}})} className="input-field text-xs p-2" /></div>
                                  
                                  {/* Payment QR Upload */}
                                  <div className="flex items-center gap-3 mt-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                      <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden">
                                          {contractor.upiQrCode ? <img src={contractor.upiQrCode} alt="QR" className="w-full h-full object-cover" /> : <QrCode className="w-6 h-6 text-slate-300" />}
                                      </div>
                                      <div className="flex-1">
                                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment QR Code</p>
                                          <label className="text-[10px] text-indigo-600 font-bold cursor-pointer hover:underline">
                                              Upload Image <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'upiQrCode')} />
                                          </label>
                                          {contractor.upiQrCode && <button onClick={() => setContractor({...contractor, upiQrCode: ''})} className="ml-2 text-[10px] text-red-500 font-bold hover:underline">Remove</button>}
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="card p-4">
                         <label className="text-xs font-bold text-slate-400 block mb-2">{t.disclaimer}</label>
                         <textarea className="input-field text-xs" rows={2} value={disclaimer} onChange={e => setDisclaimer(e.target.value)} placeholder="Terms..." />
                      </div>

                      <div className="flex gap-3 pt-4">
                         <button onClick={handleSaveBill} className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 shadow-sm flex justify-center items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition"><Save className="w-5 h-5" /> Save</button>
                         <button onClick={() => setIsShareModalOpen(true)} className="flex-[2] py-4 bg-green-600 text-white rounded-xl font-bold shadow-xl flex justify-center items-center gap-2 active:scale-95 transition"><Share2 className="w-5 h-5" /> Share / Export</button>
                      </div>
                   </div>
                )}
             </div>
          </div>
        )}

        {/* --- VIEW: HISTORY --- */}
        {currentView === 'history' && (
           <Suspense fallback={<LoadingFallback />}>
              <HistoryModal 
                 isOpen={true} 
                 onClose={() => setCurrentView('create')} 
                 history={historyItems} trash={trashItems} onLoad={handleLoadBill} 
                 onDelete={handleDeleteBill} onRestore={handleRestoreBill} onPermanentDelete={handlePermanentDelete} 
                 onUpdateStatus={handleUpdateHistoryStatus} onUpdateEstimateStatus={handleUpdateEstimateStatus} 
                 onConvertToInvoice={handleConvertToInvoice} onDownloadPdf={handleHistoryDownloadPdf} onDownloadExcel={handleHistoryDownloadExcel} 
              />
           </Suspense>
        )}

        {/* --- VIEW: ANALYTICS --- */}
        {currentView === 'analytics' && (
           <Suspense fallback={<LoadingFallback />}>
              <DashboardModal isOpen={true} onClose={() => setCurrentView('create')} history={historyItems} />
           </Suspense>
        )}

        {/* --- VIEW: PROFILE/MENU --- */}
        {currentView === 'profile' && (
           <Suspense fallback={<LoadingFallback />}>
              <ProfileModal isOpen={true} onClose={() => setCurrentView('create')} user={user} planDetails={getPlanDetails()} onLogout={() => { logoutUser(); setUser(null); }} onBackup={handleCloudBackup} onRestore={handleCloudRestore} onUpgrade={() => setShowSubscription(true)} isSyncing={isSyncing} />
           </Suspense>
        )}

      </main>

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-bottom z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
         <div className="flex justify-around items-center h-16 max-w-4xl mx-auto px-2">
            <button onClick={() => { setCurrentView('create'); setCreateStep('parties'); }} className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative group ${currentView === 'create' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}>
               {currentView === 'create' && <div className="absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-b-full"></div>}
               <FilePlus className={`w-6 h-6 transition-transform group-active:scale-90 ${currentView === 'create' ? 'fill-indigo-100 dark:fill-indigo-900' : ''}`} />
               <span className="text-[10px] font-bold">Create</span>
            </button>
            <button onClick={() => setCurrentView('history')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative group ${currentView === 'history' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}>
               {currentView === 'history' && <div className="absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-b-full"></div>}
               <Clock className={`w-6 h-6 transition-transform group-active:scale-90 ${currentView === 'history' ? 'fill-indigo-100 dark:fill-indigo-900' : ''}`} />
               <span className="text-[10px] font-bold">History</span>
            </button>
            <button onClick={() => setCurrentView('analytics')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative group ${currentView === 'analytics' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}>
               {currentView === 'analytics' && <div className="absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-b-full"></div>}
               <PieChart className={`w-6 h-6 transition-transform group-active:scale-90 ${currentView === 'analytics' ? 'fill-indigo-100 dark:fill-indigo-900' : ''}`} />
               <span className="text-[10px] font-bold">Stats</span>
            </button>
            <button onClick={() => setCurrentView('profile')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative group ${currentView === 'profile' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}>
               {currentView === 'profile' && <div className="absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-b-full"></div>}
               <Menu className="w-6 h-6 transition-transform group-active:scale-90" />
               <span className="text-[10px] font-bold">Menu</span>
            </button>
         </div>
      </div>

      {/* --- MODALS (Overlays) --- */}
      <Suspense fallback={<LoadingFallback />}>
         {isCalcOpen && <CalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />}
         {isVoiceModalOpen && <VoiceEntryModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} onConfirm={handleVoiceConfirm} />}
         {isShareModalOpen && <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} onShareText={handleShareText} onSharePdf={(s) => handleShareFile('pdf', s)} onShareExcel={(s) => handleShareFile('excel', s)} onDownloadPdf={(s) => handleDownloadFile('pdf', s)} onDownloadExcel={(s) => handleDownloadFile('excel', s)} previewText={generateBillText()} documentType={documentType} />}
         {isExpensesModalOpen && <ExpensesModal isOpen={isExpensesModalOpen} onClose={() => setIsExpensesModalOpen(false)} expenses={expenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} onSetExpenses={handleSetExpenses} billTotal={totals.grandTotal} />}
      </Suspense>
    </div>
  );
};

export default App;
