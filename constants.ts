import { SubscriptionPlan } from './types';

export const EXPENSE_CATEGORIES = [
  "Material",
  "Labor",
  "Transport",
  "Food/Tea",
  "Equipment Rent",
  "Fuel",
  "Sub-contractor",
  "Total Project Cost",
  "Other"
];

export const APP_TEXT = {
  // General & Navigation
  contractorDetails: "My Business Details",
  clientDetails: "Client Details",
  addItem: "Add Item",
  
  // Document Types & Fields
  modeInvoice: "Tax Invoice",
  modeEstimate: "Estimate / Quote",
  billNumber: "Bill No.",
  billDate: "Date",
  estimateNumber: "Est. No.",
  estimateDate: "Date",
  estimateStatus: "Status",
  
  // Forms & Actions
  saveProfile: "Save Profile",
  saveClient: "Save Client",
  uploadLogo: "Upload Logo",
  company: "Company Name",
  gstin: "GSTIN (Optional)",
  name: "Contact Name",
  phone: "Phone Number",
  email: "Email Address",
  
  // Banking
  accountDetails: "Bank Account Details",
  paymentQr: "UPI QR Code",
  removeQr: "Remove QR",
  uploadQr: "Upload QR",
  bankFields: {
    holderName: "Account Holder Name",
    accountNumber: "Account Number",
    bankName: "Bank Name",
    ifscCode: "IFSC Code",
    upiId: "UPI ID",
    branchAddress: "Branch Address"
  },
  
  // Item Entry
  floor: "Floor",
  unit: "Unit",
  description: "Description",
  length: "Length",
  width: "Width",
  height: "Height",
  quantity: "Qty",
  rate: "Rate",
  confirm: "Add Item",
  cancelEdit: "Cancel",
  updateItem: "Update Item",
  voiceEntry: "Voice Entry",
  processing: "Processing...",
  listening: "Listening...",
  speechNotSupported: "Speech recognition not supported in this browser.",
  cancel: "Cancel",
  
  // Lists & Summaries
  searchPlaceholder: "Search items...",
  emptyList: "No items added yet.",
  billSummary: "Bill Summary",
  totalArea: "Total Qty/Area",
  subTotal: "Sub Total",
  addGst: "Add GST",
  grandTotal: "Grand Total",
  paymentHistory: "Payment History",
  balanceDue: "Balance Due",
  disclaimer: "Terms & Conditions",
  
  // Persistence & History
  saveBill: "Save Bill",
  saveEstimate: "Save Estimate",
  billSaved: "Bill saved successfully",
  estimateSaved: "Estimate saved successfully",
  loadDraft: "Draft loaded",
  profileSaved: "Profile saved",
  clientSaved: "Client saved",
  confirmDelete: "Are you sure you want to delete this?",
  history: "History",
  trash: "Trash",
  emptyTrash: "Trash is empty",
  load: "Load",
  delete: "Delete",
  restore: "Restore",

  // Floor dropdown
  floors: {
    ground: "Ground Floor",
    first: "1st Floor",
    second: "2nd Floor",
    third: "3rd Floor",
    fourth: "4th Floor",
    fifth: "5th Floor",
    roof: "Roof / Terrace"
  },
  
  // Voice Hints
  voiceHints: {
    sqft: "Try: 'Ceiling 10 by 12 rate 45'",
    cuft: "Try: 'Pillar 2 by 2 by 8 rate 300'",
    brass: "Try: 'Sand filling 10 by 12 by 4 rate 4000'",
    rft: "Try: 'Cornice 50 feet rate 120'",
    visit: "Try: 'Site visit 2 times rate 500'"
  }
};

export const CONSTRUCTION_UNITS = [
  { value: 'sq.ft', label: 'Sq. Ft.' },
  { value: 'sq.mt', label: 'Sq. Mt.' },
  { value: 'sq.yd', label: 'Sq. Yd.' },
  { value: 'acre', label: 'Acre' },
  { value: 'cu.ft', label: 'Cu. Ft.' },
  { value: 'cu.mt', label: 'Cu. Mt.' },
  { value: 'brass', label: 'Brass' },
  { value: 'rft', label: 'R. Ft.' },
  { value: 'r.mt', label: 'R. Mt.' },
  { value: 'nos', label: 'Nos' },
  { value: 'pcs', label: 'Pcs' },
  { value: 'bag', label: 'Bag' },
  { value: 'box', label: 'Box' },
  { value: 'pkt', label: 'Pkt' },
  { value: 'set', label: 'Set' },
  { value: 'kg', label: 'Kg' },
  { value: 'ton', label: 'Ton' },
  { value: 'quintal', label: 'Quintal' },
  { value: 'lsum', label: 'L.Sum' },
  { value: 'point', label: 'Point' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'month', label: 'Month' },
  { value: 'visit', label: 'Visit' },
  { value: 'ltr', label: 'Ltr' },
  { value: '%', label: '%' },
  { value: 'kw', label: 'KW' },
  { value: 'hp', label: 'HP' }
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    price: 199,
    originalPrice: 299,
    durationMonths: 1,
    saveLabel: ''
  },
  {
    id: '3-month',
    name: 'Quarterly Plan',
    price: 499,
    originalPrice: 897,
    durationMonths: 3,
    saveLabel: 'Save 45%'
  },
  {
    id: '6-month',
    name: 'Half-Yearly Plan',
    price: 899,
    originalPrice: 1794,
    durationMonths: 6,
    saveLabel: 'Save 50%',
    recommended: true
  },
  {
    id: 'yearly',
    name: 'Yearly Plan',
    price: 1499,
    originalPrice: 3588,
    durationMonths: 12,
    saveLabel: 'Save 60%'
  }
];

export const AUTO_SUGGEST_ITEMS = [
  "POP False Ceiling",
  "Grid Ceiling (2x2)",
  "Gypsum False Ceiling",
  "PVC Ceiling",
  "Wall Punning",
  "Wall Painting",
  "Texture Paint",
  "Electrical Wiring",
  "Light Point",
  "Fan Point",
  "AC Point",
  "Tile Flooring",
  "Granite Flooring",
  "Marble Flooring",
  "Wooden Flooring",
  "Brick Work",
  "Plaster Work",
  "Waterproofing",
  "Plumbing Work",
  "Door Fixing",
  "Window Fixing",
  "Cornice Design",
  "Moulding Work",
  "Labor Charges",
  "Transport Charges",
  "Scaffolding Charges",
  "Debris Removal"
];

export const PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI (GPay, PhonePe, Paytm)', icon: '📱' },
  { id: 'card', name: 'Credit / Debit Card', icon: '💳' },
  { id: 'netbanking', name: 'Net Banking', icon: '🏦' }
];

export const DASHBOARD_TEXT = {
  title: "Dashboard",
  totalRevenue: "Total Revenue",
  netProfit: "Net Profit",
  totalExpenses: "Total Expenses",
  outstanding: "Outstanding Due",
  monthlyTrend: "Monthly Trend",
  topClients: "Top Clients"
};