
import React, { useState } from 'react';
import { Clock, Download, Trash2, X, Calendar, User, FileText, RotateCcw, Archive, FileDown, Pencil } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85dvh] flex flex-col border border-slate-200 dark:border-slate-800 transition-colors">
        
        {/* Header */}
        <div className="p-4 bg-indigo-700 dark:bg-indigo-950 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-200" />
            <h3 className="font-semibold text-lg">{t.savedBills}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-indigo-600 dark:hover:bg-indigo-800 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-indigo-50 dark:bg-slate-950 border-b border-indigo-100 dark:border-slate-800">
           <button 
             onClick={() => setActiveTab('history')}
             className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition ${activeTab === 'history' ? 'text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 border-t-2 border-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'}`}
           >
             <FileText className="w-4 h-4" /> {t.savedBills} ({history.length})
           </button>
           <button 
             onClick={() => setActiveTab('trash')}
             className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition ${activeTab === 'trash' ? 'text-red-700 dark:text-red-400 bg-white dark:bg-slate-900 border-t-2 border-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400'}`}
           >
             <Trash2 className="w-4 h-4" /> {t.trash} ({trash.length})
           </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
          {currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-600">
              {activeTab === 'history' ? (
                 <>
                   <FileText className="w-16 h-16 mb-4 opacity-20" />
                   <p>{t.noSavedBills}</p>
                 </>
              ) : (
                 <>
                   <Trash2 className="w-16 h-16 mb-4 opacity-20" />
                   <p>{t.emptyTrash}</p>
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
                <div key={bill.id} className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 mb-2">
                    <div className="flex-1">
                       <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                          <Calendar className="w-3 h-3" />
                          <span>{date} • {time}</span>
                          {bill.billNumber && <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-600 dark:text-slate-300">{bill.billNumber}</span>}
                       </div>
                       <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg flex items-center gap-2 truncate">
                         <User className="w-4 h-4 text-indigo-500 shrink-0" />
                         <span className="truncate">{bill.client.name || 'Unknown Client'}</span>
                       </h4>
                       <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{bill.client.address}</p>
                    </div>
                    <div className="flex flex-row sm:flex-col justify-between items-center sm:items-end sm:text-right border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-2 sm:pt-0">
                       <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">TOTAL</span>
                       <div className="flex items-baseline gap-2 sm:block">
                           <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">₹{grandTotal.toFixed(0)}</span>
                           <span className="text-xs text-slate-400 block">{bill.items.length} Items</span>
                       </div>
                    </div>
                  </div>

                  {activeTab === 'history' && (
                    <div className="mt-2 mb-3 flex flex-wrap items-center gap-2">
                       <select 
                        value={bill.paymentStatus || 'Pending'}
                        onChange={(e) => onUpdateStatus(bill.id, e.target.value as PaymentStatus)}
                        className={`text-xs font-bold py-1.5 px-2 rounded border cursor-pointer outline-none flex-grow sm:flex-grow-0 ${
                          bill.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-800' :
                          bill.paymentStatus === 'Pending' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-800' :
                          'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-800'
                        }`}
                       >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Partial">Partial</option>
                       </select>
                       
                       {/* Quick Actions */}
                       <div className="flex gap-2 ml-auto">
                          {onDownloadPdf && (
                            <button 
                              onClick={() => onDownloadPdf(bill)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded border border-slate-200 dark:border-slate-700 transition"
                              title="Download PDF"
                            >
                              <FileDown className="w-4 h-4" />
                            </button>
                          )}
                          {onDownloadExcel && (
                            <button 
                              onClick={() => onDownloadExcel(bill)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded border border-slate-200 dark:border-slate-700 transition"
                              title="Download Excel"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                       </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {activeTab === 'history' ? (
                      <>
                        <button 
                          onClick={() => onLoad(bill)}
                          className="flex-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition flex items-center justify-center gap-2"
                        >
                          <Pencil className="w-4 h-4" />
                          {t.load}
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm(t.confirmDelete)) {
                              onDelete(bill.id);
                            }
                          }}
                          className="px-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition flex items-center justify-center"
                          title={t.moveToTrash}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => onRestore(bill.id)}
                          className="flex-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 py-2 rounded-lg text-sm font-semibold hover:bg-green-100 dark:hover:bg-green-900/50 transition flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          {t.restore}
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm("Delete this bill forever? This cannot be undone.")) {
                              onPermanentDelete(bill.id);
                            }
                          }}
                          className="px-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition flex items-center justify-center"
                          title={t.permanentDelete}
                        >
                          <Trash2 className="w-4 h-4" />
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
