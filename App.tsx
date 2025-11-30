
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Download, FileText, X, Calculator, Pencil, Clock, Save, Search, AlertCircle, Image as ImageIcon, Upload, Instagram, Facebook, Youtube, Twitter, Linkedin, MessageCircle, Share2, Users, QrCode, FilePlus, FileDown, Moon, Sun, Mic, Building2, LogOut, Crown, Cloud, RefreshCw, CheckCircle2, User, ChevronRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { BillItem, ClientDetails, ContractorDetails, SavedBillData, SocialLink, SocialPlatform, ContractorProfile, PaymentStatus, PaymentRecord, ParsedBillItem, UserProfile } from './types';
import { APP_TEXT, SUBSCRIPTION_PLANS } from './constants';
import { generateExcel } from './services/excelService';
import { generatePDF } from './services/pdfService';
import { saveDraft, loadDraft, saveToHistory, getHistory, deleteFromHistory, saveProfile, getProfiles, deleteProfile, updateBillStatus, getTrash, restoreFromTrash, permanentDelete } from './services/storageService';
import { getCurrentUser, checkSubscriptionAccess, logoutUser } from './services/authService';
import { initGoogleDrive, backupToDrive, restoreFromDrive } from './services/googleDriveService';
import HistoryModal from './components/HistoryModal';
import CalculatorModal from './components/CalculatorModal';
import VoiceEntryModal from './components/VoiceEntryModal';
import OnboardingFlow from './components/OnboardingFlow';
import SubscriptionPlans from './components/SubscriptionPlans';

