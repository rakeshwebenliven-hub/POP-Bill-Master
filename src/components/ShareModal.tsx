
import React, { useState } from 'react';
import { X, FileText, FileDown, Share2, Loader2, Table, MessageCircle, Printer, CheckCircle2 } from 'lucide-react';
import { APP_TEXT } from '../constants';
import { PaymentStatus, DocumentType } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareText: (status: PaymentStatus) => void;
  onSharePdf: (status: PaymentStatus) => Promise<void>;
  onShareExcel: (status: PaymentStatus) => Promise<void>;
  onDownloadPdf: (status: PaymentStatus) => void;
  onDownloadExcel: (status: PaymentStatus) => void;
  onPrint: (status: PaymentStatus) => void;
  previewText: string;
  documentType: DocumentType;
}

const ShareModal: React.FC<ShareModalProps> = ({ 
  isOpen, onClose, onShareText, onSharePdf, onShareExcel,
  onDownloadPdf, onDownloadExcel, onPrint, documentType
}) => {
  const [sharingType, setSharingType] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('Pending');

  if (!isOpen) return null;

  const isEstimate = documentType === 'estimate';
  const modalTitle = isEstimate ? "Export Estimate / Quote" : "Export Invoice / Bill";

  const wrapShare = async (type: string, fn: (s: PaymentStatus) => Promise<void> | void) => {
    setSharingType(type);
    try { await fn(status); } finally { setSharingType(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up border-t border-slate-200 dark:border-slate-800 sm:border safe-area-bottom">
        <div className="px-5 py-3 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{modalTitle}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-6">
          {!isEstimate && (
            <div>
               <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Invoice Status</label>
               <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button onClick={() => setStatus('Pending')} className={`py-2 rounded-lg text-sm font-bold ${status === 'Pending' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Unpaid (Due)</button>
                  <button onClick={() => setStatus('Paid')} className={`py-2 rounded-lg text-sm font-bold ${status === 'Paid' ? 'bg-white dark:bg-slate-700 text-green-600 shadow-sm' : 'text-slate-500'}`}>Paid <CheckCircle2 className="w-3 h-3 inline" /></button>
               </div>
            </div>
          )}

          <button onClick={() => wrapShare('text', onShareText)} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg active:scale-95 transition shadow-lg shadow-green-200 dark:shadow-none">
             <MessageCircle className="w-6 h-6" /> Share Text Summary
          </button>

          <div className="grid grid-cols-3 gap-3">
             <button onClick={() => wrapShare('pdf', onSharePdf)} disabled={!!sharingType} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 active:scale-95 transition">
                {sharingType === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                <span className="text-xs font-bold">Share PDF</span>
             </button>
             <button onClick={() => wrapShare('excel', onShareExcel)} disabled={!!sharingType} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 active:scale-95 transition">
                {sharingType === 'excel' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Table className="w-5 h-5" />}
                <span className="text-xs font-bold">Share Excel</span>
             </button>
             <button onClick={() => onPrint(status)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 border border-slate-200 hover:bg-slate-100 active:scale-95 transition">
                <Printer className="w-5 h-5" />
                <span className="text-xs font-bold">Print</span>
             </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <button onClick={() => onDownloadPdf(status)} className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50"><FileDown className="w-4 h-4" /> PDF</button>
             <button onClick={() => onDownloadExcel(status)} className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50"><FileDown className="w-4 h-4" /> Excel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
