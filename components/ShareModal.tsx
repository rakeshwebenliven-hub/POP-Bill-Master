
import React, { useState } from 'react';
import { X, FileText, FileDown, Table, Copy, Check, Share2, Loader2 } from 'lucide-react';
import { APP_TEXT } from '../constants';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareText: () => void;
  onSharePdf: () => Promise<void>;
  onShareExcel: () => Promise<void>;
  previewText: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ 
  isOpen, 
  onClose, 
  onShareText, 
  onSharePdf, 
  onShareExcel,
  previewText 
}) => {
  const [copied, setCopied] = useState(false);
  const [sharingType, setSharingType] = useState<string | null>(null);
  const t = APP_TEXT;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wrapShare = async (type: string, fn: () => Promise<void> | void) => {
    setSharingType(type);
    try {
        await fn();
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
            <h3 className="font-semibold text-lg">{t.shareModalTitle}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-indigo-500 dark:hover:bg-indigo-800 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          
          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-3">
             <button 
                onClick={() => wrapShare('text', onShareText)}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm text-left group"
             >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <FileText className="w-5 h-5" />
                </div>
                <div>
                   <h4 className="font-bold text-slate-800 dark:text-slate-100">{t.shareOptions.text}</h4>
                   <p className="text-xs text-slate-500 dark:text-slate-400">Share via WhatsApp / Message</p>
                </div>
             </button>

             <button 
                onClick={() => wrapShare('pdf', onSharePdf)}
                disabled={!!sharingType}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm text-left group disabled:opacity-50"
             >
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                   {sharingType === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                </div>
                <div>
                   <h4 className="font-bold text-slate-800 dark:text-slate-100">{t.shareOptions.pdf}</h4>
                   <p className="text-xs text-slate-500 dark:text-slate-400">Professional PDF Invoice</p>
                </div>
             </button>

             <button 
                onClick={() => wrapShare('excel', onShareExcel)}
                disabled={!!sharingType}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm text-left group disabled:opacity-50"
             >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                   {sharingType === 'excel' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Table className="w-5 h-5" />}
                </div>
                <div>
                   <h4 className="font-bold text-slate-800 dark:text-slate-100">{t.shareOptions.excel}</h4>
                   <p className="text-xs text-slate-500 dark:text-slate-400">Editable Excel Spreadsheet</p>
                </div>
             </button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t.sharePreview}</span>
                <button 
                   onClick={handleCopy} 
                   className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                   {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {t.copyToClipboard}
                </button>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                {previewText}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ShareModal;
