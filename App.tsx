
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

  // --- Helper: Calculate Amount ---
  const calculateAmount = (len: number, wid: number, qty: number, rate: number, unit: string) => {
    const q = qty || 1;
    const r = rate || 0;
    const l = len || 0;
    const w = wid || 0;
    
    if (unit === 'nos') {
        return q * r;
    } else if (unit === 'rft') {
        return l * q * r;
    } else {
        // sq.ft
        return l * w * q * r;
    }
  };

  // --- Handlers ---
  const handleAddItem = () => {
    if (!currentItem.description || !currentItem.rate) return;

    const amount = calculateAmount(
        Number(currentItem.length), 
        Number(currentItem.width), 
        Number(currentItem.quantity), 
        Number(currentItem.rate), 
        currentItem.unit || 'sq.ft'
    );

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
            amount: amount,
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
          amount: amount,
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
    // Determine unit from parsed item which now comes from user selection in modal
    const unit: any = parsed.unit;

    // Ensure numeric values are safe
    const len = parsed.length || 0;
    const wid = parsed.width || 0;
    const qty = parsed.quantity || 1;
    const rt = parsed.rate || 0;

    setCurrentItem({
      description: parsed.description,
      length: len,
      width: wid,
      quantity: qty,
      rate: rt,
      unit: unit,
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
      <header className="bg-indigo-600 dark:bg-indigo-950 text-white shadow-lg sticky top-0 z-30 safe-area-top backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap tracking-tight">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
              {t.appTitle}
              {access.isTrial && (
                 <span className="inline-flex items-center text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/30 tracking-wide uppercase ml-2 align-middle self-center mt-0.5 leading-none whitespace-nowrap">
                   Trial: {access.daysLeft}d
                 </span>
              )}
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 transition">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => setIsHistoryModalOpen(true)}
                className="p-2 rounded-full hover:bg-white/10 transition relative"
              >
                <Clock className="w-5 h-5" />
                {historyItems.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full animate-pulse ring-2 ring-indigo-600"></span>}
              </button>
              <button 
                onClick={handleNewBill}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition ml-1"
              >
                 <FilePlus className="w-4 h-4" /> <span className="hidden sm:inline">{t.newBill}</span>
              </button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex bg-indigo-800/50 dark:bg-black/20 p-1.5 rounded-xl gap-1">
             <button 
               onClick={() => setActiveTab('details')}
               className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${activeTab === 'details' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-md transform scale-[1.02]' : 'text-indigo-200 hover:bg-white/5'}`}
             >
               Contractor/Business & Client Details
             </button>
             <button 
               onClick={() => setActiveTab('items')}
               className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${activeTab === 'items' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-md transform scale-[1.02]' : 'text-indigo-200 hover:bg-white/5'}`}
             >
               {t.addItem} ({items.length})
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 sm:p-5 space-y-6">

        {/* --- DASHBOARD BANNERS --- */}
        
        {/* Trial Banner - Last Day */}
        {access.isTrial && access.daysLeft === 1 && (
           <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 flex justify-between items-center shadow-sm animate-pulse">
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
           <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-800 flex justify-between items-center shadow-sm">
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
          <div className="space-y-6 animate-in slide-in-from-left duration-300">
            
            {/* Cloud Sync & Profile Settings Section */}
            <div className="card p-5">
                <div className="flex justify-between items-center mb-5">
                   <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 text-lg">
                      <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                         <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      {user.name} 
                      {user.planId !== 'trial' && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                   </h3>
                   <div className="flex gap-2">
                      <button 
                        onClick={handleCloudBackup}
                        disabled={isSyncing}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition"
                        title="Backup to Google Drive"
                      >
                         <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-pulse text-indigo-500' : ''}`} />
                      </button>
                      <button 
                        onClick={handleCloudRestore}
                        disabled={isSyncing}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 transition"
                        title="Restore from Google Drive"
                      >
                         <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      </button>
                      <button onClick={() => { logoutUser(); setUser(null); }} className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition">
                         <LogOut className="w-4 h-4" />
                      </button>
                   </div>
                </div>
                
                {/* Profile Manager */}
                <div className="flex gap-3 items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
                   <select 
                      className="flex-1 bg-transparent dark:text-white outline-none text-sm font-medium cursor-pointer"
                      value={selectedProfileId}
                      onChange={(e) => handleLoadProfile(e.target.value)}
                   >
                      <option value="">{t.selectProfile}</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <div className="w-px h-5 bg-slate-300 dark:bg-slate-700"></div>
                   <button onClick={handleSaveProfile} className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition font-medium">
                      {t.saveProfile}
                   </button>
                   {selectedProfileId && (
                      <button onClick={() => handleDeleteProfile(selectedProfileId)} className="text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-200 transition">
                         <Trash2 className="w-3.5 h-3.5" />
                      </button>
                   )}
                </div>

                {/* Plan Status Card */}
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex justify-between items-center">
                   <div>
                      <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">Current Plan</p>
                      <div className="font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                         {getPlanDetails().name}
                         {access.isTrial && <span className="bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Trial</span>}
                      </div>
                      <p className="text-xs text-indigo-600/80 dark:text-indigo-300/80 mt-1 font-medium">
                        {getPlanDetails().expiry}
                      </p>
                   </div>
                   <button 
                     onClick={() => setShowSubscription(true)} 
                     className="text-xs bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-lg font-bold shadow-sm hover:shadow transition flex items-center gap-1"
                   >
                      {access.isTrial ? 'Upgrade' : 'View Plans'} <ChevronRight className="w-3 h-3" />
                   </button>
                </div>
            </div>

            {/* Bill Info Card */}
            <div className="card p-5 grid grid-cols-2 gap-5">
                <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t.billNumber}</label>
                   <input 
                     type="text" 
                     value={billNumber}
                     onChange={(e) => setBillNumber(e.target.value)}
                     className="w-full bg-slate-100 dark:bg-slate-800/80 border-none rounded-xl font-mono font-bold text-lg dark:text-white focus:ring-2 focus:ring-indigo-500 p-3 tracking-wide"
                   />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t.billDate}</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800/80 border-none rounded-xl font-mono font-bold text-lg dark:text-white focus:ring-2 focus:ring-indigo-500 p-3 tracking-wide"
                      />
                    </div>
                </div>
            </div>

            {/* Contractor Form */}
            <div className="card p-5 sm:p-6 space-y-6">
              <h2 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg">
                   <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                {t.contractorDetails}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Logo Upload */}
                <div className="sm:col-span-2 flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                   {contractor.logo ? (
                     <div className="relative group">
                       <img src={contractor.logo} alt="Logo" className="w-16 h-16 object-contain bg-white rounded-lg shadow-sm" />
                       <button onClick={() => setContractor({...contractor, logo: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition scale-90 group-hover:scale-100">
                         <X className="w-3 h-3" />
                       </button>
                     </div>
                   ) : (
                     <div className="w-16 h-16 bg-white dark:bg-slate-700/50 rounded-lg flex items-center justify-center text-slate-300 border border-slate-200 dark:border-slate-600">
                       <ImageIcon className="w-8 h-8 opacity-50" />
                     </div>
                   )}
                   <div className="flex-1">
                     <label className="cursor-pointer bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition inline-block shadow-sm">
                        <Upload className="w-4 h-4 inline mr-2" /> {contractor.logo ? 'Change Logo' : t.uploadLogo}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} />
                     </label>
                     <p className="text-xs text-slate-400 mt-2">Max 500KB. PNG/JPG recommended.</p>
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

                <div className="sm:col-span-2">
                   <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Website</label>
                   <input type="text" placeholder={t.website} value={contractor.website} onChange={e => setContractor({...contractor, website: e.target.value})} className="input-field" />
                </div>
                
                {/* Social Media List */}
                <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                   <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">{t.social}</label>
                   
                   {contractor.socialLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                         {contractor.socialLinks.map((link, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg shadow-sm text-sm border border-slate-200 dark:border-slate-600">
                               {link.platform === 'Instagram' && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                               {link.platform === 'Facebook' && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                               {link.platform === 'YouTube' && <Youtube className="w-3.5 h-3.5 text-red-600" />}
                               {link.platform === 'Twitter' && <Twitter className="w-3.5 h-3.5 text-sky-500" />}
                               {link.platform === 'LinkedIn' && <Linkedin className="w-3.5 h-3.5 text-blue-700" />}
                               {link.platform === 'WhatsApp' && <MessageCircle className="w-3.5 h-3.5 text-green-500" />}
                               <span className="max-w-[120px] truncate text-slate-700 dark:text-slate-200 font-medium">{link.url}</span>
                               <button onClick={() => handleSocialDelete(idx)} className="text-slate-400 hover:text-red-500 transition"><X className="w-3.5 h-3.5" /></button>
                            </div>
                         ))}
                      </div>
                   )}

                   <div className="flex flex-col sm:flex-row gap-2">
                      <select 
                         className="p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white font-medium"
                         value={selectedPlatform}
                         onChange={(e) => setSelectedPlatform(e.target.value as SocialPlatform)}
                      >
                         {Object.keys(t.platforms).map(p => (
                            <option key={p} value={p}>{t.platforms[p as SocialPlatform]}</option>
                         ))}
                      </select>
                      <input 
                         type="text" 
                         className="flex-1 input-field"
                         placeholder={t.urlPlaceholder}
                         value={socialUrl}
                         onChange={(e) => setSocialUrl(e.target.value)}
                      />
                      <button 
                         onClick={handleSocialAdd}
                         disabled={!socialUrl}
                         className="bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none transition"
                      >
                         {t.addSocial}
                      </button>
                   </div>
                </div>

                {/* Bank Details (Grid Layout) */}
                <div className="sm:col-span-2 bg-indigo-50/50 dark:bg-slate-900/50 p-5 rounded-xl border border-indigo-100 dark:border-slate-800 space-y-5">
                    <h4 className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 border-b border-indigo-100 dark:border-slate-700 pb-2">
                        <Building2 className="w-4 h-4" /> {t.accountDetails}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">{t.bankFields.holderName}</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Rahul Sharma"
                                value={contractor.bankDetails?.holderName || ''} 
                                onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, holderName: e.target.value }})} 
                                className="input-field text-sm" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">{t.bankFields.accountNumber}</label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                placeholder="1234xxxxxx"
                                value={contractor.bankDetails?.accountNumber || ''} 
                                onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, accountNumber: e.target.value }})} 
                                className="input-field text-sm font-mono" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">{t.bankFields.bankName}</label>
                            <input 
                                type="text" 
                                placeholder="e.g. HDFC Bank"
                                value={contractor.bankDetails?.bankName || ''} 
                                onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, bankName: e.target.value }})} 
                                className="input-field text-sm" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">{t.bankFields.ifscCode}</label>
                            <input 
                                type="text" 
                                placeholder="HDFC000123"
                                value={contractor.bankDetails?.ifscCode || ''} 
                                onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, ifscCode: e.target.value.toUpperCase() }})} 
                                className="input-field text-sm uppercase font-mono" 
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">{t.bankFields.upiId}</label>
                            <input 
                                type="text" 
                                placeholder="name@upi"
                                value={contractor.bankDetails?.upiId || ''} 
                                onChange={e => setContractor({...contractor, bankDetails: { ...contractor.bankDetails!, upiId: e.target.value }})} 
                                className="input-field text-sm" 
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">{t.bankFields.branchAddress}</label>
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
                <div className="sm:col-span-2 flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-4">
                      {contractor.upiQrCode ? (
                        <div className="relative">
                            <img src={contractor.upiQrCode} alt="QR" className="w-16 h-16 rounded-lg bg-white p-1 border border-slate-200" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-300">
                           <QrCode className="w-8 h-8 opacity-50" />
                        </div>
                      )}
                      <div>
                         <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{t.paymentQr}</h4>
                         <p className="text-xs text-slate-500 mt-0.5">{contractor.upiQrCode ? 'QR Code attached to bill' : 'Upload QR for easy payments'}</p>
                      </div>
                    </div>
                    
                    <label className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-bold text-sm bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-lg hover:bg-indigo-100 transition">
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
            <div className="card p-5 sm:p-6 space-y-5">
              <h2 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                 <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> 
                 </div>
                 {t.clientDetails}
              </h2>
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Client Name</label>
                  <input type="text" placeholder={t.name} value={client.name} onChange={e => setClient({...client, name: e.target.value})} className="input-field" />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Client Phone</label>
                  <input type="tel" inputMode="numeric" placeholder={t.phone} value={client.phone} onChange={e => setClient({...client, phone: e.target.value})} className="input-field" />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Site Address</label>
                  <input type="text" placeholder={t.address} value={client.address} onChange={e => setClient({...client, address: e.target.value})} className="input-field" />
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
               <button 
                 onClick={() => { setActiveTab('items'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                 className="btn-primary py-3.5 px-8 flex items-center gap-2 text-lg"
               >
                  Next: Add Items <ChevronRight className="w-5 h-5" />
               </button>
            </div>
          </div>
        )}
        
        {/* ... (Items Tab Remains Unchanged) ... */}
        {activeTab === 'items' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            
            {/* Input Form */}
            <div className="card p-5 sm:p-6 relative overflow-hidden ring-1 ring-slate-900/5">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                   {editingId ? t.updateItem : t.addItem}
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition flex items-center gap-2 group"
                    title={t.voiceEntry}
                  >
                     <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     <span className="text-xs font-bold hidden sm:inline">{t.voiceEntry}</span>
                  </button>
                  <button onClick={() => setIsCalcOpen(true)} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                     <Calculator className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 mb-6">
                {/* Floor Selection */}
                <div className="col-span-2 sm:col-span-2">
                   <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">{t.floor} <span className="text-slate-300 font-normal">(Opt)</span></label>
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
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">{t.description}</label>
                  <input type="text" placeholder="e.g. Living Room Ceiling" className="input-field" value={currentItem.description} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">{t.length}</label>
                  <input type="number" inputMode="decimal" min="0" placeholder="0" className="input-field text-center" value={currentItem.length || ''} onChange={e => setCurrentItem({...currentItem, length: parseFloat(e.target.value)})} disabled={currentItem.unit === 'nos'} />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">{t.width}</label>
                  <input type="number" inputMode="decimal" min="0" placeholder="0" className="input-field text-center" value={currentItem.width || ''} onChange={e => setCurrentItem({...currentItem, width: parseFloat(e.target.value)})} disabled={currentItem.unit !== 'sq.ft'} />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">{t.quantity}</label>
                  <input type="number" inputMode="decimal" min="1" placeholder="1" className="input-field text-center" value={currentItem.quantity || ''} onChange={e => setCurrentItem({...currentItem, quantity: parseFloat(e.target.value)})} />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">{t.unit}</label>
                  <select className="input-field appearance-none" value={currentItem.unit} onChange={e => setCurrentItem({...currentItem, unit: e.target.value as any})}>
                    <option value="sq.ft">{t.sqft}</option>
                    <option value="rft">{t.rft}</option>
                    <option value="nos">{t.nos}</option>
                  </select>
                </div>
                
                <div className="col-span-1">
                   <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">{t.rate}</label>
                   <input type="number" inputMode="decimal" min="0" placeholder="0" className="input-field text-center font-bold text-slate-700 dark:text-white" value={currentItem.rate || ''} onChange={e => setCurrentItem({...currentItem, rate: parseFloat(e.target.value)})} />
                </div>

                <div className="col-span-1 flex items-end">
                   <div className="w-full h-[46px] bg-slate-900 dark:bg-black px-3 rounded-xl border border-transparent text-right font-mono font-bold text-green-400 flex items-center justify-end shadow-inner tracking-widest text-lg">
                      {calculateAmount(currentItem.length || 0, currentItem.width || 0, currentItem.quantity || 1, currentItem.rate || 0, currentItem.unit || 'sq.ft').toFixed(0)}
                   </div>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                 {editingId && (
                   <button onClick={handleCancelEdit} className="flex-1 py-3.5 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition">
                      {t.cancelEdit}
                   </button>
                 )}
                 <button 
                  onClick={handleAddItem} 
                  disabled={!currentItem.description || !currentItem.rate}
                  className="flex-1 btn-primary py-3.5 flex justify-center items-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {editingId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingId ? t.updateItem : t.confirm}
                </button>
              </div>
            </div>

            {/* Items List */}
            <div className="card overflow-hidden">
               {items.length > 0 && (
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex gap-2 bg-slate-50/50 dark:bg-slate-900">
                     <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder={t.searchPlaceholder}
                          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-indigo-500"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                     </div>
                  </div>
               )}
               
               <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                  {filteredItems.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 dark:text-slate-600 flex flex-col items-center">
                       <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                          <FileText className="w-8 h-8 opacity-40" />
                       </div>
                       <p className="font-medium">{t.emptyList}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredItems.map((item, idx) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex justify-between items-start group">
                          <div className="flex gap-4">
                             <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 font-mono">
                                {idx + 1}
                             </div>
                             <div>
                               <div className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 flex-wrap mb-1">
                                 {item.description}
                                 {item.floor && (
                                    <span className="text-[10px] uppercase font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded tracking-wide">
                                       {item.floor}
                                    </span>
                                 )}
                               </div>
                               <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                 <span className="font-medium text-slate-700 dark:text-slate-300">
                                   {item.unit === 'sq.ft' && `${item.length} x ${item.width} = ${(item.length * item.width).toFixed(2)}`}
                                   {item.unit === 'rft' && `${item.length}`}
                                   {item.unit === 'nos' && `1`} 
                                 </span>
                                 <span className="text-xs uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{item.unit}</span>
                                 
                                 {(item.quantity > 1) && (
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                       x {item.quantity}
                                    </span>
                                 )}
                                 
                                 <span className="text-slate-300 dark:text-slate-600">|</span>
                                 <span className="font-medium">@{item.rate}</span>
                               </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">₹{item.amount.toFixed(0)}</div>
                             <div className="flex justify-end gap-2 mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditItem(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg transition">
                                   <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
               
               {items.length > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wide">
                     <span>Total Items: {items.length}</span>
                     {filteredItems.length !== items.length && <span>Found: {filteredItems.length}</span>}
                  </div>
               )}
            </div>

            {/* Bill Summary */}
            <div className="card p-5 sm:p-6 space-y-4">
               <h3 className="font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-3 mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  {t.billSummary}
               </h3>
               
               <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm font-medium">
                  <span>{t.subTotal}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-base">₹{totals.subTotal.toFixed(2)}</span>
               </div>
               
               <div className="flex items-center justify-between py-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                     <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${gstEnabled ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}>
                        {gstEnabled && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                     </div>
                     <input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} className="hidden" />
                     <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition">{t.addGst}</span>
                  </label>
                  {gstEnabled && (
                     <div className="flex items-center gap-2">
                        <input 
                           type="number" 
                           value={gstRate} 
                           onChange={e => setGstRate(parseFloat(e.target.value))} 
                           className="w-14 p-1.5 text-center bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                        <span className="text-sm font-bold text-slate-500">%</span>
                     </div>
                  )}
               </div>

               {gstEnabled && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm font-medium">
                     <span>{t.gstAmount} ({gstRate}%)</span>
                     <span className="font-bold text-slate-900 dark:text-white text-base">₹{totals.gst.toFixed(2)}</span>
                  </div>
               )}
               
               <div className="flex justify-between items-end pt-4 pb-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-lg font-bold text-indigo-900 dark:text-indigo-200">{t.grandTotal}</span>
                  <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">₹{totals.grandTotal.toFixed(2)}</span>
               </div>

               {/* Payment History Section */}
               <div className="pt-5 mt-2 border-t-2 border-dashed border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-xs text-slate-500 uppercase mb-4 flex justify-between items-center tracking-wider">
                     {t.paymentHistory}
                     <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">Total: ₹{totals.advance.toFixed(2)}</span>
                  </h4>
                  
                  {/* Add Payment Form */}
                  <div className="grid grid-cols-12 gap-3 mb-4">
                     <input 
                       type="date" 
                       className="col-span-12 sm:col-span-3 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white outline-none focus:border-green-500" 
                       value={newPaymentDate}
                       onChange={e => setNewPaymentDate(e.target.value)}
                     />
                     <div className="col-span-7 sm:col-span-3">
                        <input 
                           type="number" 
                           inputMode="decimal"
                           min="0"
                           className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white outline-none focus:border-green-500 font-bold" 
                           placeholder="Amount" 
                           value={newPaymentAmount}
                           onChange={e => setNewPaymentAmount(e.target.value)}
                        />
                     </div>
                     <input 
                       type="text" 
                       className="col-span-12 sm:col-span-5 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white outline-none focus:border-green-500" 
                       placeholder="Note (e.g. Advance)" 
                       value={newPaymentNote}
                       onChange={e => setNewPaymentNote(e.target.value)}
                     />
                     <button 
                       onClick={handleAddPayment}
                       className="col-span-5 sm:col-span-1 p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center shadow-md shadow-green-200 dark:shadow-none active:scale-95 transition"
                     >
                        <Plus className="w-5 h-5" />
                     </button>
                  </div>

                  {/* Payments List */}
                  {payments.length > 0 && (
                     <div className="space-y-2 mb-4 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl">
                        {payments.map(p => (
                           <div key={p.id} className="flex justify-between items-center text-sm p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                              <div className="flex flex-col">
                                 <span className="font-bold text-slate-800 dark:text-slate-100">₹{p.amount}</span>
                                 <span className="text-xs text-slate-400 mt-0.5 font-medium">
                                    {p.date ? new Date(p.date).toLocaleDateString() : 'No Date'} {p.notes ? `• ${p.notes}` : ''}
                                 </span>
                              </div>
                              <button onClick={() => handleDeletePayment(p.id)} className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               <div className="bg-indigo-600 text-white p-5 rounded-2xl flex justify-between items-center shadow-lg shadow-indigo-200 dark:shadow-none">
                  <span className="font-medium opacity-90">{t.balanceDue}</span>
                  <span className="text-2xl font-bold">₹{totals.balance.toFixed(2)}</span>
               </div>
               
               {/* Disclaimer Input */}
               <div className="pt-4">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block flex items-center gap-1 tracking-wider">
                     <AlertCircle className="w-3 h-3" /> {t.disclaimer}
                  </label>
                  <textarea 
                     className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition"
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
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 pb-6 sm:pb-3 z-40 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="max-w-4xl mx-auto grid grid-cols-2 sm:flex sm:justify-end gap-3">
            <button 
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"
            >
               <Share2 className="w-5 h-5" /> {t.share}
            </button>
            <button 
              onClick={handleSaveBill}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500 transition shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
            >
               <Save className="w-5 h-5" /> {t.saveBill}
            </button>
            <button 
              onClick={() => generatePDF(items, contractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, paymentStatus, totals, billDate)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-red-600 dark:bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-500 shadow-lg shadow-red-200 dark:shadow-none transition active:scale-95"
              disabled={items.length === 0}
            >
               <FileDown className="w-5 h-5" /> PDF
            </button>
            <button 
              onClick={() => generateExcel(items, contractor, client, gstEnabled, gstRate, payments, disclaimer, billNumber, paymentStatus, billDate)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-500 shadow-lg shadow-green-200 dark:shadow-none transition active:scale-95"
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
