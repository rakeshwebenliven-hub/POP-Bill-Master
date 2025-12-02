
import React from 'react';
import { X, User, Crown, Cloud, RefreshCw, LogOut, ChevronRight, ShieldCheck, Mail, Phone, Calendar } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  planDetails: { name: string; expiry: string };
  onLogout: () => void;
  onBackup: () => void;
  onRestore: () => void;
  onUpgrade: () => void;
  isSyncing: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  planDetails, 
  onLogout, 
  onBackup, 
  onRestore, 
  onUpgrade,
  isSyncing 
}) => {
  if (!isOpen) return null;

  const isTrial = user.planId === 'trial';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up border-t border-slate-200 dark:border-slate-800 sm:border safe-area-bottom">
        
        {/* Mobile Grab Handle */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden bg-indigo-600/5 dark:bg-white/5" onClick={onClose}>
           <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
            My Profile
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* User Info Card */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
             <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-300 border-2 border-white dark:border-slate-700 shadow-md">
                {user.name.charAt(0).toUpperCase()}
             </div>
             <div className="min-w-0 flex-1">
                <h2 className="font-bold text-lg text-slate-900 dark:text-white truncate flex items-center gap-1">
                   {user.name}
                   {!isTrial && <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />}
                </h2>
                <div className="flex flex-col gap-0.5 mt-1">
                   {user.email && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                         <Mail className="w-3 h-3" /> {user.email}
                      </div>
                   )}
                   {user.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                         <Phone className="w-3 h-3" /> {user.phone}
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* Subscription Section */}
          <div>
             <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 ml-1">Subscription</h4>
             <div className={`p-4 rounded-2xl border ${isTrial ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                <div className="flex justify-between items-start mb-3">
                   <div>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isTrial ? 'text-indigo-500' : 'text-amber-600'}`}>Current Plan</p>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                         {planDetails.name}
                      </h3>
                   </div>
                   <div className={`p-2 rounded-full ${isTrial ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-200' : 'bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-200'}`}>
                      {isTrial ? <ShieldCheck className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                   </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-4 bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                   <Calendar className="w-4 h-4" />
                   {planDetails.expiry}
                </div>

                <button 
                   onClick={() => { onClose(); onUpgrade(); }}
                   className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                >
                   {isTrial ? 'Upgrade Plan' : 'Manage Subscription'} <ChevronRight className="w-4 h-4" />
                </button>
             </div>
          </div>

          {/* Cloud Sync Section */}
          <div>
             <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 ml-1">Cloud Backup (Google Drive)</h4>
             <div className="grid grid-cols-2 gap-3">
                <button 
                   onClick={onBackup}
                   disabled={isSyncing}
                   className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-750 transition active:scale-95 disabled:opacity-50"
                >
                   <Cloud className={`w-6 h-6 text-indigo-500 ${isSyncing ? 'animate-pulse' : ''}`} />
                   <span className="font-bold text-sm text-slate-700 dark:text-slate-200">Backup Data</span>
                </button>
                <button 
                   onClick={onRestore}
                   disabled={isSyncing}
                   className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-750 transition active:scale-95 disabled:opacity-50"
                >
                   <RefreshCw className={`w-6 h-6 text-green-500 ${isSyncing ? 'animate-spin' : ''}`} />
                   <span className="font-bold text-sm text-slate-700 dark:text-slate-200">Restore Data</span>
                </button>
             </div>
             <p className="text-[10px] text-slate-400 text-center mt-2">Syncs Bills, History, and Profiles safely to your private Google Drive.</p>
          </div>

          {/* Logout */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
             <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition font-bold text-sm"
             >
                <LogOut className="w-4 h-4" /> Sign Out
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
