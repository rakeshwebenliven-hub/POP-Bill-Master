

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
    ["POP CONTRACTOR BILL"],
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
    // Fallback for legacy
    headerData.push(["Social:", contractor.socialMedia]);
  }

  headerData.push(
    [],
    ["Client:", client.name],
    ["Address:", client.address],
    ["Phone:", client.phone],
    []
  );

  // Table Headers
  const tableHeaders = [
    "S.No",
    "Floor",
    "Description",
    "Length",
    "Width",
    "Qty",
    "Unit",
    "Area/Qty",
    "Rate",
    "Amount"
  ];

  // Table Data
  let subTotal = 0;

  const tableData = items.map((item, index) => {
    // Logic:
    // If unit is rft, area is length * quantity
    // If unit is sq.ft, area is length * width * quantity
    // If unit is nos, area is quantity (LxW not relevant for total area summary usually, but implies count)
    
    const quantity = item.quantity || 1;
    let totalItemArea = 0;
    
    if (item.unit === 'sq.ft') {
        totalItemArea = item.length * item.width * quantity;
    } else if (item.unit === 'rft') {
        totalItemArea = item.length * quantity;
    } else {
        // Nos
        totalItemArea = quantity; 
    }
    
    subTotal += item.amount;

    return [
      index + 1,
      item.floor || '',
      item.description,
      item.unit === 'nos' ? '-' : item.length,
      (item.unit === 'rft' || item.unit === 'nos') ? '-' : item.width,
      quantity,
      item.unit,
      totalItemArea.toFixed(2),
      item.rate,
      item.amount.toFixed(2)
    ];
  });

  // Calculations
  const rate = gstRate || 18;
  const gstAmount = gstEnabled ? subTotal * (rate / 100) : 0;
  const grandTotal = subTotal + gstAmount;
  
  // Calculate Total Advance from payments array
  const totalAdvance = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = grandTotal - totalAdvance;

  // Footer
  const footerData = [
    [],
    ["", "", "", "", "", "", "", "Sub Total:", "", "", subTotal.toFixed(2)]
  ];

  if (gstEnabled) {
    footerData.push(
      ["", "", "", "", "", "", "", `GST (${rate}%):`, "", "", gstAmount.toFixed(2)]
    );
  }

  footerData.push(
    ["", "", "", "", "", "", "", "Grand Total:", "", "", grandTotal.toFixed(2)]
  );

  // Add individual payment rows
  if (payments.length > 0) {
    payments.forEach(payment => {
      const dateStr = payment.date ? `(${new Date(payment.date).toLocaleDateString()})` : '';
      const note = payment.notes ? `(${payment.notes})` : '';
      // Only add space if both parts exist or just cleanup
      const label = `Advance Received ${dateStr} ${note}:`;
      
      footerData.push(
        ["", "", "", "", "", "", "", label, "", "", `-${payment.amount.toFixed(2)}`]
      );
    });

    // Total Advance Line (optional, but good for clarity if multiple payments exist)
    if (payments.length > 1) {
      footerData.push(
        ["", "", "", "", "", "", "", "Total Advance:", "", "", `-${totalAdvance.toFixed(2)}`]
      );
    }
  }

  footerData.push(
    ["", "", "", "", "", "", "", "Balance Due:", "", "", balanceDue.toFixed(2)]
  );

  // Add Account Details (Structured)
  if (contractor.bankDetails) {
     const bd = contractor.bankDetails;
     // Check if at least one field is filled
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
    // Legacy fallback
    footerData.push(
      [],
      ["Bank Account Details:"],
      [contractor.accountDetails]
    );
  }

  // Add Disclaimer
  if (disclaimer && disclaimer.trim()) {
    footerData.push(
      [],
      [],
      ["Terms & Conditions:"],
      [disclaimer]
    );
  }

  const wsData = [...headerData, tableHeaders, ...tableData, ...footerData];

  // Create Workbook
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column Widths
  ws['!cols'] = [
    { wch: 5 },  // S.No
    { wch: 12 }, // Floor
    { wch: 25 }, // Description
    { wch: 10 }, // Length
    { wch: 10 }, // Width
    { wch: 6 },  // Qty
    { wch: 8 },  // Unit
    { wch: 12 }, // Area
    { wch: 10 }, // Rate
    { wch: 15 }  // Amount
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bill");

  // Download
  const safeBillNum = (billNumber || 'Draft').replace(/[^a-z0-9]/gi, '_');
  const fileName = `POP_Bill_${safeBillNum}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
