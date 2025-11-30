import { SavedBillData, ContractorProfile, ContractorDetails, PaymentStatus } from '../types';

const DRAFT_KEY = 'pop_bill_draft';
const HISTORY_KEY = 'pop_bill_history';
const TRASH_KEY = 'pop_bill_trash';
const PROFILES_KEY = 'pop_contractor_profiles';

// --- Drafts ---

export const saveDraft = (data: Omit<SavedBillData, 'id' | 'timestamp'>) => {
  const draft: SavedBillData = {
    ...data,
    id: 'draft',
    timestamp: Date.now()
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

export const loadDraft = (): SavedBillData | null => {
  const data = localStorage.getItem(DRAFT_KEY);
  return data ? JSON.parse(data) : null;
};

// --- History ---

export const saveToHistory = (data: Omit<SavedBillData, 'id' | 'timestamp'>): SavedBillData => {
  const history = getHistory();
  const newBill: SavedBillData = {
    ...data,
    id: Date.now().toString(),
    timestamp: Date.now()
  };
  
  // Prepend to history (newest first)
  const updatedHistory = [newBill, ...history];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  
  return newBill;
};

export const getHistory = (): SavedBillData[] => {
  const data = localStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
};

export const getTrash = (): SavedBillData[] => {
  const data = localStorage.getItem(TRASH_KEY);
  return data ? JSON.parse(data) : [];
};

// Soft Delete: Move from History to Trash
export const deleteFromHistory = (id: string) => {
  const history = getHistory();
  const billToDelete = history.find(b => b.id === id);
  
  if (billToDelete) {
    // Add to trash
    const trash = getTrash();
    const updatedTrash = [billToDelete, ...trash];
    localStorage.setItem(TRASH_KEY, JSON.stringify(updatedTrash));

    // Remove from history
    const updatedHistory = history.filter(bill => bill.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  }
};

export const restoreFromTrash = (id: string) => {
  const trash = getTrash();
  const billToRestore = trash.find(b => b.id === id);
  
  if (billToRestore) {
    // Add back to history (top)
    const history = getHistory();
    const updatedHistory = [billToRestore, ...history];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));

    // Remove from trash
    const updatedTrash = trash.filter(b => b.id !== id);
    localStorage.setItem(TRASH_KEY, JSON.stringify(updatedTrash));
  }
};

export const permanentDelete = (id: string) => {
  const trash = getTrash();
  const updatedTrash = trash.filter(b => b.id !== id);
  localStorage.setItem(TRASH_KEY, JSON.stringify(updatedTrash));
};

export const updateBillStatus = (id: string, status: PaymentStatus) => {
  const history = getHistory();
  const updatedHistory = history.map(bill => 
    bill.id === id ? { ...bill, paymentStatus: status } : bill
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
};

// --- Profiles (New) ---

export const saveProfile = (details: ContractorDetails, name?: string): ContractorProfile => {
  const profiles = getProfiles();
  const newProfile: ContractorProfile = {
    id: Date.now().toString(),
    name: name || details.companyName || details.name || 'New Profile',
    details
  };
  
  const updatedProfiles = [...profiles, newProfile];
  localStorage.setItem(PROFILES_KEY, JSON.stringify(updatedProfiles));
  return newProfile;
};

export const getProfiles = (): ContractorProfile[] => {
  const data = localStorage.getItem(PROFILES_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteProfile = (id: string) => {
  const profiles = getProfiles();
  const updated = profiles.filter(p => p.id !== id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
};

// --- Utils ---

export const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY);
};