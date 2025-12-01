
import * as XLSX from 'xlsx';
import { BillItem, ClientDetails, ContractorDetails, PaymentStatus, PaymentRecord } from '../types';

export const generateExcel = (
  items: BillItem[],
  contractor: ContractorDetails,
  client: ClientDetails,
  gstEnabled: boolean,
  gstRate: number,
  payments: PaymentRecord[],
  disclaimer: string,
  billNumber: string,
  paymentStatus: PaymentStatus,
  billDate: string
) => {
  // Format Date
  const formattedDate = billDate ? new Date(billDate).toLocaleDateString() : new Date().toLocaleDateString();

  // Header Info
  const headerData = [
    ["CONTRACTOR BILL / INVOICE"],
    [],
    ["Bill No:", billNumber],
    ["Date:", formattedDate],
    [],
    ["Contractor:", contractor.name],
    ["Firm:", contractor.companyName],
  ];

  if (contractor.gstin) {
    headerData.push(["GSTIN:", contractor.gstin]);
  }

  headerData.push(["Phone:", contractor.phone]);

  if (contractor.email) {
    headerData.push(["Email:", contractor.email]);
  }
  if (contractor.website) {
    headerData.push(["Website:", contractor.website]);
  }
  
  // Add Social Links
  if (contractor.socialLinks && contractor.socialLinks.length > 0) {
    contractor.socialLinks.forEach(link => {
      headerData.push([`${link.platform}:`, link.url]);
    });
  } else if (contractor.socialMedia) {
    headerData.push(["Social:", contractor.socialMedia]);
  }

  headerData.push(
    [],
    ["Client:", client.name],
    ["Address:", client.address],
    ["Phone:", client.phone],
    []
  );

  // Check if any item uses height/depth (Volumetric or Brass)
  const hasHeight = items.some(item => (item.height && item.height > 0));

  // Table Headers
  const tableHeaders = [
    "S.No",
    "Floor",
    "Description",
    "Length",
    "Width"
  ];

  if (hasHeight) {
      tableHeaders.push("Height/Depth");
  }

  tableHeaders.push(
    "Qty",
    "Unit",
    "Total Qty",
    "Rate",
    "Amount"
  );

  // Table Data
  let subTotal = 0;

  const tableData = items.map((item, index) => {
    const quantity = item.quantity || 1;
    let totalItemValue = 0;
    
    // Universal Calculation Engine
    if (['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(item.unit)) {
        // Area
        totalItemValue = item.length * item.width * quantity;
    } else if (['cu.ft', 'cu.mt'].includes(item.unit)) {
        // Volume
        const h = item.height || 0;
        totalItemValue = item.length * item.width * h * quantity;
    } else if (item.unit === 'brass') {
        // Brass = (L*W*H)/100
        const h = item.height || 0;
        totalItemValue = (item.length * item.width * h * quantity) / 100;
    } else if (['rft', 'r.mt'].includes(item.unit)) {
        // Linear
        totalItemValue = item.length * quantity;
    } else {
        // Simple (Nos, Kg, Ton, Lsum, Visit, etc.)
        totalItemValue = quantity; 
    }
    
    subTotal += item.amount;

    // Determine which dimension fields are irrelevant for the unit
    const isSimple = ['nos', 'pcs', 'kg', 'ton', 'lsum', 'point', 'hours', 'days', '%', 'bag', 'box', 'pkt', 'ltr', 'visit', 'month', 'kw', 'hp', 'set', 'quintal'].includes(item.unit);
    const isLinear = ['rft', 'r.mt'].includes(item.unit);

    const row = [
      index + 1,
      item.floor || '',
      item.description,
      isSimple ? '-' : item.length,
      (isSimple || isLinear) ? '-' : item.width
    ];

    if (hasHeight) {
        row.push((['cu.ft', 'cu.mt', 'brass'].includes(item.unit)) ? (item.height || 0) : '-');
    }

    row.push(
      quantity,
      item.unit,
      totalItemValue.toFixed(2),
      item.rate,
      item.amount.toFixed(2)
    );

    return row;
  });

  // Calculations
  const rate = gstRate || 18;
  const gstAmount = gstEnabled ? subTotal * (rate / 100) : 0;
  const grandTotal = subTotal + gstAmount;
  
  // Calculate Total Advance
  const totalAdvance = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = grandTotal - totalAdvance;

  // Footer - adjust indentation based on columns
  const padCols = hasHeight ? 8 : 7;
  const padding = Array(padCols).fill("");

  const footerData = [
    [],
    [...padding, "Sub Total:", "", "", subTotal.toFixed(2)]
  ];

  if (gstEnabled) {
    footerData.push(
      [...padding, `GST (${rate}%):`, "", "", gstAmount.toFixed(2)]
    );
  }

  footerData.push(
    [...padding, "Grand Total:", "", "", grandTotal.toFixed(2)]
  );

  if (payments.length > 0) {
    payments.forEach(payment => {
      const dateStr = payment.date ? `(${new Date(payment.date).toLocaleDateString()})` : '';
      const note = payment.notes ? `(${payment.notes})` : '';
      const label = `Advance Received ${dateStr} ${note}:`;
      
      footerData.push(
        [...padding, label, "", "", `-${payment.amount.toFixed(2)}`]
      );
    });

    if (payments.length > 1) {
      footerData.push(
        [...padding, "Total Advance:", "", "", `-${totalAdvance.toFixed(2)}`]
      );
    }
  }

  footerData.push(
    [...padding, "Balance Due:", "", "", balanceDue.toFixed(2)]
  );

  // Add Account Details
  if (contractor.bankDetails) {
     const bd = contractor.bankDetails;
     if (bd.holderName || bd.bankName || bd.accountNumber || bd.ifscCode || bd.upiId || bd.branchAddress) {
        footerData.push([], ["Bank Account Details:"]);
        if (bd.holderName) footerData.push(["Account Name:", bd.holderName]);
        if (bd.bankName) footerData.push(["Bank Name:", bd.bankName]);
        if (bd.accountNumber) footerData.push(["Account No:", bd.accountNumber]);
        if (bd.ifscCode) footerData.push(["IFSC Code:", bd.ifscCode]);
        if (bd.upiId) footerData.push(["UPI ID:", bd.upiId]);
        if (bd.branchAddress) footerData.push(["Address:", bd.branchAddress]);
     }
  } else if (contractor.accountDetails && contractor.accountDetails.trim()) {
    footerData.push(
      [],
      ["Bank Account Details:"],
      [contractor.accountDetails]
    );
  }

  if (disclaimer && disclaimer.trim()) {
    footerData.push(
      [],
      [],
      ["Terms & Conditions:"],
      [disclaimer]
    );
  }

  const wsData = [...headerData, tableHeaders, ...tableData, ...footerData];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column Widths
  const colWidths = [
    { wch: 5 },  // S.No
    { wch: 12 }, // Floor
    { wch: 30 }, // Description
    { wch: 10 }, // Length
    { wch: 10 }, // Width
  ];
  if (hasHeight) colWidths.push({ wch: 10 }); // Height
  colWidths.push(
    { wch: 6 },  // Qty
    { wch: 8 },  // Unit
    { wch: 12 }, // Total Qty
    { wch: 10 }, // Rate
    { wch: 15 }  // Amount
  );
  
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bill");

  const safeBillNum = (billNumber || 'Draft').replace(/[^a-z0-9]/gi, '_');
  const fileName = `Bill_${safeBillNum}.xlsx`;
  XLSX.writeFile(wb, fileName);
};