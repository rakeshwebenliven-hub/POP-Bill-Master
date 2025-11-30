import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { loginUser } from '../services/authService';
import { CheckCircle, ShieldCheck, Zap, Smartphone, Mail, ArrowRight, User, Lock, Timer, ArrowLeft, MessageSquare, Loader2, X } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: (user: UserProfile) => void;
}

type Step = 'welcome' | 'auth' | 'mobile-input' | 'email-input' | 'otp-verify' | 'profile' | 'trial-start';

const MOCK_GOOGLE_ACCOUNTS = [
  { name: "Vikram Singh", email: "vikram.singh@gmail.com", color: "bg-purple-600" },
  { name: "Rahul Sharma", email: "rahul.sharma99@gmail.com", color: "bg-blue-600" },
  { name: "Priya Patel", email: "priya.work@gmail.com", color: "bg-emerald-600" }
];

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [authMethod, setAuthMethod] = useState<'google' | 'phone' | 'email' | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [otp, setOtp] = useState(['', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [showMockNotification, setShowMockNotification] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleAccounts, setShowGoogleAccounts] = useState(false);

  // Timer logic for OTP
  useEffect(() => {
    let interval: any;
    if (step === 'otp-verify' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Simulate receiving OTP (SMS or Email) when entering verify step
  useEffect(() => {
    if (step === 'otp-verify') {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(code);
      // Show mock notification after 1.5 seconds
      const timeout = setTimeout(() => {
        setShowMockNotification(true);
        // Hide after 5 seconds
        setTimeout(() => setShowMockNotification(false), 5000);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [step]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4).split('');
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      pastedData.forEach((char, index) => {
        if (index < 4) newOtp[index] = char;
      });
      setOtp(newOtp);
      // Focus the last filled box or the next empty one
      const focusIndex = Math.min(pastedData.length, 3);
      document.getElementById(`otp-${focusIndex}`)?.focus();
    }
  };

  const handleResendOtp = () => {
    setTimer(30);
    setCanResend(false);
    setOtp(['', '', '', '']);
    // Generate new code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setShowMockNotification(true);
    setTimeout(() => setShowMockNotification(false), 5000);
  };

  const handleGoogleLoginInit = () => {
    setIsGoogleLoading(true);
    // Simulate initial popup preparation
    setTimeout(() => {
      setIsGoogleLoading(false);
      setShowGoogleAccounts(true);
    }, 800);
  };

  const handleGoogleAccountSelect = (account: typeof MOCK_GOOGLE_ACCOUNTS[0]) => {
    setShowGoogleAccounts(false);
    setIsGoogleLoading(true);
    // Simulate API delay and data fetching
    setTimeout(() => {
      setAuthMethod('google');
      setFormData({
        name: account.name,
        email: account.email,
        phone: ""
      });
      setIsGoogleLoading(false);
      setStep('profile');
    }, 1500);
  };

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  // Step 1: Welcome Screen
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-none mb-8 rotate-3 transition-transform hover:rotate-6">
           <Zap className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">POP Bill Master</h1>
        <p className="text-slate-600 dark:text-slate-300 text-lg mb-10 max-w-xs font-medium leading-relaxed">
          Professional billing, PDF exports, and business management in one app.
        </p>
        
        <div className="space-y-5 w-full max-w-xs mb-10 text-left bg-white/50 dark:bg-black/20 p-6 rounded-2xl backdrop-blur-sm border border-white/20">
           <FeatureRow text="Create Bills in Seconds" />
           <FeatureRow text="Professional PDF & Excel" />
           <FeatureRow text="Manage Payment History" />
           <FeatureRow text="Auto-Calculate Areas" />
        </div>

        <button 
          onClick={() => setStep('auth')}
          className="w-full max-w-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl text-lg shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 group"
        >
          Start 3-Day Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
        <p className="mt-4 text-xs text-slate-400 font-medium">No credit card required for trial.</p>
      </div>
    );
  }

  // Step 2: Auth Selection Screen
  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 animate-in slide-in-from-right duration-300 relative">
        <button onClick={() => setStep('welcome')} className="text-slate-500 hover:text-indigo-600 font-medium self-start mb-8 flex items-center gap-1 transition"><ArrowLeft className="w-4 h-4" /> Back</button>
        
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Get Started</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">Sign up to sync your data and manage bills.</p>

        <div className="space-y-4 w-full max-w-sm mx-auto">
          <button 
            onClick={handleGoogleLoginInit}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition relative overflow-hidden shadow-sm"
          >
             {isGoogleLoading ? (
               <>
                 <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                 <span>Syncing with Google...</span>
               </>
             ) : (
               <>
                 <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                 Continue with Google
               </>
             )}
          </button>

          <button 
            onClick={() => { setAuthMethod('phone'); setStep('mobile-input'); }}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
          >
             <Smartphone className="w-5 h-5 text-indigo-500" />
             Continue with Mobile
          </button>

          <button 
            onClick={() => { setAuthMethod('email'); setStep('email-input'); }}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
          >
             <Mail className="w-5 h-5 text-indigo-500" />
             Continue with Email
          </button>
          
          <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Preferred in India</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
          </div>
        </div>

        {/* Google Account Selector Modal */}
        {showGoogleAccounts && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-4 border border-slate-200 dark:border-slate-800">
                 <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Choose an account</span>
                    <button onClick={() => setShowGoogleAccounts(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"><X className="w-5 h-5 text-slate-400" /></button>
                 </div>
                 <div className="p-2 space-y-1">
                    {MOCK_GOOGLE_ACCOUNTS.map((acc, i) => (
                       <button 
                          key={i}
                          onClick={() => handleGoogleAccountSelect(acc)}
                          className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition text-left group"
                       >
                          <div className={`w-10 h-10 rounded-full ${acc.color} text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-110 transition-transform`}>
                             {acc.name.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                             <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{acc.name}</div>
                             <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{acc.email}</div>
                          </div>
                       </button>
                    ))}
                    <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2">
                       <button className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition text-left text-sm font-bold text-slate-600 dark:text-slate-300">
                          <div className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                             <User className="w-5 h-5" />
                          </div>
                          Use another account
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  }

  // Step 2.1a: Mobile Number Input
  if (step === 'mobile-input') {
    return (
       <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 animate-in slide-in-from-right duration-300">
         <button onClick={() => setStep('auth')} className="text-slate-500 hover:text-indigo-600 font-medium self-start mb-8 flex items-center gap-1 transition"><ArrowLeft className="w-4 h-4" /> Back</button>
         
         <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Enter Mobile</h2>
         <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">We will send you a 4-digit OTP.</p>

         <div className="max-w-sm mx-auto w-full space-y-8">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Mobile Number</label>
              <div className="relative group">
                 <span className="absolute left-3 top-4 text-slate-500 font-bold">+91</span>
                 <input 
                   type="tel" 
                   inputMode="numeric"
                   pattern="\d*"
                   className="w-full pl-12 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 dark:text-white font-bold text-xl tracking-widest transition-colors shadow-sm"
                   placeholder="98765 43210"
                   value={formData.phone}
                   onChange={e => {
                     const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                     setFormData({...formData, phone: val});
                   }}
                   autoFocus
                 />
              </div>
            </div>

            <button 
              onClick={() => {
                 if(formData.phone.length === 10) {
                    setTimer(30);
                    setCanResend(false);
                    setOtp(['', '', '', '']);
                    setStep('otp-verify');
                 } else {
                    alert("Please enter a valid 10-digit mobile number");
                 }
              }}
              disabled={formData.phone.length !== 10}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg shadow-xl shadow-indigo-200 dark:shadow-none transition flex items-center justify-center gap-2 active:scale-95"
            >
              Get OTP <ArrowRight className="w-5 h-5" />
            </button>
         </div>
       </div>
    );
  }

  // Step 2.1b: Email Input (New)
  if (step === 'email-input') {
    return (
       <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 animate-in slide-in-from-right duration-300">
         <button onClick={() => setStep('auth')} className="text-slate-500 hover:text-indigo-600 font-medium self-start mb-8 flex items-center gap-1 transition"><ArrowLeft className="w-4 h-4" /> Back</button>
         
         <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Enter Email</h2>
         <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">We will send you a 4-digit verification code.</p>

         <div className="max-w-sm mx-auto w-full space-y-8">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                 <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                 <input 
                   type="email" 
                   className="w-full pl-12 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 dark:text-white font-bold text-lg shadow-sm transition-colors"
                   placeholder="name@example.com"
                   value={formData.email}
                   onChange={e => setFormData({...formData, email: e.target.value})}
                   autoFocus
                 />
              </div>
            </div>

            <button 
              onClick={() => {
                 if(validateEmail(formData.email)) {
                    setTimer(30);
                    setCanResend(false);
                    setOtp(['', '', '', '']);
                    setStep('otp-verify');
                 } else {
                    alert("Please enter a valid email address");
                 }
              }}
              disabled={!validateEmail(formData.email)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg shadow-xl shadow-indigo-200 dark:shadow-none transition flex items-center justify-center gap-2 active:scale-95"
            >
              Get OTP <ArrowRight className="w-5 h-5" />
            </button>
         </div>
       </div>
    );
  }

  // Step 2.2: OTP Verify
  if (step === 'otp-verify') {
     const isEmail = authMethod === 'email';
     const destination = isEmail ? formData.email : `+91 ${formData.phone}`;

     return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 animate-in slide-in-from-right duration-300 relative overflow-hidden">
         
         {/* Mock Notification Banner */}
         <div className={`fixed top-4 left-4 right-4 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-4 flex items-center gap-4 z-50 transition-all duration-500 transform ${showMockNotification ? 'translate-y-0 opacity-100' : '-translate-y-32 opacity-0'}`}>
            <div className={`p-3 rounded-xl ${isEmail ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
               {isEmail ? <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" /> : <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />}
            </div>
            <div>
               <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">{isEmail ? 'MAIL APP' : 'MESSAGES'} • now</p>
               <p className="text-slate-800 dark:text-slate-200 font-medium">Your OTP is <span className="font-bold text-2xl text-indigo-600 dark:text-indigo-400 ml-1">{generatedOtp}</span></p>
            </div>
         </div>

         <button onClick={() => setStep(isEmail ? 'email-input' : 'mobile-input')} className="text-slate-500 hover:text-indigo-600 font-medium self-start mb-8 flex items-center gap-1 transition"><ArrowLeft className="w-4 h-4" /> Change {isEmail ? 'Email' : 'Number'}</button>
         
         <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Enter OTP</h2>
         <p className="text-slate-500 dark:text-slate-400 mb-10 text-lg">Sent to {destination}</p>

         <div className="max-w-sm mx-auto w-full space-y-10">
            <div className="flex gap-3 sm:gap-4 justify-between px-1">
               {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="number"
                    inputMode="numeric"
                    pattern="\d*"
                    autoComplete={idx === 0 ? "one-time-code" : "off"}
                    className="w-14 h-16 sm:w-16 sm:h-16 text-center text-3xl font-bold bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 dark:text-white appearance-none transition-all shadow-sm"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                       if (e.key === 'Backspace' && !digit && idx > 0) {
                          document.getElementById(`otp-${idx - 1}`)?.focus();
                       }
                    }}
                  />
               ))}
            </div>

            <div className="text-center text-sm">
               {canResend ? (
                  <button 
                     onClick={handleResendOtp}
                     className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                     Resend OTP
                  </button>
               ) : (
                  <span className="text-slate-400 flex items-center justify-center gap-2 font-medium">
                     <Timer className="w-4 h-4" /> Resend in 00:{timer.toString().padStart(2, '0')}
                  </span>
               )}
            </div>

            <button 
              onClick={() => {
                 const code = otp.join('');
                 // In a real app, verify with backend. Here we accept the generated code OR a generic bypass for testing "1234"
                 if(code.length === 4 && (code === generatedOtp || code === '1234')) {
                    setStep('profile');
                 } else {
                    alert(`Invalid OTP. Please try entering ${generatedOtp}`);
                 }
              }}
              disabled={otp.some(d => !d)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg shadow-xl shadow-indigo-200 dark:shadow-none transition flex items-center justify-center gap-2 active:scale-95"
            >
              Verify & Continue <ArrowRight className="w-5 h-5" />
            </button>
         </div>
       </div>
     );
  }

  // Step 3: Profile Setup
  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 animate-in slide-in-from-right duration-300">
         <button onClick={() => setStep(authMethod === 'phone' ? 'welcome' : 'auth')} className="text-slate-500 hover:text-indigo-600 font-medium self-start mb-8 flex items-center gap-1 transition"><ArrowLeft className="w-4 h-4" /> Back</button>
         
         <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">One Last Step</h2>
         <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">Enter your details to generate professional bills.</p>

         <div className="space-y-6 max-w-sm mx-auto w-full">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Your Name</label>
              <div className="relative">
                 <User className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                 <input 
                   type="text" 
                   className="w-full pl-12 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 dark:text-white font-semibold text-lg transition-colors shadow-sm"
                   placeholder="e.g. Rahul Sharma"
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   autoFocus={authMethod !== 'google'} // Don't autofocus if name is pre-filled from google
                 />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Mobile Number</label>
              <div className="relative">
                 {authMethod === 'phone' ? (
                     <Lock className="absolute left-4 top-4 w-5 h-5 text-green-500" />
                 ) : (
                     <Smartphone className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                 )}
                 <input 
                   type="tel" 
                   className={`w-full pl-12 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 dark:text-white font-semibold text-lg transition-colors shadow-sm ${authMethod === 'phone' ? 'opacity-80 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-dashed' : ''}`}
                   placeholder="+91 98765 43210"
                   value={formData.phone}
                   onChange={e => {
                     if (authMethod !== 'phone') setFormData({...formData, phone: e.target.value});
                   }}
                   readOnly={authMethod === 'phone'}
                 />
                 {authMethod === 'phone' && (
                     <span className="absolute right-4 top-4 text-xs text-green-600 font-bold flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                        <CheckCircle className="w-3 h-3" /> Verified
                     </span>
                 )}
              </div>
            </div>

            <div>
               <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Email</label>
               <div className="relative">
                  {authMethod === 'google' || authMethod === 'email' ? (
                     <Lock className="absolute left-4 top-4 w-5 h-5 text-green-500" />
                  ) : (
                     <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                  )}
                  <input 
                    type="email" 
                    className={`w-full pl-12 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 dark:text-white font-semibold text-lg transition-colors shadow-sm ${(authMethod === 'google' || authMethod === 'email') ? 'opacity-80 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-dashed' : ''}`}
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={e => {
                      if (authMethod !== 'google' && authMethod !== 'email') setFormData({...formData, email: e.target.value});
                    }}
                    readOnly={authMethod === 'google' || authMethod === 'email'}
                  />
                  {(authMethod === 'google' || authMethod === 'email') && (
                     <span className="absolute right-4 top-4 text-xs text-green-600 font-bold flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                        <CheckCircle className="w-3 h-3" /> Verified
                     </span>
                  )}
               </div>
            </div>

            <button 
              onClick={() => {
                 if(formData.name && formData.phone && validateEmail(formData.email)) {
                    setStep('trial-start');
                 } else {
                    alert("Please fill in Name, Phone, and a valid Email address.");
                 }
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl text-lg shadow-xl shadow-indigo-200 dark:shadow-none transition mt-8 flex items-center justify-center gap-2 active:scale-95"
            >
              Finish Setup <ArrowRight className="w-5 h-5" />
            </button>
         </div>
      </div>
    );
  }

  // Step 4: Trial Activation
  if (step === 'trial-start') {
     const handleStart = () => {
        const user = loginUser(formData);
        onComplete(user);
     };

     return (
       <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-8 animate-bounce shadow-2xl border border-white/20">
             <ShieldCheck className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">3 Days Free Trial</h1>
          <p className="text-indigo-100 text-xl mb-10 font-medium">Everything unlocked. No charges today.</p>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 w-full max-w-xs text-left text-white space-y-4 mb-10 border border-white/20 shadow-lg">
             <div className="flex justify-between items-center text-lg">
                <span>Today</span>
                <span className="font-bold">₹0.00</span>
             </div>
             <div className="w-full h-px bg-white/20"></div>
             <div className="flex justify-between items-center text-indigo-200">
                <span>After 3 days</span>
                <span>Select Plan</span>
             </div>
          </div>

          <button 
             onClick={handleStart}
             className="w-full max-w-sm bg-white text-indigo-700 font-bold py-4 rounded-xl text-xl shadow-2xl hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
             Activate Free Trial <Zap className="w-5 h-5 fill-indigo-700" />
          </button>
       </div>
     );
  }

  return null;
};

const FeatureRow = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3">
    <CheckCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
    <span className="text-slate-800 dark:text-slate-200 font-bold text-lg">{text}</span>
  </div>
);

export default OnboardingFlow;