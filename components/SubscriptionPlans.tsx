
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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 mb-6 animate-pulse">
             <div className="bg-red-100 dark:bg-red-800 p-2 rounded-full shrink-0">
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
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-center gap-3 mb-6">
             <div className="bg-amber-100 dark:bg-amber-800 p-2 rounded-full shrink-0">
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
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl flex items-center gap-3 mb-6">
             <div className="bg-indigo-100 dark:bg-indigo-800 p-2 rounded-full shrink-0">
                <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-200" />
             </div>
             <div>
                <h3 className="font-bold text-lg text-indigo-800 dark:text-indigo-200">Subscribe Before Your Trial Expires</h3>
                <p className="text-sm text-indigo-600 dark:text-indigo-300">Subscribe to continue creating bills.</p>
             </div>
          </div>
       );
    }

    // 4. Paid Plan Expiring Soon (3 Days or less)
    if (isPaid && remainingDays <= 3 && remainingDays > 0) {
        return (
           <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-xl flex items-center gap-3 mb-6">
              <div className="bg-orange-100 dark:bg-orange-800 p-2 rounded-full shrink-0">
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
       <div className="text-center mb-8">
         <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Choose Your Plan</h2>
         <p className="text-slate-500 dark:text-slate-400">Unlock premium features forever.</p>
       </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 pb-20 overflow-y-auto">
       <div className="max-w-2xl mx-auto">
          
          {onBack && (
             <button 
               onClick={onBack}
               className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
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
                     className={`relative border-2 rounded-2xl p-4 cursor-pointer transition-all duration-200 ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'}`}
                   >
                      {plan.recommended && (
                         <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <Star className="w-3 h-3 fill-white" /> Best Value
                         </div>
                      )}
                      
                      <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-600' : 'border-slate-300'}`}>
                               {isSelected && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">{plan.name}</h3>
                         </div>
                         {plan.saveLabel && (
                            <span className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                               {plan.saveLabel}
                            </span>
                         )}
                      </div>

                      <div className="flex justify-between items-end pl-8">
                         <div>
                            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">₹{plan.price}</span>
                            {plan.originalPrice > plan.price && (
                               <span className="text-sm text-slate-400 line-through ml-2">₹{plan.originalPrice}</span>
                            )}
                            <div className="text-xs text-slate-500 mt-1">
                               Effective: <span className="font-semibold">₹{monthlyCost}/mo</span>
                            </div>
                         </div>
                         {savings > 0 && (
                            <div className="text-xs text-indigo-600 dark:text-indigo-300 font-medium">
                               Save ₹{savings}
                            </div>
                         )}
                      </div>
                   </div>
                );
             })}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
             <div className="max-w-2xl mx-auto flex justify-between items-center gap-4">
                <div className="text-sm">
                   <p className="text-slate-500 dark:text-slate-400">Total Amount</p>
                   <p className="text-xl font-bold text-slate-900 dark:text-white">₹{selectedPlan.price}</p>
                </div>
                <button 
                   onClick={() => setShowPayment(true)}
                   className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition"
                >
                   Continue
                </button>
             </div>
          </div>
       </div>

       {/* Payment Modal */}
       {showPayment && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white dark:bg-slate-900 w-full max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                   <h3 className="font-bold text-lg dark:text-white">Select Payment Method</h3>
                   <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-red-500 p-1">
                      <div className="w-6 h-6 flex items-center justify-center font-mono">✕</div>
                   </button>
                </div>
                
                <div className="p-4 space-y-3">
                   {PAYMENT_METHODS.map(method => (
                      <button
                         key={method.id}
                         onClick={() => setPaymentMethod(method.id)}
                         className={`w-full flex items-center justify-between p-4 rounded-xl border transition ${paymentMethod === method.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                         <div className="flex items-center gap-3">
                            <span className="text-2xl">{method.icon}</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{method.name}</span>
                         </div>
                         {paymentMethod === method.id && <Check className="w-5 h-5 text-indigo-600" />}
                      </button>
                   ))}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-slate-500 dark:text-slate-400 text-sm">Amount to pay</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">₹{selectedPlan.price}</span>
                   </div>
                   
                   <button 
                      onClick={handlePay}
                      disabled={!paymentMethod || processing}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                   >
                      {processing ? (
                         <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                         </>
                      ) : (
                         <>
                            <ShieldCheck className="w-5 h-5" /> Pay ₹{selectedPlan.price}
                         </>
                      )}
                   </button>
                   <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" /> 100% Secure Payment via UPI/Cards
                   </p>
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

export default SubscriptionPlans;