const App: React.FC = () => {
  // --- Auth & Subscription State ---
  const [user, setUser] = useState<UserProfile | null>(null);
  const [access, setAccess] = useState<{ hasAccess: boolean; daysLeft: number; isTrial: boolean }>({ hasAccess: false, daysLeft: 0, isTrial: false });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showSubscription, setShowSubscription] = useState(false);

  // --- Cloud Sync State ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('last_sync_time'));

  // --- App Logic ---
  const t = APP_TEXT;

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Bill Metadata
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pending');

  // Contractor Info
  const [contractor, setContractor] = useState<ContractorDetails>({
    name: '',
    companyName: '',
    gstin: '',
    phone: '',
    email: '',
    website: '',
    socialLinks: [],
    accountDetails: '', // Legacy string
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

  // Profiles State
  const [profiles, setProfiles] = useState<ContractorProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');

  // Social Media Input State
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('Instagram');
  const [socialUrl, setSocialUrl] = useState('');

  // Client Info
  const [client, setClient] = useState<ClientDetails>({
    name: '',
    phone: '',
    address: ''
  });

  // Bill Settings
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState<number>(18);
  const [disclaimer, setDisclaimer] = useState<string>('');
  
  // Payment History State
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  // Temp state for new payment entry
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPaymentNote, setNewPaymentNote] = useState('');

  // Bill Items
  const [items, setItems] = useState<BillItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Current Input State
  const [currentItem, setCurrentItem] = useState<Partial<BillItem>>({
    description: '',
    length: 0,
    width: 0,
    quantity: 1,
    rate: 0,
    unit: 'sq.ft',
    floor: ''
  });

  // UI State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'items'>('details');
  const [historyItems, setHistoryItems] = useState<SavedBillData[]>([]);
  const [trashItems, setTrashItems] = useState<SavedBillData[]>([]);

  // --- Check Auth on Mount ---
  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setAccess(checkSubscriptionAccess());
      // Pre-fill contractor details from user profile if empty
      setContractor(prev => ({
        ...prev,
        name: prev.name || currentUser.name,
        phone: prev.phone || currentUser.phone,
        email: prev.email || currentUser.email
      }));
    }
    setIsLoadingAuth(false);
    
    // Initialize Google Drive
    initGoogleDrive().then(() => {
        console.log("Google Drive API Ready");
    });

    // Detect if running in standalone mode (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      console.log("Running in App Mode");
    }
  }, []);

  // --- App Load Effects ---
  useEffect(() => {
    if (!user) return; // Only load app data if logged in
    
    // Recalculate access whenever user changes/reloads to ensure sync
    setAccess(checkSubscriptionAccess());

    setProfiles(getProfiles());
    const draft = loadDraft();
    const history = getHistory();
    setHistoryItems(history);
    setTrashItems(getTrash());

    // Generate Next Bill Number if empty
    let nextBillNum = generateNextBillNumber(history);

    if (draft) {
      // Load Draft
      setContractor({
         ...draft.contractor,
         // Ensure bankDetails structure exists for old drafts
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
      
      // Backward compatibility for advance amount
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
       // New Session - Load last contractor details if available from history
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

  // --- Auto Save Draft ---
  useEffect(() => {
    if (!user) return;
    
    if (items.length > 0 || client.name || contractor.companyName) {
      saveDraft({
        billNumber,
        billDate,
        paymentStatus,
        contractor,
        client,
        items,
        gstEnabled,
        gstRate,
        advanceAmount: '', // Legacy field cleared
        payments,
        disclaimer
      });
    }
  }, [items, client, contractor, gstEnabled, gstRate, billNumber, billDate, paymentStatus, payments, disclaimer, user]);

  // --- Theme Toggle ---
  const toggleTheme = () => {
    const newTheme = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // --- Cloud Sync Handlers ---
  const handleCloudBackup = async () => {
      setIsSyncing(true);
      try {
          const time = await backupToDrive();
          setLastSyncTime(time);
          localStorage.setItem('last_sync_time', time);
          alert("Backup successful!");
      } catch (e) {
          alert("Backup failed. Check console.");
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
              alert("Restore successful! Reloading...");
              window.location.reload();
          }
      } catch (e) {
          alert("Restore failed.");
      } finally {
          setIsSyncing(false);
      }
  };

  const generateNextBillNumber = (history: SavedBillData[]) => {
     if (history.length === 0) return "INV-001";
     
     // Find the most recent bill number
     const lastBill = history[0].billNumber; // "INV-001"
     
     // Extract number part
     const match = lastBill.match(/(\d+)$/);
     if (match) {
        const num = parseInt(match[1]);
        const nextNum = num + 1;
        // Reconstruct string with padding
        const prefix = lastBill.slice(0, match.index);
        const paddedNum = nextNum.toString().padStart(match[0].length, '0');
        return prefix + paddedNum;
     }
     
     return `INV-${(history.length + 1).toString().padStart(3, '0')}`;
  };

  // --- Handlers ---
  const handleAddItem = () => {
    if (!currentItem.description || !currentItem.rate) return;

    // Check if updating
    if (editingId) {
       setItems(items.map(item => 
         item.id === editingId ? {
            ...item,
            description: currentItem.description!,
            length: Number(currentItem.length),
            width: Number(currentItem.width),
            quantity: Number(currentItem.quantity) || 1,
            unit: currentItem.unit!,
            rate: Number(currentItem.rate),
            amount: Number(currentItem.length || 0) * Number(currentItem.unit === 'sq.ft' ? (currentItem.width || 1) : 1) * (Number(currentItem.quantity) || 1) * Number(currentItem.rate),
            floor: currentItem.floor
         } : item
       ));
       setEditingId(null);
    } else {
        const newItem: BillItem = {
          id: Date.now().toString(),
          description: currentItem.description,
          length: Number(currentItem.length),
          width: Number(currentItem.width),
          quantity: Number(currentItem.quantity) || 1,
          unit: currentItem.unit || 'sq.ft',
          rate: Number(currentItem.rate),
          amount: Number(currentItem.length || 0) * Number(currentItem.unit === 'sq.ft' ? (currentItem.width || 1) : 1) * (Number(currentItem.quantity) || 1) * Number(currentItem.rate),
          floor: currentItem.floor
        };
        setItems([...items, newItem]);
    }

    // Reset Form
    setCurrentItem({
      description: '',
      length: 0,
      width: 0,
      quantity: 1,
      rate: 0,
      unit: 'sq.ft',
      floor: currentItem.floor // Keep floor selected for convenience
    });
  };

  const handleEditItem = (item: BillItem) => {
     setEditingId(item.id);
     setCurrentItem(item);
     // Switch to Items Tab to show form
     setActiveTab('items');
     // Scroll to top of form
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
     setEditingId(null);
     setCurrentItem({
        description: '',
        length: 0,
        width: 0,
        quantity: 1,
        rate: 0,
        unit: 'sq.ft',
        floor: currentItem.floor
     });
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleVoiceConfirm = (parsed: ParsedBillItem) => {
    setCurrentItem({
      description: parsed.description,
      length: parsed.length,
      width: parsed.width,
      quantity: parsed.quantity,
      rate: parsed.rate,
      unit: parsed.width === 0 || parsed.width === 1 ? 'rft' : 'sq.ft', // Simple heuristic
      floor: parsed.floor
    });
    setIsVoiceModalOpen(false);
  };

  // Payment Handlers
  const handleAddPayment = () => {
    const amt = parseFloat(newPaymentAmount);
    if (!newPaymentAmount || isNaN(amt) || amt <= 0) return;

    const newPay: PaymentRecord = {
       id: Date.now().toString(),
       amount: amt,
       date: newPaymentDate, // Allow empty string
       notes: newPaymentNote
    };
    
    setPayments([...payments, newPay]);
    setNewPaymentAmount('');
    setNewPaymentNote('');
    // Keep date as is or reset? Resetting to today usually better
    setNewPaymentDate(new Date().toISOString().split('T')[0]);
  };

  const handleDeletePayment = (id: string) => {
     setPayments(payments.filter(p => p.id !== id));
  };

  const totals = useMemo(() => {
    const subTotal = items.reduce((acc, item) => acc + item.amount, 0);
    const totalArea = items.reduce((acc, item) => {
       // Only sum area for sq.ft items usually, or all? 
       // Keeping simple sum of calculated area column
       let area = 0;
       if (item.unit === 'sq.ft') area = item.length * item.width * (item.quantity || 1);
       else if (item.unit === 'rft') area = item.length * (item.quantity || 1);
       else area = item.quantity || 0;
       return acc + area;
    }, 0);
    
    const rate = gstRate || 18;
    const gst = gstEnabled ? subTotal * (rate / 100) : 0;
    const grandTotal = subTotal + gst;
    
    // Sum all payments
    const advance = payments ? payments.reduce((sum, p) => sum + p.amount, 0) : 0;
    const balance = grandTotal - advance;

    return { subTotal, totalArea, gst, grandTotal, advance, balance };
  }, [items, gstEnabled, gstRate, payments]);

  const handleSaveBill = () => {
    const saved = saveToHistory({
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
      disclaimer
    });
    setHistoryItems([saved, ...historyItems]);
    alert(t.billSaved);
  };

  const handleNewBill = () => {
     if (items.length > 0 && !window.confirm("Clear current bill and start new? Unsaved changes will be lost.")) {
        return;
     }
     
     // Reset Client & Items & Payments
     setClient({ name: '', phone: '', address: '' });
     setItems([]);
     setPayments([]);
     setBillNumber(generateNextBillNumber(historyItems));
     setBillDate(new Date().toISOString().split('T')[0]);
     setPaymentStatus('Pending');
     // Keep Contractor & Settings
  };

  const handleLoadBill = (bill: SavedBillData) => {
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

    // Handle payments migration
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
  };

  const handleDeleteBill = (id: string) => {
     deleteFromHistory(id);
     // Update local state
     setHistoryItems(getHistory());
     setTrashItems(getTrash());
  };

  const handleRestoreBill = (id: string) => {
     restoreFromTrash(id);
     setHistoryItems(getHistory());
     setTrashItems(getTrash());
  };

  const handlePermanentDelete = (id: string) => {
     permanentDelete(id);
     setTrashItems(getTrash());
  };

  const handleUpdateHistoryStatus = (id: string, status: PaymentStatus) => {
     updateBillStatus(id, status);
     setHistoryItems(getHistory());
  };

  // Profile Handlers
  const handleSaveProfile = () => {
     const newProfile = saveProfile(contractor);
     setProfiles([...profiles, newProfile]);
     setSelectedProfileId(newProfile.id);
     alert(t.profileSaved);
  };

  const handleLoadProfile = (id: string) => {
     const profile = profiles.find(p => p.id === id);
     if (profile) {
        setContractor(profile.details);
        setSelectedProfileId(id);
     }
  };

  const handleDeleteProfile = (id: string) => {
     if(window.confirm(t.confirmDelete)) {
        deleteProfile(id);
        setProfiles(profiles.filter(p => p.id !== id));
        if (selectedProfileId === id) setSelectedProfileId('');
     }
  };

  // Image Upload Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'upiQrCode') => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate size (max 500KB)
      if (file.size > 500 * 1024) {
         alert("Image too large. Please select an image under 500KB to prevent app freezing.");
         return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setContractor(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSocialAdd = () => {
     if (socialUrl) {
        const newLink: SocialLink = {
           platform: selectedPlatform,
           url: socialUrl
        };
        setContractor({
           ...contractor,
           socialLinks: [...contractor.socialLinks, newLink]
        });
        setSocialUrl('');
     }
  };

  const handleSocialDelete = (index: number) => {
     const updated = [...contractor.socialLinks];
     updated.splice(index, 1);
     setContractor({ ...contractor, socialLinks: updated });
  };

  const handleShare = async () => {
     const text = `Bill from ${contractor.companyName || contractor.name} for ${client.name}. Total: ₹${totals.grandTotal}`;
     if (navigator.share) {
        try {
           await navigator.share({
              title: 'POP Bill',
              text: text,
              url: window.location.href
           });
        } catch (e) {
           console.log("Share failed or cancelled");
        }
     } else {
        // WhatsApp fallback
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
     }
  };

  // Direct History Download Handlers
  const handleHistoryDownloadPdf = (bill: SavedBillData) => {
      // Reconstruct totals
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

      // Sanitize Filename
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
         bill.billDate || new Date(bill.timestamp).toISOString().split('T')[0]
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
         bill.billDate || new Date(bill.timestamp).toISOString().split('T')[0]
      );
  };

  // --- Filtered Items ---
  const filteredItems = useMemo(() => {
     if (!searchQuery) return items;
     return items.filter(item => item.description.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [items, searchQuery]);
  
  // --- Helpers ---
  const getPlanDetails = () => {
     if (access.isTrial) return { name: "Free Trial", expiry: `${access.daysLeft} days remaining` };
     
     const plan = SUBSCRIPTION_PLANS.find(p => p.id === user?.planId);
     const date = user?.subscriptionEndDate ? new Date(user.subscriptionEndDate).toLocaleDateString() : "";
     
     return { 
        name: plan ? plan.name : "Unknown Plan", 
        expiry: `Valid until ${date}`
     };
  };

  // --- Auth Render ---
  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-indigo-600"><div className="animate-spin text-2xl">⏳</div></div>;
  }

  if (!user) {
    return <OnboardingFlow onComplete={(newUser) => {
       setUser(newUser);
       // Sync access immediately to prevent "Trial Expired" flash
       setAccess(checkSubscriptionAccess());
    }} />;
  }
  
  // If no access (expired), force subscription screen
  if (!access.hasAccess) {
     return (
        <>
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
             <span className="font-bold text-lg">POP Bill Master</span>
             <button onClick={() => { logoutUser(); setUser(null); }} className="text-sm underline opacity-80">Logout</button>
          </div>
          <SubscriptionPlans 
            onSuccess={(updatedUser) => {
               setUser(updatedUser);
               setAccess(checkSubscriptionAccess());
            }} 
            planId={user.planId}
            remainingDays={access.daysLeft}
          />
        </>
     );
  }
  
  // If Voluntary Subscription Check
  if (showSubscription) {
     return (
        <SubscriptionPlans 
           onSuccess={(updatedUser) => {
              setUser(updatedUser);
              setAccess(checkSubscriptionAccess());
              setShowSubscription(false);
           }} 
           planId={user.planId}
           remainingDays={access.daysLeft}
           onBack={() => setShowSubscription(false)}
        />
     );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-40 font-inter text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* --- HEADER --- */}
      <header className="bg-indigo-600 dark:bg-indigo-950 text-white shadow-lg sticky top-0 z-30 safe-area-top">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8" />
              {t.appTitle}
              {access.isTrial && (
                 <span className="text-[10px] bg-indigo-500 px-1.5 py-0.5 rounded-full border border-indigo-400 whitespace-nowrap leading-none self-center mt-0.5">
                   Trial: {access.daysLeft}d
                 </span>
              )}
            </h1>
            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-indigo-500 dark:hover:bg-indigo-800 transition">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => setIsHistoryModalOpen(true)}
                className="p-2 rounded-full hover:bg-indigo-500 dark:hover:bg-indigo-800 transition relative"
              >
                <Clock className="w-5 h-5" />
                {historyItems.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>}
              </button>
              <button 
                onClick={handleNewBill}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                 <FilePlus className="w-4 h-4" /> <span className="hidden sm:inline">{t.newBill}</span>
              </button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex bg-indigo-700/50 dark:bg-indigo-900/50 p-1 rounded-xl">
             <button 
               onClick={() => setActiveTab('details')}
               className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'details' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow' : 'text-indigo-100 hover:bg-indigo-600/50'}`}
             >
               Contractor/Business & Client Details
             </button>
             <button 
               onClick={() => setActiveTab('items')}
               className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'items' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow' : 'text-indigo-100 hover:bg-indigo-600/50'}`}
             >
               {t.addItem} ({items.length})
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6">

        {/* --- DASHBOARD BANNERS --- */}
        
        {/* Trial Banner - Last Day */}
        {access.isTrial && access.daysLeft === 1 && (
           <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 flex justify-between items-center shadow-sm animate-pulse">
             <div>
                <h3 className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                   <AlertTriangle className="w-5 h-5" /> Your Trial Ends Tomorrow
                </h3>
                <p className="text-sm text-amber-600 dark:text-amber-300">Subscribe now to avoid interruption.</p>
             </div>
             <button 
               onClick={() => setShowSubscription(true)}
               className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow transition"
             >
                Subscribe Now
             </button>
           </div>
        )}

        {/* Paid Plan Renewal Banner (3 Days or less) */}
        {!access.isTrial && access.hasAccess && access.daysLeft <= 3 && (
           <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800 flex justify-between items-center shadow-sm">
             <div>
                <h3 className="font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2">
                   <RefreshCw className="w-5 h-5" /> Plan Expiring Soon
                </h3>
                <p className="text-sm text-orange-600 dark:text-orange-300">Your plan expires in {access.daysLeft} day{access.daysLeft !== 1 ? 's' : ''}.</p>
             </div>
             <button 
               onClick={() => setShowSubscription(true)}
               className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow transition"
             >
                Renew Plan
             </button>
           </div>
        )}

        {/* --- DETAILS TAB --- */}
        {activeTab === 'details' && (
          <div className="space-y-4 animate-in slide-in-from-left duration-300">
            
            {/* Cloud Sync & Profile Settings Section */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <User className="w-5 h-5 text-indigo-500" />
                      {user.name} 
                      {user.planId !== 'trial' && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                   </h3>
                   <div className="flex gap-2">
                      <button 
                        onClick={handleCloudBackup}
                        disabled={isSyncing}
                        className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition"
                        title="Backup to Google Drive"
                      >
                         <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-pulse text-indigo-500' : ''}`} />
                      </button>
                      <button 
                        onClick={handleCloudRestore}
                        disabled={isSyncing}
                        className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 transition"
                        title="Restore from Google Drive"
                      >
                         <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      </button>
                      <button onClick={() => { logoutUser(); setUser(null); }} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40">
                         <LogOut className="w-4 h-4" />
                      </button>
                   </div>
                </div>
                
                {/* Profile Manager */}
                <div className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                   <select 
                      className="flex-1 bg-transparent dark:text-white outline-none text-sm"
                      value={selectedProfileId}
                      onChange={(e) => handleLoadProfile(e.target.value)}
                   >
                      <option value="">{t.selectProfile}</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <button onClick={handleSaveProfile} className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-200">
                      {t.saveProfile}
                   </button>
                   {selectedProfileId && (
                      <button onClick={() => handleDeleteProfile(selectedProfileId)} className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200">
                         <Trash2 className="w-3 h-3" />
                      </button>
                   )}
                </div>

                {/* Plan Status Card */}
                <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                   <div>
                      <p className="text-xs text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider">Current Plan</p>
                      <div className="font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                         {getPlanDetails().name}
                         {access.isTrial && <span className="bg-indigo-200 text-indigo-800 text-[10px] px-1.5 rounded">Trial</span>}
                      </div>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                        {getPlanDetails().expiry}
                      </p>
                   </div>
                   <button 
                     onClick={() => setShowSubscription(true)} 
                     className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold shadow-sm hover:bg-indigo-700 transition flex items-center gap-1"
                   >
                      {access.isTrial ? 'Upgrade' : 'View Plans'} <ChevronRight className="w-3 h-3" />
                   </button>
                </div>
            </div>

            {/* Bill Info Card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-400 mb-1">{t.billNumber}</label>
                   <input 
                     type="text" 
                     value={billNumber}
                     onChange={(e) => setBillNumber(e.target.value)}
                     className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg font-mono font-bold text-lg dark:text-white focus:ring-2 focus:ring-indigo-500 p-2"
                   />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">{t.billDate}</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg font-mono font-bold text-lg dark:text-white focus:ring-2 focus:ring-indigo-500 p-2"
                      />
                    </div>
                </div>
            </div>

            {/* Contractor Form */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              <h2 className="text-lg font-bold border-b dark:border-slate-800 pb-2 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" /> {t.contractorDetails}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo Upload */}
                <div className="sm:col-span-2 flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                   {contractor.logo ? (
                     <div className="relative group">
                       <img src={contractor.logo} alt="Logo" className="w-16 h-16 object-contain bg-white rounded-lg shadow-sm" />
                       <button onClick={() => setContractor({...contractor, logo: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition">
                         <X className="w-3 h-3" />
                       </button>
                     </div>
                   ) : (
                     <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-300">
                       <ImageIcon className="w-8 h-8" />
                     </div>
                   )}
                   <div className="flex-1">
                     <label className="cursor-pointer bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition inline-block">
                        <Upload className="w-4 h-4 inline mr-2" /> {contractor.logo ? 'Change Logo' : t.uploadLogo}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} />
                     </label>
                     <p className="text-xs text-slate-400 mt-1">Max 500KB. PNG/JPG recommended.</p>
                   </div>
                </div>

                <div className="sm:col-span-2">
                   <input type="text" placeholder={t.company} value={contractor.companyName} onChange={e => setContractor({...contractor, companyName: e.target.value})} className="input-field font-bold text-lg" />
                </div>
                
                <input type="text" placeholder={t.gstin} value={contractor.gstin || ''} onChange={e => setContractor({...contractor, gstin: e.target.value.toUpperCase()})} className="input-field uppercase" />
                
                <input type="text" placeholder={t.name} value={contractor.name} onChange={e => setContractor({...contractor, name: e.target.value})} className="input-field" />
                <input type="tel" inputMode="numeric" placeholder={t.phone} value={contractor.phone} onChange={e => setContractor({...contractor, phone: e.target.value})} className="input-field" />
                <input type="email" placeholder={t.email} value={contractor.email} onChange={e => setContractor({...contractor, email: e.target.value})} className="input-field" />
                <input type="text" placeholder={t.website} value={contractor.website} onChange={e => setContractor({...contractor, website: e.target.value})} className="input-field" />
                
                {/* Social Media List */}
                <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{t.social}</label>
                   
                   {contractor.socialLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                         {contractor.socialLinks.map((link, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-700 px-3 py-1.5 rounded-full shadow-sm text-sm border border-slate-200 dark:border-slate-600">
                               {link.platform === 'Instagram' && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                               {link.platform === 'Facebook' && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                               {link.platform === 'YouTube' && <Youtube className="w-3.5 h-3.5 text-red-600" />}
                               {link.platform === 'Twitter' && <Twitter className="w-3.5 h-3.5 text-sky-500" />}
                               {link.platform === 'LinkedIn' && <Linkedin className="w-3.5 h-3.5 text-blue-700" />}
                               {link.platform === 'WhatsApp' && <MessageCircle className="w-3.5 h-3.5 text-green-500" />}
                               <span className="max-w-[100px] truncate text-slate-700 dark:text-slate-200">{link.url}</span>
                               <button onClick={() => handleSocialDelete(idx)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                            </div>
                         ))}
                      </div>
                   )}

                   <div className="flex flex-col sm:flex-row gap-2">
                      <select 
                         className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                         value={selectedPlatform}
                         onChange={(e) => setSelectedPlatform(e.target.value as SocialPlatform)}
                      >
                         {Object.keys(t.platforms).map(p => (
                            <option key={p} value={p}>{t.platforms[p as SocialPlatform]}</option>
                         ))}
                      </select>
                      <input 
                         type="text" 
                         className="flex-1 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                         placeholder={t.urlPlaceholder}
                         value={socialUrl}
                         onChange={(e) => setSocialUrl(e.target.value)}
                      />
                      <button 
                         onClick={handleSocialAdd}
                         disabled={!socialUrl}
                         className="bg-indigo-600 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                         {t.addSocial}
                      </button>
                   </div>
                </div>

                {/* Bank Details (Grid Layout) */}
                <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 border-b dark:border-slate-800 pb-2">
                        <Building2 className="w-4 h-4" /> {t.accountDetails}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 ml-1">{t.bankFields.holderName}</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Rahul Sharma"
                                value={contractor.bankDetails?.holderName || ''} 
                                onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, holderName: e.target.value }})} 
                                className="input-field text-sm" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 ml-1">{t.bankFields.accountNumber}</label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                placeholder="1234xxxxxx"
                                value={contractor.bankDetails?.accountNumber || ''} 
                                onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, accountNumber: e.target.value }})} 
                                className="input-field text-sm" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 ml-1">{t.bankFields.bankName}</label>
                            <input 
                                type="text" 
                                placeholder="e.g. HDFC Bank"
                                value={contractor.bankDetails?.bankName || ''} 
                                onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, bankName: e.target.value }})} 
                                className="input-field text-sm" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 ml-1">{t.bankFields.ifscCode}</label>
                            <input 
                                type="text" 
                                placeholder="HDFC000123"
                                value={contractor.bankDetails?.ifscCode || ''} 
                                onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, ifscCode: e.target.value.toUpperCase() }})} 
                                className="input-field text-sm uppercase" 
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 ml-1">{t.bankFields.upiId}</label>
                            <input 
                                type="text" 
                                placeholder="name@upi"
                                value={contractor.bankDetails?.upiId || ''} 
                                onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, upiId: e.target.value }})} 
                                className="input-field text-sm" 
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 ml-1">{t.bankFields.branchAddress}</label>
                            <input 
                                type="text" 
                                placeholder="Branch location (optional)"
                                value={contractor.bankDetails?.branchAddress || ''} 
                                onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, branchAddress: e.target.value }})} 
                                className="input-field text-sm" 
                            />
                        </div>
                    </div>
                </div>

                {/* QR Code */}
                <div className="sm:col-span-2 flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      {contractor.upiQrCode ? (
                        <img src={contractor.upiQrCode} alt="QR" className="w-12 h-12 rounded bg-white p-1" />
                      ) : (
                        <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded flex items-center justify-center text-slate-300">
                           <QrCode className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                         <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">{t.paymentQr}</h4>
                         <p className="text-xs text-slate-400">{contractor.upiQrCode ? 'QR Added' : 'Add QR for easy payment'}</p>
                      </div>
                    </div>
                    
                    <label className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-semibold text-sm hover:underline">
                        {contractor.upiQrCode ? t.removeQr : t.uploadQr}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                             if(contractor.upiQrCode) setContractor({...contractor, upiQrCode: ''});
                             else handleImageUpload(e, 'upiQrCode');
                          }} 
                        />
                    </label>
                </div>
              </div>
            </div>

            {/* Client Form */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-lg font-bold border-b dark:border-slate-800 pb-2 flex items-center gap-2">
                 <Users className="w-5 h-5 text-indigo-500" /> {t.clientDetails}
              </h2>
              <input type="text" placeholder={t.name} value={client.name} onChange={e => setClient({...client, name: e.target.value})} className="input-field" />
              <input type="tel" inputMode="numeric" placeholder={t.phone} value={client.phone} onChange={e => setClient({...client, phone: e.target.value})} className="input-field" />
              <input type="text" placeholder={t.address} value={client.address} onChange={e => setClient({...client, address: e.target.value})} className="input-field" />
            </div>
            
            <div className="flex justify-end pt-4">
               <button 
                 onClick={() => { setActiveTab('items'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition flex items-center gap-2"
               >
                  Next: Add Items <Plus className="w-5 h-5" />
               </button>
            </div>
          </div>
        )}
        
        {/* ... (Items Tab Remains Unchanged) ... */}
        {activeTab === 'items' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            
            {/* Input Form */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                   {editingId ? t.updateItem : t.addItem}
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition flex items-center gap-1"
                    title={t.voiceEntry}
                  >
                     <Mic className="w-5 h-5" />
                     <span className="text-xs font-bold hidden sm:inline">{t.voiceEntry}</span>
                  </button>
                  <button onClick={() => setIsCalcOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                     <Calculator className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4">
                {/* Floor Selection */}
                <div className="col-span-2 sm:col-span-2">
                   <label className="block text-xs font-bold text-slate-500 mb-1">{t.floor} (Optional)</label>
                   <input 
                      list="floors" 
                      placeholder="e.g. Ground Floor"
                      className="input-field"
                      value={currentItem.floor || ''}
                      onChange={e => setCurrentItem({...currentItem, floor: e.target.value})}
                   />
                   <datalist id="floors">
                      {Object.values(t.floors).map(f => <option key={f} value={f} />)}
                   </datalist>
                </div>

                <div className="col-span-2 sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">{t.description}</label>
                  <input type="text" placeholder="e.g. Living Room Ceiling" className="input-field" value={currentItem.description} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">{t.length}</label>
                  <input type="number" inputMode="decimal" min="0" placeholder="0" className="input-field" value={currentItem.length || ''} onChange={e => setCurrentItem({...currentItem, length: parseFloat(e.target.value)})} disabled={currentItem.unit === 'nos'} />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">{t.width}</label>
                  <input type="number" inputMode="decimal" min="0" placeholder="0" className="input-field" value={currentItem.width || ''} onChange={e => setCurrentItem({...currentItem, width: parseFloat(e.target.value)})} disabled={currentItem.unit !== 'sq.ft'} />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">{t.quantity}</label>
                  <input type="number" inputMode="decimal" min="1" placeholder="1" className="input-field" value={currentItem.quantity || ''} onChange={e => setCurrentItem({...currentItem, quantity: parseFloat(e.target.value)})} />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">{t.unit}</label>
                  <select className="input-field" value={currentItem.unit} onChange={e => setCurrentItem({...currentItem, unit: e.target.value as any})}>
                    <option value="sq.ft">{t.sqft}</option>
                    <option value="rft">{t.rft}</option>
                    <option value="nos">{t.nos}</option>
                  </select>
                </div>
                
                <div className="col-span-1">
                   <label className="block text-xs font-bold text-slate-500 mb-1">{t.rate}</label>
                   <input type="number" inputMode="decimal" min="0" placeholder="0" className="input-field" value={currentItem.rate || ''} onChange={e => setCurrentItem({...currentItem, rate: parseFloat(e.target.value)})} />
                </div>

                <div className="col-span-1 flex items-end">
                   <div className="w-full h-[46px] bg-slate-100 dark:bg-slate-800 px-3 rounded-xl border border-transparent text-right font-bold text-slate-700 dark:text-slate-200 flex items-center justify-end">
                      ₹{((currentItem.length || 0) * (currentItem.unit === 'sq.ft' ? (currentItem.width || 1) : 1) * (currentItem.quantity || 1) * (currentItem.rate || 0)).toFixed(0)}
                   </div>
                </div>
              </div>

              <div className="flex gap-3">
                 {editingId && (
                   <button onClick={handleCancelEdit} className="flex-1 py-3 rounded-xl font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition">
                      {t.cancelEdit}
                   </button>
                 )}
                 <button 
                  onClick={handleAddItem} 
                  disabled={!currentItem.description || !currentItem.rate}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition flex justify-center items-center gap-2"
                >
                  {editingId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingId ? t.updateItem : t.confirm}
                </button>
              </div>
            </div>

            {/* Items List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
               {items.length > 0 && (
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex gap-2">
                     <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder={t.searchPlaceholder}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm outline-none dark:text-white"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                     </div>
                  </div>
               )}
               
               <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                  {filteredItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-slate-600 flex flex-col items-center">
                       <FileText className="w-12 h-12 mb-3 opacity-20" />
                       <p>{t.emptyList}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredItems.map((item, idx) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex justify-between items-start group">
                          <div className="flex gap-3">
                             <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                                {idx + 1}
                             </div>
                             <div>
                               <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 flex-wrap">
                                 {item.description}
                                 {item.floor && (
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                       {item.floor}
                                    </span>
                                 )}
                               </div>
                               <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                 {item.unit === 'sq.ft' && `${item.length} x ${item.width} = ${(item.length * item.width).toFixed(2)} ${t.sqft}`}
                                 {item.unit === 'rft' && `${item.length} ${t.rft}`}
                                 {item.unit === 'nos' && `${t.nos}`}
                                 
                                 {(item.quantity > 1) && (
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 ml-1">
                                       ({item.quantity} Nos)
                                    </span>
                                 )}
                                 
                                 <span className="mx-2 text-slate-300">|</span>
                                 @{item.rate}
                               </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">₹{item.amount.toFixed(0)}</div>
                             <div className="flex justify-end gap-2 mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditItem(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 rounded-md">
                                   <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-800 rounded-md">
                                   <Trash2 className="w-3.5 h-3.5" />
                                </button>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
               
               {items.length > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                     <span>Total Items: {items.length}</span>
                     {filteredItems.length !== items.length && <span>Found: {filteredItems.length}</span>}
                  </div>
               )}
            </div>

            {/* Bill Summary */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
               <h3 className="font-bold text-lg border-b dark:border-slate-800 pb-2 mb-2">{t.billSummary}</h3>
               
               <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{t.subTotal}</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{totals.subTotal.toFixed(2)}</span>
               </div>
               
               <div className="flex items-center justify-between py-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                     <input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                     <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.addGst}</span>
                  </label>
                  {gstEnabled && (
                     <div className="flex items-center gap-2">
                        <input 
                           type="number" 
                           value={gstRate} 
                           onChange={e => setGstRate(parseFloat(e.target.value))} 
                           className="w-12 p-1 text-center bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold outline-none" 
                        />
                        <span className="text-sm">%</span>
                     </div>
                  )}
               </div>

               {gstEnabled && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                     <span>{t.gstAmount} ({gstRate}%)</span>
                     <span className="font-bold text-slate-900 dark:text-white">₹{totals.gst.toFixed(2)}</span>
                  </div>
               )}
               
               <div className="flex justify-between text-xl font-bold text-indigo-700 dark:text-indigo-400 pt-2 border-t dark:border-slate-800">
                  <span>{t.grandTotal}</span>
                  <span>₹{totals.grandTotal.toFixed(2)}</span>
               </div>

               {/* Payment History Section */}
               <div className="pt-4 mt-2 border-t dark:border-slate-800">
                  <h4 className="font-bold text-sm text-slate-500 uppercase mb-3 flex justify-between items-center">
                     {t.paymentHistory}
                     <span className="text-green-600">Total: ₹{totals.advance.toFixed(2)}</span>
                  </h4>
                  
                  {/* Add Payment Form */}
                  <div className="grid grid-cols-12 gap-2 mb-3">
                     <input 
                       type="date" 
                       className="col-span-5 sm:col-span-3 p-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none" 
                       value={newPaymentDate}
                       onChange={e => setNewPaymentDate(e.target.value)}
                     />
                     <div className="col-span-7 sm:col-span-3 relative">
                        <input 
                           type="number" 
                           inputMode="decimal"
                           min="0"
                           className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none" 
                           placeholder="Amount" 
                           value={newPaymentAmount}
                           onChange={e => setNewPaymentAmount(e.target.value)}
                        />
                     </div>
                     <input 
                       type="text" 
                       className="col-span-10 sm:col-span-5 p-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none" 
                       placeholder="Note (e.g. Advance)" 
                       value={newPaymentNote}
                       onChange={e => setNewPaymentNote(e.target.value)}
                     />
                     <button 
                       onClick={handleAddPayment}
                       className="col-span-2 sm:col-span-1 p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 flex items-center justify-center"
                     >
                        <Plus className="w-5 h-5" />
                     </button>
                  </div>

                  {/* Payments List */}
                  {payments.length > 0 && (
                     <div className="space-y-2 mb-4 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                        {payments.map(p => (
                           <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-white dark:bg-slate-800 rounded shadow-sm">
                              <div className="flex flex-col">
                                 <span className="font-bold text-slate-700 dark:text-slate-200">₹{p.amount}</span>
                                 <span className="text-xs text-slate-500">
                                    {p.date ? new Date(p.date).toLocaleDateString() : 'No Date'} {p.notes ? `• ${p.notes}` : ''}
                                 </span>
                              </div>
                              <button onClick={() => handleDeletePayment(p.id)} className="text-red-400 hover:text-red-600">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl flex justify-between items-center border border-indigo-100 dark:border-indigo-800">
                  <span className="font-medium text-indigo-900 dark:text-indigo-200">{t.balanceDue}</span>
                  <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">₹{totals.balance.toFixed(2)}</span>
               </div>
               
               {/* Disclaimer Input */}
               <div className="pt-4">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1">
                     <AlertCircle className="w-3 h-3" /> {t.disclaimer}
                  </label>
                  <textarea 
                     className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                     rows={3}
                     placeholder={t.disclaimerPlaceholder}
                     value={disclaimer}
                     onChange={e => setDisclaimer(e.target.value)}
                  />
               </div>
            </div>

          </div>
        )}

      </main>

      {/* --- BOTTOM ACTION BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 z-40 safe-area-bottom">
         <div className="max-w-4xl mx-auto grid grid-cols-2 sm:flex sm:justify-end gap-3">
            <button 
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
               <Share2 className="w-5 h-5" /> {t.share}
            </button>
            <button 
              onClick={handleSaveBill}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500 transition"
            >
               <Save className="w-5 h-5" /> {t.saveBill}
            </button>
            <button 
              onClick={() => generatePDF(items, contractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, paymentStatus, totals, billDate)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-red-600 dark:bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-500 shadow-lg shadow-red-200 dark:shadow-none transition"
              disabled={items.length === 0}
            >
               <FileDown className="w-5 h-5" /> PDF
            </button>
            <button 
              onClick={() => generateExcel(items, contractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, paymentStatus, billDate)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-500 shadow-lg shadow-green-200 dark:shadow-none transition"
              disabled={items.length === 0}
            >
               <Download className="w-5 h-5" /> Excel
            </button>
         </div>
      </div>

      {/* --- MODALS --- */}
      <HistoryModal 
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={historyItems}
        trash={trashItems}
        onLoad={handleLoadBill}
        onDelete={handleDeleteBill}
        onRestore={handleRestoreBill}
        onPermanentDelete={handlePermanentDelete}
        onUpdateStatus={handleUpdateHistoryStatus}
        onDownloadPdf={handleHistoryDownloadPdf}
        onDownloadExcel={handleHistoryDownloadExcel}
      />

      <CalculatorModal 
         isOpen={isCalcOpen}
         onClose={() => setIsCalcOpen(false)}
      />
      
      <VoiceEntryModal 
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onConfirm={handleVoiceConfirm}
      />

    </div>
  );
};

export default App;
