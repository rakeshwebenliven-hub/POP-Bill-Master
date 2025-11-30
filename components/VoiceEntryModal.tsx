
import React, { useState, useEffect, useRef } from 'react';
import { ParsedBillItem } from '../types';
import { APP_TEXT } from '../constants';
import { Mic, X, Check, MessageSquare, AlertTriangle, Pencil, ChevronDown, Loader2 } from 'lucide-react';

interface VoiceEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: ParsedBillItem) => void;
}

type UnitMode = 'sq.ft' | 'rft' | 'nos';

// Critical Domain Corrections Only
const DOMAIN_CORRECTIONS: Record<string, string> = {
    'upsc': 'pop', 
    'syllabus': 'ceiling', 
    'selling': 'ceiling', 
    'cornish': 'cornice', 
    'jipsum': 'gypsum',
    'helmet': 'pelmet',
    'murga': 'murga' 
};

const VoiceEntryModal: React.FC<VoiceEntryModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedItem, setParsedItem] = useState<ParsedBillItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetUnit, setTargetUnit] = useState<UnitMode>('sq.ft');
  const [targetFloor, setTargetFloor] = useState<string>('');
  const [customFloor, setCustomFloor] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null);
  const t = APP_TEXT;

  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setParsedItem(null);
      setError(null);
      setIsProcessing(false);
      
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-IN'; 

        recognitionRef.current.onstart = () => { setIsListening(true); setError(null); };
        
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
             finalTranscript += event.results[i][0].transcript;
          }
          finalTranscript = finalTranscript.replace(/\s+/g, ' ');
          setTranscript(finalTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          setIsListening(false);
          if (event.error === 'not-allowed') setError("Microphone permission denied.");
        };

        recognitionRef.current.onend = () => setIsListening(false);
      } else {
        setError(t.speechNotSupported);
      }
    }
    
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isOpen]); 

  useEffect(() => {
    if (transcript) {
        setIsProcessing(true);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        
        debounceTimerRef.current = setTimeout(() => {
            const floorToUse = targetFloor === 'custom' ? customFloor : targetFloor;
            const parsed = parseLocalTranscript(transcript, targetUnit, floorToUse);
            setParsedItem(parsed);
            setIsProcessing(false);
        }, 500);
    }
  }, [transcript, targetUnit, targetFloor, customFloor]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (error === t.speechNotSupported) return;
      if (!transcript) { setParsedItem(null); setError(null); }
      try { recognitionRef.current?.start(); } catch (e) { console.error(e); }
    }
  };

  const normalizeNumbers = (text: string): string => {
    const map: Record<string, string> = { 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10', 'twenty': '20', 'thirty': '30', 'fifty': '50', 'hundred': '100' };
    return text.split(' ').map(word => map[word.toLowerCase()] || word).join(' ');
  };

  const applyDomainCorrections = (text: string): string => {
      let corrected = text;
      Object.keys(DOMAIN_CORRECTIONS).forEach(wrong => {
          const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
          corrected = corrected.replace(regex, DOMAIN_CORRECTIONS[wrong]);
      });
      return corrected;
  };

  // Robust Parser Logic
  const parseLocalTranscript = (text: string, unitMode: UnitMode, manualFloor: string): ParsedBillItem => {
    let cleanText = applyDomainCorrections(text);
    let processingText = normalizeNumbers(cleanText);
    
    let length = 0, width = 0, quantity = 1, rate = 0, floor = manualFloor;

    processingText = processingText.toLowerCase()
        .replace(/\b(by|buy|bye|bai|be|into|cross)\b/g, 'x')
        .replace(/\b(ret|red|kimat|bhav|bhaav|ka)\b/g, 'rate');

    // Extract Floor
    if (!floor) {
        if (processingText.match(/\b(ground|gf)\b/)) floor = 'Ground Floor';
        else if (processingText.match(/\b(first|1st|ff)\b/)) floor = '1st Floor';
        else if (processingText.match(/\b(second|2nd|sf)\b/)) floor = '2nd Floor';
        else if (processingText.match(/\b(third|3rd)\b/)) floor = '3rd Floor';
        else if (processingText.match(/\b(basement)\b/)) floor = 'Basement';
    }

    // Helper: Find Rate (Priority 1)
    const extractRate = (txt: string): { val: number, cleanTxt: string } => {
        // Matches: "rate 95", "@95", "95 rupees"
        // Strict Lookahead: Ensure number isn't followed by "x" or is part of a dimension
        const rateRegex = /(\d+(?:\.\d+)?)\s*(?:rs|rupees?)|(?:rs|rupees?)\s*(\d+(?:\.\d+)?)|(?:rate|price|@)\s*[:\-\s]*(\d+(?:\.\d+)?)/i;
        const match = txt.match(rateRegex);
        if (match) {
            const val = parseFloat(match[1] || match[2] || match[3]);
            return { val, cleanTxt: txt.replace(match[0], ' ') };
        }
        return { val: 0, cleanTxt: txt };
    };

    if (unitMode === 'nos') {
        // 1. Quantity First (e.g. "4 pieces")
        const qtyRegex = /(\d+)\s*(?:pcs|pieces|nos|numbers|items)/i; 
        const qtyMatch = processingText.match(qtyRegex);
        if (qtyMatch) {
            quantity = parseInt(qtyMatch[1]);
            processingText = processingText.replace(qtyMatch[0], ' ');
        }

        // 2. Rate Second
        const rateRes = extractRate(processingText);
        if (rateRes.val > 0) {
            rate = rateRes.val;
            processingText = rateRes.cleanTxt;
        }

        // 3. Fallbacks
        const numbers = (processingText.match(/(\d+(?:\.\d+)?)/g) || []).map(Number);
        if (quantity === 1 && !qtyMatch && numbers.length > 0) {
             quantity = numbers.shift()!; 
        }
        if (rate === 0 && numbers.length > 0) {
            rate = numbers[0];
        }

    } else {
        // Sq.ft / R.ft: Rate First to protect dimensions
        const rateRes = extractRate(processingText);
        if (rateRes.val > 0) {
            rate = rateRes.val;
            processingText = rateRes.cleanTxt;
        }

        if (unitMode === 'sq.ft') {
            const dimXRegex = /(\d+(?:\.\d+)?)\s*(?:x|\*)\s*(\d+(?:\.\d+)?)/;
            const dimXMatch = processingText.match(dimXRegex);
            if (dimXMatch) {
                length = parseFloat(dimXMatch[1]);
                width = parseFloat(dimXMatch[2]);
                processingText = processingText.replace(dimXMatch[0], ' ');
            } else {
                const numbers = (processingText.match(/(\d+(\.\d+)?)/g) || []).map(Number);
                if (numbers.length >= 2) {
                    length = numbers[0];
                    width = numbers[1];
                    processingText = processingText.replace(numbers[0].toString(), '').replace(numbers[1].toString(), '');
                }
            }
        } else if (unitMode === 'rft') {
            const numbers = (processingText.match(/(\d+(\.\d+)?)/g) || []).map(Number);
            if (numbers.length > 0) {
                length = numbers[0];
                processingText = processingText.replace(numbers[0].toString(), '');
            }
        }
    }

    // Cleanup Description
    let cleanDesc = processingText
      .replace(/\b(ground|first|second|floor)\b/gi, '')
      .replace(/\b(rate|price|rs|rupees)\b/gi, '')
      .replace(/\b(sq\.?ft|rft|nos|pieces)\b/gi, '')
      .replace(/[0-9]/g, '') 
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleanDesc) cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
  
    return { description: cleanDesc || "Item", length, width, quantity, rate, unit: unitMode, floor };
  };

  const getHintText = () => {
     if (targetUnit === 'sq.ft') return "Try: 'Bedroom 10 by 12 rate 95'";
     if (targetUnit === 'rft') return "Try: 'Cornice 100 feet rate 45'";
     return "Try: 'Panel 4 pieces rate 250'";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden mb-0 sm:mb-8 border border-slate-200 dark:border-slate-800 transition-colors animate-slide-up">
        
        <div className="p-4 bg-indigo-600 dark:bg-indigo-950 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-200" />
            <h3 className="font-semibold text-lg">{t.voiceEntry}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-indigo-500 dark:hover:bg-indigo-800 rounded-full transition"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-5 flex flex-col items-center text-center">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-lg text-sm flex items-center gap-2 w-full text-left"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}

          <div className="w-full mb-6 space-y-4">
             <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block text-left">Floor</label>
                    <div className="relative">
                        <select value={targetFloor} onChange={(e) => setTargetFloor(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium appearance-none">
                            <option value="">Auto Detect</option>
                            {Object.values(t.floors).map(f => <option key={f} value={f}>{f}</option>)}
                            <option value="custom">Manual...</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
             </div>

             {targetFloor === 'custom' && (
                <input type="text" placeholder="e.g. Mezzanine" value={customFloor} onChange={(e) => setCustomFloor(e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white animate-in slide-in-from-top-2 duration-200" autoFocus />
             )}

             <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block text-left">Unit Type</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['sq.ft', 'rft', 'nos'] as const).map((u) => (
                    <button key={u} onClick={() => setTargetUnit(u)} className={`py-2 px-1 rounded-lg text-sm font-bold border-2 transition-all ${targetUnit === u ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-500' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300'}`}>
                        {u === 'sq.ft' ? t.sqft : u === 'rft' ? t.rft : t.nos}
                    </button>
                    ))}
                </div>
             </div>
          </div>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 italic">{getHintText()}</p>

          <button onClick={toggleListening} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${isListening ? 'bg-red-500 scale-110 ring-4 ring-red-200 dark:ring-red-900/50' : 'bg-gradient-to-br from-indigo-500 to-indigo-700 hover:to-indigo-600'} ${error === t.speechNotSupported ? 'opacity-50 cursor-not-allowed bg-slate-400' : ''}`} disabled={error === t.speechNotSupported}>
            {isListening ? <span className="animate-pulse text-white"><Mic className="w-8 h-8" /></span> : <Mic className="w-8 h-8 text-white" />}
          </button>

          <p className="mt-4 h-6 text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2">
            {isListening ? t.listening : (isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.processing}</> : (transcript ? "Tap text to edit" : "Tap mic to start"))}
          </p>

          <div className="mt-4 w-full relative">
            <label className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1 block text-left">Transcript</label>
            <div className="relative">
                <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none max-h-32 overflow-y-auto shadow-inner" rows={2} placeholder="Speak details..." />
                <Pencil className="w-3 h-3 absolute right-3 bottom-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {parsedItem && (
            <div className="mt-4 w-full bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 text-left animate-in zoom-in-95 duration-200">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2">
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Description</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{parsedItem.description}</span>
                </div>
                {parsedItem.floor && (
                    <div className="col-span-2">
                        <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Floor</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-xs bg-white dark:bg-slate-800 px-2 py-0.5 rounded inline-block border border-indigo-100 dark:border-indigo-900">{parsedItem.floor}</span>
                    </div>
                )}
                <div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Unit</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 uppercase">{parsedItem.unit}</span>
                </div>
                <div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">{parsedItem.unit === 'sq.ft' ? 'Size (LxW)' : parsedItem.unit === 'rft' ? 'Length' : 'Qty'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{parsedItem.unit === 'sq.ft' ? `${parsedItem.length} x ${parsedItem.width}` : parsedItem.unit === 'rft' ? `${parsedItem.length}` : `${parsedItem.quantity}`}</span>
                </div>
                <div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Rate</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">₹{parsedItem.rate}</span>
                </div>
                <div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Amount</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">₹{(parsedItem.unit === 'sq.ft' ? (parsedItem.length * parsedItem.width * parsedItem.quantity * parsedItem.rate) : parsedItem.unit === 'rft' ? (parsedItem.length * parsedItem.quantity * parsedItem.rate) : (parsedItem.quantity * parsedItem.rate)).toFixed(0)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex w-full gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition">{t.cancel}</button>
            <button onClick={() => parsedItem && onConfirm(parsedItem)} disabled={!parsedItem} className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 dark:bg-indigo-700 text-white font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"><Check className="w-4 h-4" /> Fill Details</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceEntryModal;
