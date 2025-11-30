
export interface BillItem {
  id: string;
  description: string;
  length: number;
  width: number;
  quantity: number;
  unit: string; // 'sq.ft' | 'rft' | 'nos'
  rate: number;
  amount: number;
  floor?: string;
}

export interface ClientDetails {
  name: string;
  phone: string;
  address: string;
}

export type SocialPlatform = 'Instagram' | 'Facebook' | 'YouTube' | 'Twitter' | 'LinkedIn' | 'WhatsApp';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface BankAccountDetails {
  holderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  branchAddress: string;
}

export interface ContractorDetails {
  name: string;
  companyName: string;
  phone: string;
  email: string;
  website: string;
  gstin?: string; // GST Number
  socialLinks: SocialLink[];
  bankDetails?: BankAccountDetails;
  accountDetails?: string;
  logo: string; // Base64 string
  upiQrCode: string; // Base64 string for QR Code
  socialMedia?: string; 
}

export interface ContractorProfile {
  id: string;
  name: string; // Profile name (e.g., "My Business 1")
  details: ContractorDetails;
}

export interface ParsedBillItem {
  description: string;
  length: number;
  width: number;
  quantity: number;
  rate: number;
  unit: string; // 'sq.ft' | 'rft' | 'nos'
  floor?: string;
}

export type PaymentStatus = 'Paid' | 'Pending' | 'Partial';

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  notes: string;
}

export interface SavedBillData {
  id: string;
  timestamp: number;
  billNumber: string;
  billDate?: string; // YYYY-MM-DD
  paymentStatus: PaymentStatus;
  contractor: ContractorDetails;
  client: ClientDetails;
  items: BillItem[];
  gstEnabled: boolean;
  gstRate?: number;
  advanceAmount: string; 
  payments: PaymentRecord[];
  disclaimer: string;
}

// --- Subscription & Auth Types ---

export type PlanDuration = 'monthly' | '3-month' | '6-month' | 'yearly';

export interface SubscriptionPlan {
  id: PlanDuration;
  name: string;
  price: number;
  originalPrice: number;
  durationMonths: number;
  saveLabel?: string;
  recommended?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  joinedDate: number; // timestamp
  trialEndDate: number; // timestamp
  subscriptionEndDate: number | null; // timestamp or null if only on trial
  planId: PlanDuration | 'trial' | null;
}

// --- Backup Types ---

export interface BackupData {
  user: UserProfile | null;
  history: SavedBillData[];
  profiles: ContractorProfile[];
  draft: SavedBillData | null;
  lastBackupTime: number;
}
