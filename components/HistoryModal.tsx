
import React, { useState } from 'react';
import { Clock, Download, Trash2, X, Calendar, User, FileText, RotateCcw, FileDown, Pencil } from 'lucide-react';
import { SavedBillData, PaymentStatus } from '../types';
import { APP_TEXT } from '../constants';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SavedBillData[];
  trash: SavedBillData[];
  onLoad: (bill: SavedBillData) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: PaymentStatus) => void;
  onDownloadPdf?: (bill: SavedBillData) => void;
  onDownloadExcel?: (bill: SavedBillData) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  trash,
  onLoad, 
  onDelete, 
  onRestore,
  onPermanentDelete,
  onUpdateStatus, 
  onDownloadPdf,
  onDownloadExcel
}) => {
  const t = APP_TEXT;
  const [activeTab, setActiveTab] = useState<'history' | 'trash'>('history');

  if (!isOpen) return null;

  const currentList = activeTab === 'history' ? history : trash;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85dvh] flex flex-col border-t border-slate-200 dark:border-slate-800 sm:border transition-colors safe-area-bottom animate-slide-up">
        
        {/* Mobile Grabber */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden bg-indigo-700 dark:bg-indigo-950" onClick={onClose}>
           <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="p-4 bg-indigo-700 dark:bg-indigo-950 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-200" />
            <h3 className="font-semibold text-lg">{t.savedBills}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-indigo-600 dark:hover:bg-indigo-800 rounded-full transition bg-indigo-800/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
           <button 
             onClick={() => setActiveTab('history')}
             className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'history' ? 'text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 border-b-2 border-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'}`}
           >
             <FileText className="w-4 h-4" /> {t.savedBills} ({history.length})
           </button>
           <button 
             onClick={() => setActiveTab('trash')}
             className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'trash' ? 'text-red-700 dark:text-red-400 bg-white dark:bg-slate-900 border-b-2 border-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400'}`}
           >
             <Trash2 className="w-4 h-4" /> {t.trash} ({trash.length})
           </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-100 dark:bg-slate-950">
          {currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
              {activeTab === 'history' ? (
                 <>
                   <div className="w-16 h-16 bg-slate-200 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4"><FileText className="w-8 h-8 opacity-50" /></div>
                   <p className="font-medium">{t.noSavedBills}</p>
                 </>
              ) : (
                 <>
                   <div className="w-16 h-16 bg-slate-200 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4"><Trash2 className="w-8 h-8 opacity-50" /></div>
                   <p className="font-medium">{t.emptyTrash}</p>
                 </>
              )}
            </div>
          ) : (
            currentList.map((bill) => {
              const date = new Date(bill.timestamp).toLocaleDateString();
              const time = new Date(bill.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const totalAmount = bill.items.reduce((acc, item) => acc + item.amount, 0);
              const rate = bill.gstRate || 18;
              const gst = bill.gstEnabled ? totalAmount * (rate / 100) : 0;
              const grandTotal = totalAmount + gst;

              return (
                <div key={bill.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                       <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">
                          <span>{date}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span>{time}</span>
                          {bill.billNumber && <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 ml-1">{bill.billNumber}</span>}
                       </div>
                       <h4 className="font-bold text-slate-900 dark:text-white text-base truncate flex items-center gap-2">
                         {bill.client.name || 'Unknown Client'}
                       </h4>
                       <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{bill.client.address}</p>
                    </div>
                    
                    <div className="text-right shrink-0">
                       <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{grandTotal.toFixed(0)}</div>
                       <div className="text-xs text-slate-400">{bill.items.length} Items</div>
                    </div>
                  </div>

                  {activeTab === 'history' && (
                    <div className="flex items-center justify-between gap-3 mb-4">
                       <select 
                        value={bill.paymentStatus || 'Pending'}
                        onChange={(e) => onUpdateStatus(bill.id, e.target.value as PaymentStatus)}
                        className={`text-xs font-bold py-1.5 px-3 rounded-lg border appearance-none outline-none cursor-pointer ${
                          bill.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' :
                          bill.paymentStatus === 'Pending' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' :
                          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
                        }`}
                       >
                          <option value="Pending">Due</option>
                          <option value="Paid">Paid</option>
                          <option value="Partial">Partial</option>
                       </select>
                       
                       <div className="flex gap-2">
                          {onDownloadPdf && (
                            <button onClick={() => onDownloadPdf(bill)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"><FileDown className="w-4 h-4" /></button>
                          )}
                          {onDownloadExcel && (
                            <button onClick={() => onDownloadExcel(bill)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"><Download className="w-4 h-4" /></button>
                          )}
                       </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    {activeTab === 'history' ? (
                      <>
                        <button 
                          onClick={() => onLoad(bill)}
                          className="py-2.5 px-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition flex items-center justify-center gap-2"
                        >
                          <Pencil className="w-4 h-4" /> {t.load}
                        </button>
                        <button 
                          onClick={() => { if (window.confirm(t.confirmDelete)) onDelete(bill.id); }}
                          className="py-2.5 px-4 bg-white dark:bg-slate-800 text-red-500 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> {t.delete}
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => onRestore(bill.id)}
                          className="py-2.5 px-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-bold hover:bg-green-100 dark:hover:bg-green-900/50 transition flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" /> {t.restore}
                        </button>
                        <button 
                          onClick={() => { if (window.confirm("Delete forever?")) onPermanentDelete(bill.id); }}
                          className="py-2.5 px-4 bg-white dark:bg-slate-800 text-red-500 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
