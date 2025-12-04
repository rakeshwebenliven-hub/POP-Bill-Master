
import { SavedBillData, PaymentStatus, ExpenseRecord } from '../types';

interface DashboardStats {
  totalRevenue: number; // Total billed amount (invoices)
  totalExpenses: number; // Total recorded expenses
  netProfit: number; // Revenue - Expenses
  profitMargin: number; // (Net Profit / Revenue) * 100
  outstandingDue: number; // Uncollected payments
  totalInvoices: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface ClientPerformance {
  id: string;
  name: string;
  revenue: number;
  profit: number;
  invoiceCount: number;
}

interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
}

export const filterDataByDate = (history: SavedBillData[], range: string): SavedBillData[] => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  return history.filter(item => {
    const itemDate = new Date(item.billDate || item.timestamp).getTime();
    
    switch (range) {
      case 'today':
        return itemDate >= startOfDay;
      case 'week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();
        return itemDate >= startOfWeek;
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return itemDate >= startOfMonth;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1).getTime();
        return itemDate >= startOfQuarter;
      case 'year':
        const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
        return itemDate >= startOfYear;
      default:
        return true;
    }
  });
};

export const getExpenseCategoryStats = (history: SavedBillData[]): CategoryExpense[] => {
  const categoryMap: Record<string, number> = {};
  let totalExpenses = 0;

  history.forEach(inv => {
    // Only process Invoices or Expenses, generally Expenses are attached to bills
    if (inv.expenses) {
      inv.expenses.forEach(exp => {
        if (!categoryMap[exp.category]) categoryMap[exp.category] = 0;
        categoryMap[exp.category] += exp.amount;
        totalExpenses += exp.amount;
      });
    }
  });

  if (totalExpenses === 0) return [];

  return Object.keys(categoryMap)
    .map(cat => ({
      category: cat,
      amount: categoryMap[cat],
      percentage: (categoryMap[cat] / totalExpenses) * 100
    }))
    .sort((a, b) => b.amount - a.amount);
};

export const calculateDashboardStats = (history: SavedBillData[]): DashboardStats => {
  const invoices = history.filter(h => !h.type || h.type === 'invoice');
  
  let totalRevenue = 0;
  let totalExpenses = 0;
  let outstandingDue = 0;

  invoices.forEach(inv => {
    // Revenue
    const subTotal = inv.items.reduce((sum, item) => sum + item.amount, 0);
    const gstRate = inv.gstRate || 18;
    const gst = inv.gstEnabled ? subTotal * (gstRate / 100) : 0;
    const grandTotal = subTotal + gst;
    totalRevenue += grandTotal;

    // Expenses
    if (inv.expenses) {
      totalExpenses += inv.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    }

    // Outstanding
    if (inv.paymentStatus !== 'Paid') {
      const paid = inv.payments ? inv.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
      outstandingDue += (grandTotal - paid);
    }
  });

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    outstandingDue,
    totalInvoices: invoices.length
  };
};

export const getMonthlyData = (history: SavedBillData[]): MonthlyData[] => {
  const invoices = history.filter(h => !h.type || h.type === 'invoice');
  const monthMap: Record<string, MonthlyData> = {};

  invoices.forEach(inv => {
    const date = new Date(inv.billDate || inv.timestamp);
    const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g., "Oct 2023"
    
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { month: monthKey, revenue: 0, expenses: 0, profit: 0 };
    }

    // Revenue
    const subTotal = inv.items.reduce((sum, item) => sum + item.amount, 0);
    const gstRate = inv.gstRate || 18;
    const gst = inv.gstEnabled ? subTotal * (gstRate / 100) : 0;
    const grandTotal = subTotal + gst;
    monthMap[monthKey].revenue += grandTotal;

    // Expenses
    if (inv.expenses) {
      const expenses = inv.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      monthMap[monthKey].expenses += expenses;
    }
  });

  // Calculate Profit
  Object.values(monthMap).forEach(d => {
    d.profit = d.revenue - d.expenses;
  });

  // Sort by date (naive approach, assumes chronological insertion usually or sorting required)
  // Better: Sort the keys then map
  return Object.values(monthMap).slice(0, 12).reverse(); // Last 12 entries
};

export const getClientPerformance = (history: SavedBillData[]): ClientPerformance[] => {
  const invoices = history.filter(h => !h.type || h.type === 'invoice');
  const clientMap: Record<string, ClientPerformance> = {};

  invoices.forEach(inv => {
    const clientName = inv.client.name.trim();
    if (!clientName) return;

    if (!clientMap[clientName]) {
      clientMap[clientName] = { id: clientName, name: clientName, revenue: 0, profit: 0, invoiceCount: 0 };
    }

    const subTotal = inv.items.reduce((sum, item) => sum + item.amount, 0);
    const gstRate = inv.gstRate || 18;
    const gst = inv.gstEnabled ? subTotal * (gstRate / 100) : 0;
    const grandTotal = subTotal + gst;
    
    const expenses = inv.expenses ? inv.expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;

    clientMap[clientName].revenue += grandTotal;
    clientMap[clientName].profit += (grandTotal - expenses);
    clientMap[clientName].invoiceCount += 1;
  });

  return Object.values(clientMap).sort((a, b) => b.profit - a.profit).slice(0, 5); // Top 5 by Profit
};
