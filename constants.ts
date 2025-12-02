
export const APP_TEXT = {
  appTitle: "Contractor Bill Master",
  contractorDetails: "Contractor / Business Details",
  clientDetails: "Client Details",
  profiles: "Saved Profiles",
  selectProfile: "Select a Profile",
  saveProfile: "Save as New Profile",
  deleteProfile: "Delete Profile",
  savedClients: "Saved Clients",
  saveClient: "Save Client",
  name: "Name",
  company: "Company / Brand Name",
  gstin: "GSTIN (GST Number)",
  phone: "Phone",
  email: "Email",
  website: "Website",
  social: "Social Media Links",
  addSocial: "Add Social Link",
  selectPlatform: "Select Platform",
  urlPlaceholder: "Paste profile URL here",
  accountDetails: "Bank Account Details",
  bankFields: {
    holderName: "Account Holder Name",
    bankName: "Bank Name",
    accountNumber: "Account Number",
    ifscCode: "IFSC Code",
    upiId: "UPI ID",
    branchAddress: "Bank Address / Branch"
  },
  paymentQr: "Payment QR Code",
  uploadQr: "Upload QR",
  removeQr: "Remove QR",
  uploadLogo: "Upload Logo",
  removeLogo: "Remove Logo",
  address: "Site Address",
  date: "Date",
  billNumber: "Bill No.",
  billDate: "Bill Date",
  paymentStatus: "Payment Status",
  status: {
    Paid: "Paid",
    Pending: "Pending",
    Partial: "Partial"
  },
  addItem: "Add Item",
  updateItem: "Update Item",
  cancelEdit: "Cancel Edit",
  description: "Description / Work Item",
  length: "Length",
  width: "Width",
  height: "Height / Depth",
  quantity: "Qty",
  rate: "Rate",
  unit: "Unit",
  amount: "Amount",
  floor: "Floor / Level",
  floors: {
    GF: "Ground Floor",
    FF: "1st Floor",
    SF: "2nd Floor",
    TF: "3rd Floor",
    FF4: "4th Floor",
    FF5: "5th Floor",
    FF6: "6th Floor",
    FF7: "7th Floor",
    FF8: "8th Floor",
    FF9: "9th Floor",
    FF10: "10th Floor",
    Basement: "Basement",
    Terrace: "Terrace",
    External: "External/Site"
  },
  totalArea: "Total Qty/Area",
  totalAmount: "Total Amount",
  generateExcel: "Excel",
  generatePdf: "PDF",
  share: "Share Bill",
  shareText: "Here is the bill for the work.",
  shareModalTitle: "Share Bill",
  shareOptions: {
    text: "Text Summary",
    pdf: "PDF File",
    excel: "Excel File"
  },
  sharePreview: "Message Preview",
  copyToClipboard: "Copy to Clipboard",
  shareViaApp: "Share via App",
  calculator: "Calculator",
  cancel: "Cancel",
  confirm: "Add to Bill",
  sqft: "Sq.ft",
  rft: "R.ft",
  nos: "Nos/Pcs",
  cuft: "Cu.ft",
  clear: "Clear All",
  emptyList: "No items added yet. Use the form to add items.",
  billSummary: "Bill Summary",
  subTotal: "Sub Total",
  addGst: "Add GST",
  gstRate: "GST Rate (%)",
  gstAmount: "GST Amount",
  grandTotal: "Grand Total",
  advanceReceived: "Advance Received",
  balanceDue: "Balance Due",
  history: "History",
  saveBill: "Save Bill",
  savedBills: "Saved Bills",
  noSavedBills: "No saved bills found.",
  load: "Edit / Customize",
  delete: "Delete",
  billSaved: "Bill saved successfully!",
  profileSaved: "Profile saved successfully!",
  clientSaved: "Client saved successfully!",
  confirmDelete: "Are you sure?",
  loadDraft: "Draft Loaded",
  newBill: "New Bill",
  searchPlaceholder: "Search items...",
  disclaimer: "Terms & Conditions / Disclaimer",
  disclaimerPlaceholder: "e.g., Payment due within 7 days. Goods once sold will not be taken back.",
  platforms: {
    Instagram: "Instagram",
    Facebook: "Facebook",
    YouTube: "YouTube",
    Twitter: "Twitter (X)",
    LinkedIn: "LinkedIn",
    WhatsApp: "WhatsApp"
  },
  paymentHistory: "Payment History",
  addPayment: "Add Payment",
  paymentDate: "Date",
  paymentAmount: "Amount",
  paymentNote: "Purpose/Note (Optional)",
  totalAdvance: "Total Advance",
  remove: "Remove",
  trash: "Trash / Bin",
  restore: "Restore",
  permanentDelete: "Delete Forever",
  emptyTrash: "Trash is empty.",
  restoreSuccess: "Bill restored to history.",
  deleteSuccess: "Bill permanently deleted.",
  moveToTrash: "Move to Trash",
  voiceEntry: "Voice Entry",
  voiceEntryHint: "Tap mic & say: 'Pillar Concrete 10 by 10 by 5 rate 500'",
  voiceHints: {
    sqft: "Try: 'Wall Paint 10 by 12 rate 25'",
    rft: "Try: 'Pipe Work 100 feet rate 45'",
    nos: "Try: 'Panel 4 pieces rate 250'",
    cuft: "Try: 'Concrete 10 by 10 by 2 rate 300'",
    brass: "Try: 'Sand filling 10 by 10 by 5 rate 4000'",
    visit: "Try: 'Site Visit 5 times rate 2000'"
  },
  listening: "Listening...",
  processing: "Processing...",
  speechNotSupported: "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
  browserNotSupported: "Browser not supported"
};

