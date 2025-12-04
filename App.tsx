
// ... existing imports ...
import { 
  Plus, Trash2, X, Calculator, Pencil, Clock, Save, Search, 
  AlertCircle, Image as ImageIcon, Upload, Share2, Users, QrCode, 
  FilePlus, Moon, Sun, Mic, Building2, LogOut, Crown, Cloud, 
  RefreshCw, CheckCircle2, User, ChevronRight, Loader2, FileText, 
  LayoutList, Contact, FileCheck, Wallet, PieChart, ChevronLeft, 
  Menu, Settings, Check, ArrowRight, Home, ChevronDown, ChevronUp, 
  Landmark, Trash 
} from 'lucide-react';
// ... rest of imports ...

// ... inside App component ...

             {/* 3-Step Wizard Header */}
             <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 safe-area-top">
                <div className="max-w-4xl mx-auto px-4 py-3">
                   <div className="flex justify-between items-center mb-4">
                      <h1 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                         {documentType === 'estimate' ? <FilePlus className="w-5 h-5 text-amber-600" /> : <FileText className="w-5 h-5 text-indigo-600" />}
                         {documentType === 'invoice' ? 'New Invoice' : 'New Estimate'}
                      </h1>
                      <div className="flex gap-2">
                         <button onClick={() => setIsCalcOpen(true)} className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full font-bold text-xs hover:bg-indigo-200 transition">
                            <Calculator className="w-3.5 h-3.5" /> Calc
                         </button>
                         <button onClick={handleNewBill} className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition">Reset</button>
                         <button onClick={toggleTheme} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">{isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
                         <button onClick={() => setIsProfileModalOpen(true)} className="p-1 bg-indigo-100 dark:bg-indigo-900 rounded-full text-indigo-600 dark:text-indigo-300"><User className="w-5 h-5" /></button>
                      </div>
                   </div>
                   
                   {/* Step Indicator ... */}
                   <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl relative">
                      {/* Animated Background */}
                      <div 
                        className={`absolute top-1 bottom-1 w-1/3 bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-all duration-300 ease-in-out ${
                           createStep === 'parties' ? 'left-1' : createStep === 'items' ? 'left-[33.33%]' : 'left-[66.66%]'
                        }`}
                      ></div>
                      
                      <button onClick={() => setCreateStep('parties')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${createStep === 'parties' ? 'text-indigo-600 dark:text-white' : 'text-slate-500'}`}>1. {t.stepParties}</button>
                      <button onClick={() => validateAndNext('items')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${createStep === 'items' ? 'text-indigo-600 dark:text-white' : 'text-slate-500'}`}>2. {t.stepItems}</button>
                      <button onClick={() => validateAndNext('summary')} className={`flex-1 relative z-10 py-2 text-xs font-bold text-center transition-colors ${createStep === 'summary' ? 'text-indigo-600 dark:text-white' : 'text-slate-500'}`}>3. {t.stepSummary}</button>
                   </div>
                </div>
             </div>

// ... rest of the file ...
