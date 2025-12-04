
import { SavedBillData, ContractorProfile, ContractorDetails, PaymentStatus, ClientDetails, ClientProfile, DocumentType, EstimateStatus } from '../types';

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
  
  // 1. Try to find by Bill Number AND Type (to distinguish Est-001 from Inv-001)
  let existingIndex = history.findIndex(b => 
    b.billNumber && data.billNumber &&
    b.billNumber.trim().toLowerCase() === data.billNumber.trim().toLowerCase() &&
    (b.type || 'invoice') === (data.type || 'invoice')
  );

  // 2. Fallback: If Bill Number not found or empty, check by Client Name AND Type
  if (existingIndex === -1 && data.client.name) {
    existingIndex = history.findIndex(b => 
      b.client.name.trim().toLowerCase() === data.client.name.trim().toLowerCase() &&
      (b.type || 'invoice') === (data.type || 'invoice')
    );
  }

  if (existingIndex >= 0) {
    // Update existing bill
    const existingBill = history[existingIndex];
    const updatedBill: SavedBillData = {
      ...existingBill,
      ...data,
      // Keep expenses if not provided in update (though App typically passes full state)
      expenses: data.expenses || existingBill.expenses || [],
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
      expenses: data.expenses || [],
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

export const updateEstimateStatus = (id: string, status: EstimateStatus) => {
  const history = getHistory();
  const updatedHistory = history.map(bill => 
    bill.id === id ? { ...bill, estimateStatus: status } : bill
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
};

// --- Contractor Profiles ---

export const saveProfile = (
  details: ContractorDetails, 
  name?: string,
  mode: 'auto' | 'update' | 'create' = 'auto',
  targetId?: string
): ContractorProfile => {
  const profiles = getProfiles();
  
  // MODE: UPDATE (Strictly update specific ID)
  if (mode === 'update' && targetId) {
    const idx = profiles.findIndex(p => p.id === targetId);
    if (idx >= 0) {
      profiles[idx] = { ...profiles[idx], details };
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      return profiles[idx];
    }
  }

  const baseName = name || details.companyName || details.name || 'New Profile';
  
  // MODE: CREATE (Force new, handle name duplicates)
  if (mode === 'create') {
    let finalName = baseName;
    const nameExists = profiles.some(p => p.name.toLowerCase() === baseName.toLowerCase());
    
    // If name exists, append category to differentiate (e.g., "My Corp (Retail)")
    if (nameExists && details.businessCategory) {
       finalName = `${baseName} (${details.businessCategory})`;
    } else if (nameExists) {
       finalName = `${baseName} (Copy)`;
    }

    const newProfile: ContractorProfile = {
      id: Date.now().toString(),
      name: finalName,
      details
    };
    const updatedProfiles = [...profiles, newProfile];
    localStorage.setItem(PROFILES_KEY, JSON.stringify(updatedProfiles));
    return newProfile;
  }

  // MODE: AUTO (Default legacy behavior - Match by name)
  const existingIndex = profiles.findIndex(p => 
    p.name.trim().toLowerCase() === baseName.trim().toLowerCase()
  );

  if (existingIndex >= 0) {
    const updatedProfile = {
      ...profiles[existingIndex],
      details: details
    };
    profiles[existingIndex] = updatedProfile;
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    return updatedProfile;
  }

  // Create new if no match found in auto mode
  const newProfile: ContractorProfile = {
    id: Date.now().toString(),
    name: baseName,
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

export const saveClientProfile = (details: ClientDetails, contractorId?: string): ClientProfile => {
  const profiles = getClientProfiles();
  
  // Check if a client with this name already exists
  const existingIndex = profiles.findIndex(p => 
    p.details.name.trim().toLowerCase() === details.name.trim().toLowerCase() &&
    // Only treat as duplicate if it belongs to same contractor or is global
    (!contractorId || !p.contractorId || p.contractorId === contractorId)
  );

  if (existingIndex >= 0) {
    // Update existing profile with new details
    const existingProfile = profiles[existingIndex];
    const updatedProfile = {
      ...existingProfile,
      contractorId: contractorId || existingProfile.contractorId, // Update link if provided
      details: details // Overwrite with new phone/address
    };
    
    profiles[existingIndex] = updatedProfile;
    localStorage.setItem(CLIENT_PROFILES_KEY, JSON.stringify(profiles));
    return updatedProfile;
  }

  // Create new if not found
  const newProfile: ClientProfile = {
    id: Date.now().toString(),
    contractorId: contractorId,
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
