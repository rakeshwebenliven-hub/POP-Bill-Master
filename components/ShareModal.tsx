
import React, { useState } from 'react';
import { X, FileText, FileDown, Table, Copy, Check, Share2, Loader2, Download, DollarSign } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const [sharingType, setSharingType] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('Pending');
  const t = APP_TEXT;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wrapShare = async (type: string, fn: (s: PaymentStatus) => Promise<void> | void) => {
    setSharingType(type);
    try {
        await fn(status);
    } finally {
        setSharingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-slate-200 dark:border-slate-800">
        
        <div className="p-4 bg-indigo-600 dark:bg-indigo-950 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-200" />
            <h3 className="font-semibold text-lg">Export & Share</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-indigo-500 dark:hover:bg-indigo-800 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          
          {/* Status Selection */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
             <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 block">Bill Status for this Export</label>
             <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => setStatus('Pending')}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition flex items-center justify-center gap-2 ${status === 'Pending' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                   Unpaid (Due)
                </button>
                <button 
                  onClick={() => setStatus('Paid')}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition flex items-center justify-center gap-2 ${status === 'Paid' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                   Paid (Received) <Check className="w-4 h-4" />
                </button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             {/* Download Buttons */}
             <button 
                onClick={() => onDownloadPdf(status)}
                className="col-span-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/10 transition group"
             >
                <FileDown className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Download PDF</span>
             </button>

             <button 
                onClick={() => onDownloadExcel(status)}
                className="col-span-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-green-200 dark:hover:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/10 transition group"
             >
                <Download className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Download Excel</span>
             </button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Share via App</p>
             <div className="grid grid-cols-1 gap-3">
                <button 
                    onClick={() => wrapShare('text', onShareText)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left group"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 group-hover:text-green-600">
                       <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Share Text Summary</span>
                </button>

                <button 
                    onClick={() => wrapShare('pdf', onSharePdf)}
                    disabled={!!sharingType}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left group disabled:opacity-50"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 group-hover:text-red-600">
                       {sharingType === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Share PDF File</span>
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ShareModal;
