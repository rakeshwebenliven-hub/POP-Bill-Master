
import React, { useState } from 'react';
import { X, Plus, Trash2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { ExpenseRecord } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseRecord[];
  onAddExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (id: string) => void;
  billTotal: number; // To calculate profit
}

const ExpensesModal: React.FC<ExpensesModalProps> = ({ 
  isOpen, 
  onClose, 
  expenses, 
  onAddExpense, 
  onDeleteExpense,
  billTotal
}) => {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = billTotal - totalExpenses;
  const profitMargin = billTotal > 0 ? (netProfit / billTotal) * 100 : 0;

  const handleAdd = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;

    const newExpense: ExpenseRecord = {
      id: Date.now().toString(),
      category,
      description,
      amount: val,
      date
    };

    onAddExpense(newExpense);
    setDescription('');
    setAmount('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up border-t border-slate-200 dark:border-slate-800 sm:border safe-area-bottom">
        
        {/* Header */}
        <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
             <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
                <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
             </div>
             <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Expenses & Profit</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 max-h-[80vh] overflow-y-auto">
           
           {/* Summary Cards */}
           <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800">
                 <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">Net Profit</p>
                 <div className="text-xl font-extrabold text-green-700 dark:text-green-300">₹{netProfit.toFixed(0)}</div>
                 <div className="text-[10px] font-bold bg-white/50 dark:bg-black/20 inline-block px-1.5 py-0.5 rounded text-green-700 dark:text-green-300 mt-1">{profitMargin.toFixed(1)}% Margin</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-800">
                 <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Total Expenses</p>
                 <div className="text-xl font-extrabold text-red-700 dark:text-red-300">₹{totalExpenses.toFixed(0)}</div>
                 <div className="text-[10px] font-medium text-red-600 dark:text-red-400 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Costs</div>
              </div>
           </div>

           {/* Add Expense Form */}
           <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Add New Expense</h4>
              <div className="grid grid-cols-2 gap-3">
                 <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none" />
              </div>
              <input type="text" placeholder="Description (e.g. 50 Bags Cement)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none" />
              <div className="flex gap-3">
                 <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 p-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none font-bold" />
                 <button onClick={handleAdd} className="bg-slate-900 dark:bg-indigo-600 text-white px-4 rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition shadow-lg active:scale-95"><Plus className="w-5 h-5" /></button>
              </div>
           </div>

           {/* Expenses List */}
           <div>
              <h4 className="font-bold text-sm text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Expense History</h4>
              {expenses.length === 0 ? (
                 <div className="text-center py-8 text-slate-400 text-sm italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">No expenses recorded yet.</div>
              ) : (
                 <div className="space-y-2 max-h-48 overflow-y-auto">
                    {expenses.map(exp => (
                       <div key={exp.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                          <div>
                             <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{exp.category}</div>
                             <div className="text-xs text-slate-500 dark:text-slate-400">{exp.description} <span className="opacity-50">• {new Date(exp.date).toLocaleDateString()}</span></div>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="font-bold text-red-600 dark:text-red-400">₹{exp.amount}</span>
                             <button onClick={() => onDeleteExpense(exp.id)} className="text-slate-400 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </div>

        </div>
      </div>
    </div>
  );
};

export default ExpensesModal;
