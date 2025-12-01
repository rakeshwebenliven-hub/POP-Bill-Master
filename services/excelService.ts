
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
  billDate: string,
  returnBlob: boolean = false
) => {
  // Format Date
  const formattedDate = billDate ? new Date(billDate).toLocaleDateString() : new Date().toLocaleDateString();
  const isPaid = paymentStatus === 'Paid';

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

  // --- Dynamic Column Analysis ---
  
  // Check if any item has a floor
  const hasFloor = items.some(item => item.floor && item.floor.trim() !== '');

  // Check if any item needs Length (Not simple unit)
  const simpleUnits = ['nos', 'pcs', 'kg', 'ton', 'lsum', 'point', 'hours', 'days', '%', 'bag', 'box', 'pkt', 'ltr', 'visit', 'month', 'kw', 'hp', 'set', 'quintal'];
  const hasLength = items.some(item => !simpleUnits.includes(item.unit));

  // Check if any item needs Width (Area, Volume, Brass)
  const widthUnits = ['sq.ft', 'sq.mt', 'sq.yd', 'acre', 'cu.ft', 'cu.mt', 'brass'];
  const hasWidth = items.some(item => widthUnits.includes(item.unit) && item.width > 0);

  // Check if any item needs Height (Volume, Brass)
  const heightUnits = ['cu.ft', 'cu.mt', 'brass'];
  const hasHeight = items.some(item => heightUnits.includes(item.unit) && item.height && item.height > 0);

  // Table Headers construction
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

    const isSimple = simpleUnits.includes(item.unit);
    const isLinear = ['rft', 'r.mt'].includes(item.unit);
    const isVolumetric = heightUnits.includes(item.unit);

    const row: any[] = [index + 1];
    if (hasFloor) row.push(item.floor || '');
    row.push(item.description);
    
    // Conditionally push dimensions
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

  // Calculations
  const rate = gstRate || 18;
  const gstAmount = gstEnabled ? subTotal * (rate / 100) : 0;
  const grandTotal = subTotal + gstAmount;
  
  // Calculate Balance logic based on status
  const totalAdvance = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = isPaid ? 0 : grandTotal - totalAdvance;

  // Footer - Calculate padding based on visible columns
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

  smartFooter.push(
    [...footerPadding, "Grand Total:", grandTotal.toFixed(2)]
  );

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

  // Add Account Details
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

  // Column Widths
  const colWidths = [
    { wch: 6 },  // S.No
  ];
  if(hasFloor) colWidths.push({ wch: 12 }); // Floor
  colWidths.push({ wch: 30 }); // Description
  if(hasLength) colWidths.push({ wch: 8 });
  if(hasWidth) colWidths.push({ wch: 8 });
  if(hasHeight) colWidths.push({ wch: 8 });
  
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

  if (returnBlob) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/octet-stream' });
  } else {
    const safeBillNum = (billNumber || 'Draft').replace(/[^a-z0-9]/gi, '_');
    const fileName = `Bill_${safeBillNum}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
};
