
import { SavedBillData, ContractorProfile, ContractorDetails, PaymentStatus, ClientDetails, ClientProfile } from '../types';

const DRAFT_KEY = 'pop_bill_draft';
const HISTORY_KEY = 'pop_bill_history';
const TRASH_KEY = 'pop_bill_trash';
const PROFILES_KEY = 'pop_contractor_profiles';
const CLIENT_PROFILES_KEY = 'pop_client_profiles';

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
  
  // 1. Try to find by Bill Number
  let existingIndex = history.findIndex(b => 
    b.billNumber && data.billNumber &&
    b.billNumber.trim().toLowerCase() === data.billNumber.trim().toLowerCase()
  );

  // 2. Fallback: If Bill Number not found or empty, check by Client Name
  // We match the MOST RECENT bill (first found) for this client to allow editing without duplication.
  if (existingIndex === -1 && data.client.name) {
    existingIndex = history.findIndex(b => 
      b.client.name.trim().toLowerCase() === data.client.name.trim().toLowerCase()
    );
  }

  if (existingIndex >= 0) {
    // Update existing bill
    const existingBill = history[existingIndex];
    const updatedBill: SavedBillData = {
      ...existingBill,
      ...data,
      // Keep original ID, but update timestamp to reflect modification
      timestamp: Date.now()
    };
    
    // Update in place
    history[existingIndex] = updatedBill;
    
    // Move updated bill to top of list to show recent edits first
    history.splice(existingIndex, 1);
    history.unshift(updatedBill);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return updatedBill;
  } else {
    // Create new bill
    const newBill: SavedBillData = {
      ...data,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    
    // Prepend to history (newest first)
    const updatedHistory = [newBill, ...history];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    return newBill;
  }
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

// --- Contractor Profiles ---

export const saveProfile = (details: ContractorDetails, name?: string): ContractorProfile => {
  const profiles = getProfiles();
  
  // Check if profile exists by Company Name or Name
  const targetName = name || details.companyName || details.name;
  const existingIndex = profiles.findIndex(p => 
    p.name.trim().toLowerCase() === targetName?.trim().toLowerCase()
  );

  if (existingIndex >= 0) {
    // Update existing
    const existingProfile = profiles[existingIndex];
    const updatedProfile = {
      ...existingProfile,
      details: details
    };
    profiles[existingIndex] = updatedProfile;
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    return updatedProfile;
  }

  // Create new
  const newProfile: ContractorProfile = {
    id: Date.now().toString(),
    name: targetName || 'New Profile',
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

// --- Client Profiles (Prevent Duplicates) ---

export const saveClientProfile = (details: ClientDetails): ClientProfile => {
  const profiles = getClientProfiles();
  
  // Check if a client with this name already exists
  const existingIndex = profiles.findIndex(p => 
    p.details.name.trim().toLowerCase() === details.name.trim().toLowerCase()
  );

  if (existingIndex >= 0) {
    // Update existing profile with new details
    const existingProfile = profiles[existingIndex];
    const updatedProfile = {
      ...existingProfile,
      details: details // Overwrite with new phone/address
    };
    
    profiles[existingIndex] = updatedProfile;
    localStorage.setItem(CLIENT_PROFILES_KEY, JSON.stringify(profiles));
    return updatedProfile;
  }

  // Create new if not found
  const newProfile: ClientProfile = {
    id: Date.now().toString(),
    name: details.name || 'New Client',
    details
  };
  
  const updatedProfiles = [...profiles, newProfile];
  localStorage.setItem(CLIENT_PROFILES_KEY, JSON.stringify(updatedProfiles));
  return newProfile;
};

export const getClientProfiles = (): ClientProfile[] => {
  const data = localStorage.getItem(CLIENT_PROFILES_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteClientProfile = (id: string) => {
  const profiles = getClientProfiles();
  const updated = profiles.filter(p => p.id !== id);
  localStorage.setItem(CLIENT_PROFILES_KEY, JSON.stringify(updated));
};

// --- Utils ---

export const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY);
};
