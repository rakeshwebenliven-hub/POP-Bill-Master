import { SavedBillData, ContractorProfile, ContractorDetails, PaymentStatus, ClientDetails, ClientProfile, DocumentType, EstimateStatus } from '../types';

const DRAFT_KEY = 'pop_bill_draft';
const HISTORY_KEY = 'pop_bill_history';
const TRASH_KEY = 'pop_bill_trash';
const PROFILES_KEY = 'pop_contractor_profiles';
const CLIENT_PROFILES_KEY = 'pop_client_profiles';

// Helper for safe JSON parsing
const safeParse = (jsonString: string | null, fallback: any) => {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Storage parse error", e);
    return fallback;
  }
};

// --- Drafts ---

export const saveDraft = (data: Omit<SavedBillData, 'id' | 'timestamp'> & { originalId?: string | null }) => {
  const draft: any = {
    ...data,
    id: data.originalId || 'draft',
    timestamp: Date.now()
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

export const loadDraft = (): SavedBillData | null => {
  return safeParse(localStorage.getItem(DRAFT_KEY), null);
};

// --- History ---

export const saveToHistory = (
  data: Omit<SavedBillData, 'id' | 'timestamp'>, 
  currentId?: string | null
): SavedBillData => {
  const history = getHistory();
  let existingIndex = -1;

  if (currentId) {
    existingIndex = history.findIndex(b => b.id === currentId);
  }

  if (existingIndex === -1 && data.billNumber) {
    existingIndex = history.findIndex(b => 
      b.billNumber.trim().toLowerCase() === data.billNumber.trim().toLowerCase() &&
      (b.type || 'invoice') === (data.type || 'invoice')
    );
  }

  if (existingIndex >= 0) {
    const existingBill = history[existingIndex];
    const updatedBill: SavedBillData = {
      ...existingBill,
      ...data,
      expenses: data.expenses || existingBill.expenses || [],
      timestamp: Date.now()
    };
    
    history[existingIndex] = updatedBill;
    history.splice(existingIndex, 1);
    history.unshift(updatedBill);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return updatedBill;
  } else {
    const newBill: SavedBillData = {
      ...data,
      expenses: data.expenses || [],
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    
    const updatedHistory = [newBill, ...history];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    return newBill;
  }
};

export const getHistory = (): SavedBillData[] => {
  return safeParse(localStorage.getItem(HISTORY_KEY), []);
};

export const getTrash = (): SavedBillData[] => {
  return safeParse(localStorage.getItem(TRASH_KEY), []);
};

export const deleteFromHistory = (id: string) => {
  const history = getHistory();
  const billToDelete = history.find(b => b.id === id);
  
  if (billToDelete) {
    const trash = getTrash();
    const updatedTrash = [billToDelete, ...trash];
    localStorage.setItem(TRASH_KEY, JSON.stringify(updatedTrash));

    const updatedHistory = history.filter(bill => bill.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  }
};

export const restoreFromTrash = (id: string) => {
  const trash = getTrash();
  const billToRestore = trash.find(b => b.id === id);
  
  if (billToRestore) {
    const history = getHistory();
    const updatedHistory = [billToRestore, ...history];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));

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

// --- Profiles ---

export const saveProfile = (
  details: ContractorDetails, 
  name?: string,
  mode: 'auto' | 'update' | 'create' = 'auto',
  targetId?: string
): ContractorProfile => {
  const profiles = getProfiles();
  
  if (mode === 'update' && targetId) {
    const idx = profiles.findIndex(p => p.id === targetId);
    if (idx >= 0) {
      profiles[idx] = { ...profiles[idx], details };
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      return profiles[idx];
    }
  }

  const baseName = name || details.companyName || details.name || 'New Profile';
  
  if (mode === 'create') {
    let finalName = baseName;
    const nameExists = profiles.some(p => p.name.toLowerCase() === baseName.toLowerCase());
    
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

  const existingIndex = profiles.findIndex(p => 
    p.name.trim().toLowerCase() === baseName.trim().toLowerCase()
  );

  if (existingIndex >= 0) {
    const updatedProfile = { ...profiles[existingIndex], details: details };
    profiles[existingIndex] = updatedProfile;
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    return updatedProfile;
  }

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
  return safeParse(localStorage.getItem(PROFILES_KEY), []);
};

export const deleteProfile = (id: string) => {
  const profiles = getProfiles();
  const updated = profiles.filter(p => p.id !== id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
};

export const saveClientProfile = (details: ClientDetails, contractorId?: string): ClientProfile => {
  const profiles = getClientProfiles();
  const existingIndex = profiles.findIndex(p => 
    p.details.name.trim().toLowerCase() === details.name.trim().toLowerCase() &&
    (!contractorId || !p.contractorId || p.contractorId === contractorId)
  );

  if (existingIndex >= 0) {
    const updatedProfile = {
      ...profiles[existingIndex],
      contractorId: contractorId || profiles[existingIndex].contractorId,
      details: details
    };
    profiles[existingIndex] = updatedProfile;
    localStorage.setItem(CLIENT_PROFILES_KEY, JSON.stringify(profiles));
    return updatedProfile;
  }

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
  return safeParse(localStorage.getItem(CLIENT_PROFILES_KEY), []);
};

export const deleteClientProfile = (id: string) => {
  const profiles = getClientProfiles();
  const updated = profiles.filter(p => p.id !== id);
  localStorage.setItem(CLIENT_PROFILES_KEY, JSON.stringify(updated));
};

export const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY);
};