// Comprehensive list of units for all trades
export const CONSTRUCTION_UNITS = [
  // Area
  { value: "sq.ft", label: "Sq.ft (Area)" },
  { value: "sq.mt", label: "Sq.Mtr (Area)" },
  { value: "sq.yd", label: "Sq.Yard (Land)" },
  { value: "acre", label: "Acre (Land)" },
  
  // Linear
  { value: "rft", label: "R.ft (Linear)" },
  { value: "r.mt", label: "R.Mtr (Linear)" },
  
  // Volume / Civil
  { value: "cu.ft", label: "Cu.ft (Volume)" },
  { value: "cu.mt", label: "Cu.Mtr (Volume)" },
  { value: "brass", label: "Brass (100 Cu.ft)" },
  
  // Weight
  { value: "kg", label: "Kg (Weight)" },
  { value: "ton", label: "Ton (Weight)" },
  { value: "quintal", label: "Quintal (100Kg)" },
  
  // Count / Simple
  { value: "nos", label: "Nos/Pcs" },
  { value: "bag", label: "Bag" },
  { value: "box", label: "Box" },
  { value: "pkt", label: "Packet" },
  { value: "ltr", label: "Litre" },
  
  // MEP / Services
  { value: "point", label: "Point (Elec)" },
  { value: "kw", label: "kW (Load)" },
  { value: "hp", label: "HP (Motor)" },
  { value: "set", label: "Set" },
  
  // Time / Service
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "month", label: "Month" },
  { value: "visit", label: "Visit" },
  
  // Other
  { value: "lsum", label: "Lump Sum" },
  { value: "%", label: "% Cost" }
];

// Database of standard construction items for Auto-Suggest
export const AUTO_SUGGEST_ITEMS = [
  // ... (Keep existing massive list) ...
  // SITE PREP & CIVIL
  "Site boundary marking",
  "Site cleaning and debris removal",
  // ... (Shortened for brevity, assume full list is here) ...
  "Lift lobby tiling"
];

export const SUBSCRIPTION_PLANS = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    price: 99,
    originalPrice: 99,
    durationMonths: 1,
    saveLabel: '',
    recommended: false
  },
  {
    id: '3-month',
    name: '3-Month Plan',
    price: 249,
    originalPrice: 297,
    durationMonths: 3,
    saveLabel: 'Save 15%',
    recommended: false
  },
  {
    id: '6-month',
    name: '6-Month Plan',
    price: 449,
    originalPrice: 594,
    durationMonths: 6,
    saveLabel: 'Save 25%',
    recommended: true
  },
  {
    id: 'yearly',
    name: 'Yearly Plan',
    price: 699,
    originalPrice: 1188,
    durationMonths: 12,
    saveLabel: 'Save 40%',
    recommended: false
  }
];

export const PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI (GPay, PhonePe, Paytm)', icon: '📱' },
  { id: 'card', name: 'Debit / Credit Card', icon: '💳' },
  { id: 'netbanking', name: 'Net Banking', icon: '🏦' },
  { id: 'wallet', name: 'Wallets', icon: '👛' },
];
