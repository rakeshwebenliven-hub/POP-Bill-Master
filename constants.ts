
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

// Reordered for Indian Context - Most used first
export const CONSTRUCTION_UNITS = [
  { value: 'sq.ft', label: 'Sq. Ft.' },
  { value: 'rft', label: 'R. Ft.' },
  { value: 'nos', label: 'Nos' },
  { value: 'pcs', label: 'Pcs' },
  { value: 'brass', label: 'Brass' },
  { value: 'kg', label: 'Kg' },
  { value: 'ton', label: 'Ton' },
  { value: 'cu.ft', label: 'Cu. Ft.' },
  { value: 'bag', label: 'Bag' },
  { value: 'box', label: 'Box' },
  { value: 'lsum', label: 'L.Sum' },
  { value: 'days', label: 'Days' },
  { value: 'point', label: 'Point' },
  { value: 'sq.mt', label: 'Sq. Mt.' },
  { value: 'sq.yd', label: 'Sq. Yd.' },
  { value: 'acre', label: 'Acre' },
  { value: 'cu.mt', label: 'Cu. Mt.' },
  { value: 'r.mt', label: 'R. Mt.' },
  { value: 'pkt', label: 'Pkt' },
  { value: 'set', label: 'Set' },
  { value: 'quintal', label: 'Quintal' },
  { value: 'hours', label: 'Hours' },
  { value: 'month', label: 'Month' },
  { value: 'visit', label: 'Visit' },
  { value: 'ltr', label: 'Ltr' },
  { value: '%', label: '%' },
  { value: 'kw', label: 'KW' },
  { value: 'hp', label: 'HP' }
];

