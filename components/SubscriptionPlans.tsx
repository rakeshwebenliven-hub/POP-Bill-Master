import React, { useState } from 'react';
import { SUBSCRIPTION_PLANS, PAYMENT_METHODS } from '../constants';
import { purchasePlan } from '../services/authService';
import { Check, Loader2, Lock, ShieldCheck, Star, Clock, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { UserProfile } from '../types';

interface SubscriptionPlansProps {
  onSuccess: (user: UserProfile) => void;
  planId?: string;
  remainingDays?: number;
  onBack?: () => void;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSuccess, planId, remainingDays = 0, onBack }) => {
  const [selectedPlanId, setSelectedPlanId] = useState('6-month'); // Default recommended
  const [showPayment, setShowPayment] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId)!;

  const handlePay = () => {
     setProcessing(true);
     // Simulate API call delay
     setTimeout(() => {
        const updatedUser = purchasePlan(selectedPlanId);
        if (updatedUser) {
           onSuccess(updatedUser);
        }
        setProcessing(false);
        setShowPayment(false);
     }, 2000);
  };

  // Determine Header Content based on Trial State
  const renderHeader = () => {
    const isTrial = planId === 'trial';
    const isPaid = planId && planId !== 'trial';
    const isExpired = remainingDays <= 0;
    
    // 1. Trial Fully Expired
    if (isTrial && isExpired) {
       return (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-5 rounded-2xl flex items-center gap-4 mb-8 animate-pulse shadow-sm">
             <div className="bg-red-100 dark:bg-red-800 p-3 rounded-full shrink-0">
                <Lock className="w-6 h-6 text-red-600 dark:text-red-200" />
             </div>
             <div>
                <h3 className="font-bold text-lg text-red-800 dark:text-red-200">Trial Expired</h3>
                <p className="text-sm text-red-600 dark:text-red-300">Subscribe to continue creating bills.</p>
             </div>
          </div>
       );
    }

    // 2. Trial Ending Tomorrow (1 Day Left)
    if (isTrial && remainingDays === 1) {
       return (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-5 rounded-2xl flex items-center gap-4 mb-8 shadow-sm">
             <div className="bg-amber-100 dark:bg-amber-800 p-3 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-200" />
             </div>
             <div>
                <h3 className="font-bold text-lg text-amber-800 dark:text-amber-200">Your Trial Ends Tomorrow</h3>
                <p className="text-sm text-amber-600 dark:text-amber-300">Subscribe now to avoid interruption.</p>
             </div>
          </div>
       );
    }

    // 3. Trial Active (Days 1-2)
    if (isTrial && remainingDays > 1) {
       return (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-5 rounded-2xl flex items-center gap-4 mb-8 shadow-sm">
             <div className="bg-indigo-100 dark:bg-indigo-800 p-3 rounded-full shrink-0">
                <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-200" />
             </div>
             <div>
                <h3 className="font-bold text-lg text-indigo-800 dark:text-indigo-200">Subscribe Before Trial Ends</h3>
                <p className="text-sm text-indigo-600 dark:text-indigo-300">Subscribe to continue creating bills.</p>
             </div>
          </div>
       );
    }

    // 4. Paid Plan Expiring Soon (3 Days or less)
    if (isPaid && remainingDays <= 3 && remainingDays > 0) {
        return (
           <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-5 rounded-2xl flex items-center gap-4 mb-8 shadow-sm">
              <div className="bg-orange-100 dark:bg-orange-800 p-3 rounded-full shrink-0">
                 <RefreshCw className="w-6 h-6 text-orange-600 dark:text-orange-200" />
              </div>
              <div>
                 <h3 className="font-bold text-lg text-orange-800 dark:text-orange-200">Renew Your Plan</h3>
                 <p className="text-sm text-orange-600 dark:text-orange-300">Your plan expires in {remainingDays} day{remainingDays !== 1 ? 's' : ''}. Renew now.</p>
              </div>
           </div>
        );
     }

    // Default / Generic / Upgrade voluntarily
    return (
       <div className="text-center mb-10">
         <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Choose Your Plan</h2>
         <p className="text-slate-500 dark:text-slate-400 text-lg">Unlock premium features forever.</p>
       </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 pb-32 overflow-y-auto">
       <div className="max-w-2xl mx-auto">
          
          {onBack && (
             <button 
               onClick={onBack}
               className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition font-medium"
             >
                <ArrowLeft className="w-5 h-5" /> Back to App
             </button>
          )}

          {renderHeader()}

          <div className="grid gap-4 mb-8">
             {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const savings = plan.originalPrice - plan.price;
                const monthlyCost = Math.round(plan.price / plan.durationMonths);

                return (
                   <div 
                     key={plan.id}
                     onClick={() => setSelectedPlanId(plan.id)}
                     className={`relative border-2 rounded-2xl p-5 cursor-pointer transition-all duration-300 transform ${isSelected ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-xl shadow-indigo-100 dark:shadow-none scale-[1.02] z-10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 hover:shadow-md'}`}
                   >
                      {plan.recommended && (
                         <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg shadow-indigo-200 dark:shadow-none tracking-wide uppercase">
                            <Star className="w-3 h-3 fill-white" /> Best Value
                         </div>
                      )}
                      
                      <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-4">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-indigo-600' : 'border-slate-300'}`}>
                               {isSelected && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{plan.name}</h3>
                         </div>
                         {plan.saveLabel && (
                            <span className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full uppercase tracking-wider">
                               {plan.saveLabel}
                            </span>
                         )}
                      </div>

                      <div className="flex justify-between items-end pl-10">
                         <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400">₹{plan.price}</span>
                                {plan.originalPrice > plan.price && (
                                   <span className="text-sm text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600 decoration-2">₹{plan.originalPrice}</span>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 font-medium">
                               Effective: <span className="text-slate-900 dark:text-white">₹{monthlyCost}/mo</span>
                            </div>
                         </div>
                         {savings > 0 && (
                            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                               Save ₹{savings}
                            </div>
                         )}
                      </div>
                   </div>
                );
             })}
          </div>
       </div>

       {/* Floating Bottom Bar */}
       <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="max-w-2xl mx-auto flex justify-between items-center gap-4">
             <div className="text-sm">
                <p className="text-slate-500 dark:text-slate-400 font-medium">Total Amount</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{selectedPlan.price}</p>
             </div>
             <button 
                onClick={() => setShowPayment(true)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-xl shadow-indigo-200 dark:shadow-none transition active:scale-95 text-lg"
             >
                Continue
             </button>
          </div>
       </div>

       {/* Payment Modal */}
       {showPayment && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white dark:bg-slate-900 w-full max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-950/80">
                   <h3 className="font-bold text-lg dark:text-white">Select Payment Method</h3>
                   <button onClick={() => setShowPayment(false)} className="bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-full p-2 transition">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                
                <div className="p-5 space-y-3">
                   {PAYMENT_METHODS.map(method => (
                      <button
                         key={method.id}
                         onClick={() => setPaymentMethod(method.id)}
                         className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${paymentMethod === method.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                      >
                         <div className="flex items-center gap-4">
                            <span className="text-2xl">{method.icon}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{method.name}</span>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === method.id ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                            {paymentMethod === method.id && <Check className="w-4 h-4 text-white" />}
                         </div>
                      </button>
                   ))}
                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                   <div className="flex justify-between items-center mb-5">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Amount to pay</span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">₹{selectedPlan.price}</span>
                   </div>
                   
                   <button 
                      onClick={handlePay}
                      disabled={!paymentMethod || processing}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-xl transition flex items-center justify-center gap-2 text-lg active:scale-95"
                   >
                      {processing ? (
                         <>
                            <Loader2 className="w-6 h-6 animate-spin" /> Processing...
                         </>
                      ) : (
                         <>
                            <ShieldCheck className="w-6 h-6" /> Pay Securely
                         </>
                      )}
                   </button>
                   <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-1.5 font-medium">
                      <Lock className="w-3.5 h-3.5" /> 256-bit SSL Secure Payment
                   </p>
                </div>
             </div>
          </div>
       )}
       
       {/* X Icon helper for modal close button since import was missing in previous file version */}
       <div className="hidden">
         <ArrowLeft /> <Star /> <Clock />
       </div>
    </div>
  );
};

// Helper for icon since it wasn't imported in previous scope
const X = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default SubscriptionPlans;