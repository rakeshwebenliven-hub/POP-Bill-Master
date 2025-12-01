
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { BillItem, ClientDetails, ContractorDetails, PaymentStatus, PaymentRecord } from '../types';

export const generatePDF = (
  items: BillItem[],
  contractor: ContractorDetails,
  client: ClientDetails,
  gstEnabled: boolean,
  gstRate: number,
  payments: PaymentRecord[],
  disclaimer: string,
  billNumber: string,
  paymentStatus: PaymentStatus,
  totals: { subTotal: number, gst: number, grandTotal: number, balance: number, advance: number },
  billDate: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  const formattedDate = billDate ? new Date(billDate).toLocaleDateString() : new Date().toLocaleDateString();
  const primaryColor = [79, 70, 229] as [number, number, number];

  let yPos = 20;

  if (contractor.logo) {
    try {
      doc.addImage(contractor.logo, 'PNG', 14, 15, 25, 25, undefined, 'FAST');
    } catch (e) {
      console.warn("Could not add logo to PDF", e);
    }
  }

  const leftMargin = contractor.logo ? 45 : 14;
  
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text(contractor.companyName || contractor.name || "CONTRACTOR BILL", leftMargin, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  
  let headerTextY = 32;
  if (contractor.companyName && contractor.name) {
    doc.text(contractor.name, leftMargin, headerTextY);
    headerTextY += 5;
  }
  
  if (contractor.gstin) {
     doc.text(`GSTIN: ${contractor.gstin}`, leftMargin, headerTextY);
     headerTextY += 5;
  }

  doc.text(contractor.phone, leftMargin, headerTextY);
  headerTextY += 5;
  if (contractor.email) {
    doc.text(contractor.email, leftMargin, headerTextY);
    headerTextY += 5;
  }
  if (contractor.website) {
    doc.text(contractor.website, leftMargin, headerTextY);
  }

  doc.setFontSize(24);
  doc.setTextColor(200, 200, 200);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - 14, 25, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  
  doc.text(`Bill No: ${billNumber}`, pageWidth - 14, 35, { align: "right" });
  doc.text(`Date: ${formattedDate}`, pageWidth - 14, 40, { align: "right" });
  
  yPos = 65;
  
  doc.setDrawColor(230, 230, 230);
  doc.line(14, yPos - 10, pageWidth - 14, yPos - 10);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 14, yPos);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(client.name || "Client Name", 14, yPos + 6);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  if (client.address) doc.text(client.address, 14, yPos + 11);
  if (client.phone) doc.text(`Phone: ${client.phone}`, 14, yPos + 16);

  // Determine if Height column is needed
  const hasHeight = items.some(item => (item.height && item.height > 0));

  const tableHead = [['#', 'Floor', 'Description', 'Size', 'Qty', 'Unit', 'Total', 'Rate', 'Amount']];
  if (hasHeight) {
      // Modify header for 3D
      tableHead[0] = ['#', 'Floor', 'Description', 'L x W x H', 'Qty', 'Unit', 'Total', 'Rate', 'Amount'];
  }

  const tableRows = items.map((item, index) => {
    const qty = item.quantity || 1;
    let totalVal = 0;
    let dimString = "";

    if (['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(item.unit)) {
      totalVal = item.length * item.width * qty;
      dimString = `${item.length} x ${item.width}`;
    } else if (['cu.ft', 'cu.mt'].includes(item.unit)) {
      const h = item.height || 0;
      totalVal = item.length * item.width * h * qty;
      dimString = `${item.length}x${item.width}x${h}`;
    } else if (item.unit === 'brass') {
      const h = item.height || 0;
      totalVal = (item.length * item.width * h * qty) / 100;
      dimString = `${item.length}x${item.width}x${h}`;
    } else if (['rft', 'r.mt'].includes(item.unit)) {
      totalVal = item.length * qty;
      dimString = `${item.length}`;
    } else {
      totalVal = qty;
      dimString = "-";
    }

    const row = [
      index + 1,
      item.floor || '',
      item.description,
      dimString,
      qty,
      item.unit,
      totalVal.toFixed(2),
      item.rate,
      item.amount.toFixed(2)
    ];
    return row;
  });

  autoTable(doc, {
    startY: yPos + 25,
    head: tableHead,
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 20 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 25 }, // Size col
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 12 },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 18, halign: 'right' },
      8: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 10;
  
  // Footer calculation logic (same as before)
  let addressHeight = 0;
  if (contractor.bankDetails?.branchAddress) {
      const splitAddr = doc.splitTextToSize(`Address: ${contractor.bankDetails.branchAddress}`, 100);
      addressHeight = (splitAddr.length * 4) + 1;
  } else if (contractor.accountDetails) {
      const splitAddr = doc.splitTextToSize(contractor.accountDetails, 100);
      addressHeight = (splitAddr.length * 4) + 1;
  }
  
  const bankDetailsBaseHeight = 35; 
  const bankDetailsHeight = bankDetailsBaseHeight + addressHeight;
  const summaryHeight = 50 + (payments.length * 6);
  const disclaimerHeight = disclaimer ? 25 : 0; 
  const signaturesHeight = 40;
  
  const requiredFooterSpace = Math.max(summaryHeight, bankDetailsHeight) + disclaimerHeight + signaturesHeight;
  
  if (finalY + requiredFooterSpace > pageHeight - 10) {
    doc.addPage();
    finalY = 20;
  }

  const rightColX = pageWidth - 80;
  const valueX = pageWidth - 14;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Sub Total:", rightColX, finalY);
  doc.setTextColor(0, 0, 0);
  doc.text(totals.subTotal.toFixed(2), valueX, finalY, { align: "right" });
  finalY += 6;

  if (gstEnabled) {
    const rate = gstRate || 18;
    doc.setTextColor(100, 100, 100);
    doc.text(`GST (${rate}%):`, rightColX, finalY);
    doc.setTextColor(0, 0, 0);
    doc.text(totals.gst.toFixed(2), valueX, finalY, { align: "right" });
    finalY += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Grand Total:", rightColX, finalY);
  doc.text(totals.grandTotal.toFixed(2), valueX, finalY, { align: "right" });
  finalY += 8;

  if (payments.length > 0) {
     doc.setFont("helvetica", "normal");
     doc.setTextColor(22, 163, 74); 
     
     payments.forEach((payment) => {
        const dateStr = payment.date ? new Date(payment.date).toLocaleDateString() : '';
        const note = payment.notes ? `(${payment.notes})` : '';
        const label = dateStr ? `Advance Received ${dateStr} ${note}:` : `Advance Received ${note}:`;
        
        let cleanLabel = label.length > 35 ? label.substring(0, 32) + '...' : label;
        
        doc.text(cleanLabel, rightColX, finalY);
        doc.text(`-${payment.amount.toFixed(2)}`, valueX, finalY, { align: "right" });
        finalY += 6;
     });
     finalY += 2;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Balance Due:", rightColX, finalY);
  doc.text(`INR ${totals.balance.toFixed(0)}`, valueX, finalY, { align: "right" });

  let currentLeftY = finalY - (totals.advance > 0 ? (payments.length * 6) + 8 : 8) - (gstEnabled ? 6 : 0) - 6; 
  currentLeftY = Math.max(currentLeftY, doc.lastAutoTable.finalY + 10);
  
  if (finalY < 100 && doc.internal.getNumberOfPages() > 1) {
     currentLeftY = 20;
  }

  let bankDetailsPrinted = false;
  if (contractor.bankDetails) {
     const bd = contractor.bankDetails;
     if (bd.holderName || bd.bankName || bd.accountNumber || bd.ifscCode || bd.upiId || bd.branchAddress) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("Bank Account Details:", 14, currentLeftY);
        currentLeftY += 5;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        
        const addBankLine = (label: string, value: string) => {
           if (!value) return;
           doc.text(`${label}: ${value}`, 14, currentLeftY);
           currentLeftY += 5;
        };
        
        addBankLine("Account Name", bd.holderName);
        addBankLine("Bank", bd.bankName);
        addBankLine("A/c No", bd.accountNumber);
        addBankLine("IFSC", bd.ifscCode);
        addBankLine("UPI ID", bd.upiId);
        
        if (bd.branchAddress) {
           const splitAddr = doc.splitTextToSize(`Address: ${bd.branchAddress}`, 100);
           doc.text(splitAddr, 14, currentLeftY);
           currentLeftY += (splitAddr.length * 4) + 1;
        }
        bankDetailsPrinted = true;
     }
  }

  if (!bankDetailsPrinted && contractor.accountDetails && contractor.accountDetails.trim()) {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Bank Account Details:", 14, currentLeftY);
    currentLeftY += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    const splitText = doc.splitTextToSize(contractor.accountDetails, 100);
    doc.text(splitText, 14, currentLeftY);
    currentLeftY += (splitText.length * 4) + 5;
  }
  currentLeftY += 2;

  if (contractor.upiQrCode) {
    try {
      doc.addImage(contractor.upiQrCode, 'PNG', 14, currentLeftY, 30, 30);
      doc.setFontSize(8);
      doc.text("Scan to Pay", 14, currentLeftY + 34);
      if (contractor.bankDetails?.upiId) {
         doc.setFontSize(8);
         doc.setTextColor(79, 70, 229);
         doc.text(contractor.bankDetails.upiId, 14, currentLeftY + 38);
         currentLeftY += 45;
      } else {
         currentLeftY += 40;
      }
    } catch (e) {
      console.warn("QR add failed", e);
    }
  }

  let footerEndY = Math.max(currentLeftY, finalY + 10);

  if (disclaimer) {
     if (footerEndY + 20 > pageHeight - 30) {
         doc.addPage();
         footerEndY = 20;
     }
     doc.setFontSize(8);
     doc.setTextColor(100, 100, 100);
     doc.text("Terms & Conditions:", 14, footerEndY);
     const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 28);
     doc.text(splitDisclaimer, 14, footerEndY + 4);
     footerEndY += (splitDisclaimer.length * 3) + 10;
  }

  const signY = pageHeight - 30;
  if (footerEndY > signY - 10) {
      doc.addPage();
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, signY, 70, signY); 
  doc.line(pageWidth - 70, signY, pageWidth - 14, signY); 

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Client Signature", 14, signY + 5);
  doc.text("Contractor Signature", pageWidth - 14, signY + 5, { align: "right" });

  const safeBillNum = (billNumber || 'Draft').replace(/[^a-z0-9]/gi, '_');
  doc.save(`Bill_${safeBillNum}.pdf`);
};