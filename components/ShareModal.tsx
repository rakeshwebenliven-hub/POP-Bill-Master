
import React, { useState } from 'react';
import { X, FileText, FileDown, Share2, Loader2, Download, CheckCircle2, Copy, Table } from 'lucide-react';
import { APP_TEXT } from '../constants';
import { PaymentStatus } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareText: (status: PaymentStatus) => void;
  onSharePdf: (status: PaymentStatus) => Promise<void>;
  onShareExcel: (status: PaymentStatus) => Promise<void>;
  onDownloadPdf: (status: PaymentStatus) => void;
  onDownloadExcel: (status: PaymentStatus) => void;
  previewText: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ 
  isOpen, 
  onClose, 
  onShareText, 
  onSharePdf, 
  onShareExcel,
  onDownloadPdf,
  onDownloadExcel,
  previewText 
}) => {
  const [sharingType, setSharingType] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('Pending');
  const [copied, setCopied] = useState(false);
  const t = APP_TEXT;

  if (!isOpen) return null;

  const wrapShare = async (type: string, fn: (s: PaymentStatus) => Promise<void> | void) => {
    setSharingType(type);
    try {
        await fn(status);
    } finally {
        setSharingType(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up border-t border-slate-200 dark:border-slate-800 sm:border safe-area-bottom">
        
        {/* Mobile Grab Handle */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden" onClick={onClose}>
           <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
               <Share2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Export Bill</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Status Selection - Segmented Control Style */}
          <div>
             <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 block ml-1">Bill Status</label>
             <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
                <button 
                  onClick={() => setStatus('Pending')}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${status === 'Pending' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm scale-[0.98]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                   Unpaid (Due)
                </button>
                <button 
                  onClick={() => setStatus('Paid')}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${status === 'Paid' ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm scale-[0.98]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                   Paid (Received) <CheckCircle2 className="w-4 h-4" />
                </button>
             </div>
          </div>

          {/* Primary Actions - Share Grid */}
          <div>
             <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 block ml-1">Share File</label>
             <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => wrapShare('pdf', onSharePdf)}
                    disabled={!!sharingType}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 active:scale-95 transition disabled:opacity-50"
                >
                    {sharingType === 'pdf' ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
                    <span className="font-bold text-sm">PDF</span>
                </button>

                <button 
                    onClick={() => wrapShare('excel', onShareExcel)}
                    disabled={!!sharingType}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 active:scale-95 transition disabled:opacity-50"
                >
                    {sharingType === 'excel' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Table className="w-6 h-6" />}
                    <span className="font-bold text-sm">Excel</span>
                </button>
             </div>
          </div>

          {/* Secondary Actions - Download Grid */}
          <div>
             <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 block ml-1">Download to Device</label>
             <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={() => onDownloadPdf(status)}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition"
                 >
                    <FileDown className="w-4 h-4" /> PDF
                 </button>

                 <button 
                    onClick={() => onDownloadExcel(status)}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition"
                 >
                    <FileDown className="w-4 h-4" /> Excel
                 </button>
             </div>
          </div>

          {/* Tertiary Action - Text Share */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
             <div className="flex gap-2">
                <button 
                    onClick={() => wrapShare('text', onShareText)}
                    className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition"
                >
                    <Share2 className="w-4 h-4" /> Share Text Summary
                </button>
                <button 
                    onClick={handleCopy}
                    className="w-12 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition"
                >
                    {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ShareModal;
