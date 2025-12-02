
import * as XLSX from 'xlsx';
import { BillItem, ClientDetails, ContractorDetails, PaymentStatus, PaymentRecord, DocumentType } from '../types';

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
  billDate: string,
  documentType: DocumentType = 'invoice',
  returnBlob: boolean = false
) => {
  const formattedDate = billDate ? new Date(billDate).toLocaleDateString() : new Date().toLocaleDateString();
  const isPaid = paymentStatus === 'Paid';
  const docTitle = documentType === 'estimate' ? "ESTIMATE / QUOTE" : "CONTRACTOR BILL / INVOICE";
  const noLabel = documentType === 'estimate' ? "Est. No:" : "Bill No:";
  const dateLabel = documentType === 'estimate' ? "Est. Date:" : "Date:";

  const headerData = [
    [docTitle],
    [],
    [noLabel, billNumber],
    [dateLabel, formattedDate],
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

  const hasFloor = items.some(item => item.floor && item.floor.trim() !== '');
  const simpleUnits = ['nos', 'pcs', 'kg', 'ton', 'lsum', 'point', 'hours', 'days', '%', 'bag', 'box', 'pkt', 'ltr', 'visit', 'month', 'kw', 'hp', 'set', 'quintal'];
  const hasLength = items.some(item => !simpleUnits.includes(item.unit));
  const widthUnits = ['sq.ft', 'sq.mt', 'sq.yd', 'acre', 'cu.ft', 'cu.mt', 'brass'];
  const hasWidth = items.some(item => widthUnits.includes(item.unit) && item.width > 0);
  const heightUnits = ['cu.ft', 'cu.mt', 'brass'];
  const hasHeight = items.some(item => heightUnits.includes(item.unit) && item.height && item.height > 0);

  const tableHeaders = ["S.No"];
  if (hasFloor) tableHeaders.push("Floor");
  tableHeaders.push("Description");
  if (hasLength) tableHeaders.push("Length");
  if (hasWidth) tableHeaders.push("Width");
  if (hasHeight) tableHeaders.push("Height/Depth");
  
  tableHeaders.push(
    "Qty",
    "Unit",
    "Total Qty",
    "Rate",
    "Amount"
  );

  let subTotal = 0;

  const tableData = items.map((item, index) => {
    const quantity = item.quantity || 1;
    let totalItemValue = 0;
    
    if (['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(item.unit)) {
        totalItemValue = item.length * item.width * quantity;
    } else if (['cu.ft', 'cu.mt'].includes(item.unit)) {
        const h = item.height || 0;
        totalItemValue = item.length * item.width * h * quantity;
    } else if (item.unit === 'brass') {
        const h = item.height || 0;
        totalItemValue = (item.length * item.width * h * quantity) / 100;
    } else if (['rft', 'r.mt'].includes(item.unit)) {
        totalItemValue = item.length * quantity;
    } else {
        totalItemValue = quantity; 
    }
    
    subTotal += item.amount;

    const isSimple = simpleUnits.includes(item.unit);
    const isLinear = ['rft', 'r.mt'].includes(item.unit);
    const isVolumetric = heightUnits.includes(item.unit);

    const row: any[] = [index + 1];
    if (hasFloor) row.push(item.floor || '');
    row.push(item.description);
    
    if (hasLength) row.push(isSimple ? '-' : item.length);
    if (hasWidth) row.push((isSimple || isLinear) ? '-' : item.width);
    if (hasHeight) row.push(isVolumetric ? (item.height || 0) : '-');

    row.push(
      quantity,
      item.unit,
      totalItemValue.toFixed(2),
      item.rate,
      item.amount.toFixed(2)
    );

    return row;
  });

  const rate = gstRate || 18;
  const gstAmount = gstEnabled ? subTotal * (rate / 100) : 0;
  const grandTotal = subTotal + gstAmount;
  
  const totalAdvance = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = isPaid ? 0 : grandTotal - totalAdvance;

  const totalCols = tableHeaders.length;
  const footerPadding = Array(Math.max(0, totalCols - 2)).fill("");

  const smartFooter = [
      [],
      [...footerPadding, "Sub Total:", subTotal.toFixed(2)]
  ];

  if (gstEnabled) {
    smartFooter.push(
      [...footerPadding, `GST (${rate}%):`, gstAmount.toFixed(2)]
    );
  }

  const grandTotalLabel = documentType === 'estimate' ? "Estimated Total:" : "Grand Total:";
  smartFooter.push(
    [...footerPadding, grandTotalLabel, grandTotal.toFixed(2)]
  );

  if (documentType === 'invoice') {
      if (isPaid) {
         smartFooter.push(
           [...footerPadding, "Payment Received:", `-${grandTotal.toFixed(2)}`]
         );
      } else {
          if (payments.length > 0) {
            payments.forEach(payment => {
              const dateStr = payment.date ? `(${new Date(payment.date).toLocaleDateString()})` : '';
              const note = payment.notes ? `(${payment.notes})` : '';
              const label = `Advance ${dateStr} ${note}:`;
              
              smartFooter.push(
                [...footerPadding, label, `-${payment.amount.toFixed(2)}`]
              );
            });

            if (payments.length > 1) {
              smartFooter.push(
                [...footerPadding, "Total Advance:", `-${totalAdvance.toFixed(2)}`]
              );
            }
          }
      }

      smartFooter.push(
        [...footerPadding, "Balance Due:", balanceDue.toFixed(2)]
      );

      if (isPaid) {
          smartFooter.push([], [...footerPadding, "*** PAID ***", ""]);
      }
  }

  if (contractor.bankDetails) {
     const bd = contractor.bankDetails;
     if (bd.holderName || bd.bankName || bd.accountNumber || bd.ifscCode || bd.upiId || bd.branchAddress) {
        smartFooter.push([], ["Bank Account Details:"]);
        if (bd.holderName) smartFooter.push(["Account Name:", bd.holderName]);
        if (bd.bankName) smartFooter.push(["Bank Name:", bd.bankName]);
        if (bd.accountNumber) smartFooter.push(["Account No:", bd.accountNumber]);
        if (bd.ifscCode) smartFooter.push(["IFSC Code:", bd.ifscCode]);
        if (bd.upiId) smartFooter.push(["UPI ID:", bd.upiId]);
        if (bd.branchAddress) smartFooter.push(["Address:", bd.branchAddress]);
     }
  } else if (contractor.accountDetails && contractor.accountDetails.trim()) {
    smartFooter.push(
      [],
      ["Bank Account Details:"],
      [contractor.accountDetails]
    );
  }

  if (disclaimer && disclaimer.trim()) {
    smartFooter.push(
      [],
      [],
      ["Terms & Conditions:"],
      [disclaimer]
    );
  }

  const wsData = [...headerData, tableHeaders, ...tableData, ...smartFooter];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const colWidths = [
    { wch: 6 },  
  ];
  if(hasFloor) colWidths.push({ wch: 12 });
  colWidths.push({ wch: 30 });
  if(hasLength) colWidths.push({ wch: 8 });
  if(hasWidth) colWidths.push({ wch: 8 });
  if(hasHeight) colWidths.push({ wch: 8 });
  
  colWidths.push(
    { wch: 6 },  
    { wch: 8 }, 
    { wch: 12 }, 
    { wch: 10 }, 
    { wch: 15 }  
  );
  
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bill");

  if (returnBlob) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/octet-stream' });
  } else {
    const safeBillNum = (billNumber || 'Draft').replace(/[^a-z0-9]/gi, '_');
    const fileName = `${documentType === 'invoice' ? 'Bill' : 'Estimate'}_${safeBillNum}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
};