export const BUSINESS_CATEGORIES = [
  {
    name: "Construction & Contractors",
    categories: [
      "Civil Contractor", "POP Contractor", "Electrical Contractor", "Plumbing Contractor", 
      "Painting Contractor", "Masonry Contractor", "Labour Contractor", "Fabrication Contractor", 
      "Interior Designer", "Architect", "Real Estate Builder", "HVAC Contractor", 
      "Roofing/Waterproofing", "Solar Plant Contractor", "CCTV Installer"
    ]
  },
  {
    name: "Retail & Consumer Shops",
    categories: [
      "Kirana Store", "Supermarket/Hypermarket", "General Store", "Mobile & Accessories", 
      "Electronics Store", "Garment/Clothing Store", "Saree Shop", "Footwear Store", 
      "Jewellery Store", "Hardware Shop", "Paint Shop", "Sanitaryware Shop", 
      "Medical Store/Pharmacy", "Stationery/Bookstore", "Gift/Toy Shop", "Furniture Shop", 
      "Optical Shop", "Pet Supply Store", "Sports Shop"
    ]
  },
  {
    name: "Food & Hospitality",
    categories: [
      "Restaurant", "Cafe", "Cloud Kitchen", "Catering Service", "Bakery/Cake Shop", 
      "Sweet Shop", "Tiffin Service", "Hotel/Resort", "Juice Centre", "Ice Cream Parlour"
    ]
  },
  {
    name: "Services & Freelancers",
    categories: [
      "CA/Accountant", "Lawyer/Consultant", "Digital Marketing", "Web/App Developer", 
      "Event Planner", "Photographer", "Beauty Salon/Spa", "Gym/Yoga Trainer", 
      "AC/Appliance Repair", "Electrician/Plumber (Service)", "Coaching Class/Tutor", "Travel Agent"
    ]
  },
  {
    name: "Automobile & Mechanical",
    categories: [
      "Car/Bike Dealership", "Spare Parts Shop", "Garage/Service Centre", "Tyre Shop", 
      "Car Detailing/Wash", "Battery Shop"
    ]
  },
  {
    name: "Wholesalers & Distributors",
    categories: [
      "FMCG Wholesaler", "Grain Merchant", "Vegetable/Fruit Wholesaler", "Textile Wholesaler", 
      "Pharma Distributor", "Hardware Wholesaler", "Construction Material Supplier"
    ]
  },
  {
    name: "Manufacturing",
    categories: [
      "Food Manufacturing", "Textile/Garment Mfg", "Chemical/Plastic Mfg", "Furniture Mfg", 
      "Machinery/Tools Mfg", "Paper/Packaging Mfg"
    ]
  },
  {
    name: "Agriculture",
    categories: [
      "Fertiliser/Pesticide Shop", "Seed Company", "Dairy Farm", "Poultry Farm", "Tractor Dealer"
    ]
  },
  {
    name: "Logistics & Transport",
    categories: [
      "Transporter", "Packers & Movers", "Courier Service", "Fleet Owner"
    ]
  },
  {
    name: "Other",
    categories: [
      "NGO/Trust", "Printing/Xerox Shop", "Laundry/Dry Cleaner", "Scrap Dealer", "Cyber Cafe"
    ]
  }
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
  // --- CONSTRUCTION & CONTRACTOR (Existing) ---
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
  "Landscaping soil filling",

  // --- RETAIL & SHOPS ---
  "Rice (Basmati)",
  "Wheat Flour (Atta)",
  "Sugar",
  "Tur Dal",
  "Cooking Oil (1L)",
  "Tea Powder",
  "Coffee Powder",
  "Spices Packet",
  "Salt Packet",
  "Bath Soap",
  "Washing Powder",
  "Toothpaste",
  "Shampoo Bottle",
  "Hair Oil",
  "Notebook (A4)",
  "Pen Packet",
  "Pencil Box",
  "School Bag",
  "Office File",
  "Calculator",
  
  // --- MOBILE & ELECTRONICS ---
  "Mobile Screen Guard",
  "Mobile Back Cover",
  "Charging Cable (Type-C)",
  "USB Cable",
  "Earphones",
  "Bluetooth Headset",
  "Mobile Repair Charges",
  "Screen Replacement",
  "Battery Replacement",
  "Laptop Service Charges",
  "OS Installation",
  "Antivirus Software",
  "Mouse",
  "Keyboard",
  
  // --- AUTOMOBILE / MECHANIC ---
  "General Service (Bike)",
  "General Service (Car)",
  "Engine Oil Change",
  "Oil Filter",
  "Air Filter",
  "Brake Pads",
  "Chain Lube",
  "Car Wash (Full)",
  "Foam Wash",
  "Wheel Alignment",
  "Wheel Balancing",
  "Tyre Puncture Repair",
  "Battery Charging",
  "Clutch Cable",
  "Spark Plug",
  
  // --- SERVICES / PROFESSIONAL ---
  "Consultation Fee",
  "Visiting Charges",
  "Service Charge",
  "Inspection Fee",
  "ITR Filing Charges",
  "GST Return Filing",
  "Audit Fee",
  "Accounting Charges",
  "Legal Consultation",
  "Website Design",
  "Logo Design",
  "Domain Renewal",
  "Hosting Charges",
  "Digital Marketing Package",
  "SEO Services",
  "Photography Package",
  "Video Editing Charges",
  "Event Management Fee",
  "Tuition Fee",
  "Admission Fee",
  
  // --- MEDICAL / PHARMACY ---
  "Doctor Consultation",
  "Follow-up Visit",
  "Blood Test",
  "Sugar Test",
  "CBC Test",
  "X-Ray Charges",
  "Medicine Strip",
  "Syrup Bottle",
  "Injection Charges",
  "Dressing Charges",
  "Surgical Mask",
  "Hand Sanitizer",
  
  // --- FOOD & RESTAURANT ---
  "Tea / Coffee",
  "Breakfast Combo",
  "Lunch Thali",
  "Dinner Thali",
  "Veg Biryani",
  "Chicken Biryani",
  "Paneer Butter Masala",
  "Roti / Naan",
  "Sandwich",
  "Pizza",
  "Burger",
  "Mineral Water Bottle",
  "Cold Drink",
  "Ice Cream",
  "Cake (1Kg)",
  "Pastry",
  "Catering Plate Charge",
  "Buffet Charge per Head",
  
  // --- GARMENTS / TAILORING ---
  "Shirt Stitching",
  "Pant Stitching",
  "Blouse Stitching",
  "Alteration Charges",
  "Fall Pico Charges",
  "Suit Length",
  "Saree",
  "Kurti",
  "Jeans",
  "T-Shirt",
  "Formal Shirt",
  "Kids Wear",
  
  // --- HARDWARE / ELECTRICAL (RETAIL) ---
  "LED Bulb (9W)",
  "Tube Light",
  "Fan Regulator",
  "Switch / Socket",
  "Extension Board",
  "Wire Bundle (1.5mm)",
  "Tap (Brass)",
  "Tap (PVC)",
  "Shower Head",
  "Paint Bucket (20L)",
  "Primer (4L)",
  "Paint Brush",
  "Thinner",
  "Door Lock",
  "Hinges Pair",
  "Screws Packet",
  "Nails (1kg)",
  
  // --- LOGISTICS / TRANSPORT ---
  "Transport Charges",
  "Freight Charges",
  "Loading Charges",
  "Unloading Charges",
  "Packaging Charges",
  "Tempo Rent (Local)",
  "Truck Hire Charges",
  "Courier Charges"
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

export const DASHBOARD_FILTERS = {
  all: 'All Time',
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year'
};
