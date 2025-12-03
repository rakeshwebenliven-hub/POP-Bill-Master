
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
  contractorDetails: "My Business",
  clientDetails: "Client",
  addItem: "Items",
  
  // Tabs / Steps
  stepParties: "Parties",
  stepItems: "Items",
  stepSummary: "Summary",
  
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
  uploadLogo: "Logo",
  company: "Firm Name",
  gstin: "GSTIN",
  name: "Name",
  phone: "Phone",
  email: "Email",
  
  // Banking
  accountDetails: "Bank Details",
  paymentQr: "UPI QR",
  removeQr: "Remove",
  uploadQr: "Upload",
  bankFields: {
    holderName: "Account Name",
    accountNumber: "Account No",
    bankName: "Bank Name",
    ifscCode: "IFSC",
    upiId: "UPI ID",
    branchAddress: "Branch"
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
  confirm: "Add",
  cancelEdit: "Cancel",
  updateItem: "Update",
  voiceEntry: "Voice",
  processing: "Processing...",
  listening: "Listening...",
  speechNotSupported: "Speech recognition not supported in this browser.",
  cancel: "Cancel",
  
  // Lists & Summaries
  searchPlaceholder: "Search items...",
  emptyList: "No items added yet.",
  billSummary: "Bill Summary",
  totalArea: "Total Area",
  subTotal: "Sub Total",
  addGst: "Add GST",
  grandTotal: "Grand Total",
  paymentHistory: "Received / Advance",
  balanceDue: "Balance Due",
  disclaimer: "Terms & Conditions",
  
  // Persistence & History
  saveBill: "Save",
  saveEstimate: "Save",
  billSaved: "Saved successfully",
  estimateSaved: "Saved successfully",
  loadDraft: "Draft loaded",
  profileSaved: "Profile saved",
  clientSaved: "Client saved",
  confirmDelete: "Delete this?",
  history: "History",
  trash: "Trash",
  emptyTrash: "Trash is empty",
  load: "Edit",
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
  "Debris Removal",
  // ... (Keep existing large list if needed, truncated here for brevity but assuming full list exists)
  "Site boundary marking",
  "Site cleaning and debris removal",
  "Excavation layout marking",
  "PCC bed marking",
  "Foundation centerline marking",
  "Rebar cutting",
  "Shuttering plank cleaning",
  "Footing shuttering setup",
  "Ready-mix concrete ordering",
  "Column starter shuttering",
  "Foundation wall brickwork",
  "Plinth beam shuttering",
  "DPC (Damp Proof Course) application",
  "Brick/Block masonry line marking",
  "Door frame marking",
  "Window frame marking",
  "Lintel shuttering",
  "Slab shuttering plate installation",
  "Beam bottom shuttering",
  "Slab reinforcement mesh fabrication",
  "Slab conduit layout marking",
  "Slab concreting",
  "Wall masonry on first floor",
  "External wall plaster marking",
  "Waterproofing chemical mixing",
  "Plumbing pipe marking on wall",
  "Electrical conduit chasing",
  "AC copper piping layout",
  "Ducting layout marking",
  "Fire hydrant pipe installation",
  "Lift pit construction",
  "CCTV cable laying",
  "Glass façade frame installation",
  "Metal railing fabrication",
  "Gypsum ceiling frame layout",
  "Wooden flooring underlayer fixing",
  "Tile layout marking",
  "Painting putty application",
  "Lighting fixture installation",
  "Solar panel mounting structure installation",
  "STP tank excavation",
  "Landscaping soil filling"
];

export const PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI (GPay, PhonePe, Paytm)', icon: '📱' },
  { id: 'card', name: 'Credit / Debit Card', icon: '💳' },
  { id: 'netbanking', name: 'Net Banking', icon: '🏦' }
];

export const DASHBOARD_TEXT = {
  title: "Analytics",
  totalRevenue: "Revenue",
  netProfit: "Net Profit",
  totalExpenses: "Expenses",
  outstanding: "Due",
  monthlyTrend: "Monthly Trend",
  topClients: "Top Clients"
};
