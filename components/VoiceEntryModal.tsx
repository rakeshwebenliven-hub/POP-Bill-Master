
import React, { useState, useEffect, useRef } from 'react';
import { ParsedBillItem } from '../types';
import { APP_TEXT } from '../constants';
import { Mic, X, Check, MessageSquare, AlertTriangle, Pencil, ChevronDown } from 'lucide-react';

interface VoiceEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: ParsedBillItem) => void;
}

type UnitMode = 'sq.ft' | 'rft' | 'nos';

// Minimal Domain Corrections - Only for words that Speech Engines 100% fail on
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
      // Reset state
      setTranscript('');
      setParsedItem(null);
      setError(null);
      setCustomFloor('');
      setTargetFloor('');
      setIsProcessing(false);
      
      // Initialize Speech Recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        // Critical for "hearing" capability: 
        recognitionRef.current.continuous = true; 
        recognitionRef.current.interimResults = true; 
        
        // Force English (India) for best accent support
        recognitionRef.current.lang = 'en-IN'; 

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setError(null);
        };
        
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
             finalTranscript += event.results[i][0].transcript;
          }
          // Simple cleanup of spaces
          finalTranscript = finalTranscript.replace(/\s+/g, ' ');
          setTranscript(finalTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setError("Microphone permission denied.");
          } else if (event.error === 'no-speech') {
            setIsListening(false);
          } else {
            // Don't show error for simple no-speech timeouts, just stop listening UI
            setIsListening(false);
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        setError(t.speechNotSupported);
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen]); 

  // Debounced Parsing: Re-parse whenever transcript or settings change, but wait for user to stop typing/speaking
  useEffect(() => {
    if (transcript) {
        setIsProcessing(true);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        
        debounceTimerRef.current = setTimeout(() => {
            const floorToUse = targetFloor === 'custom' ? customFloor : targetFloor;
            const parsed = parseLocalTranscript(transcript, targetUnit, floorToUse);
            setParsedItem(parsed);
            setIsProcessing(false);
        }, 400); // 400ms delay
    }
  }, [transcript, targetUnit, targetFloor, customFloor]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (error === t.speechNotSupported) return;
      
      // Reset logic only if starting fresh
      if (!transcript) {
        setParsedItem(null);
        setError(null);
      }
      
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Failed to start recognition", e);
      }
    }
  };

  // Convert word-numbers to digits (e.g. "ten" -> 10)
  const normalizeNumbers = (text: string): string => {
    const map: Record<string, string> = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
        'eleven': '11', 'twelve': '12', 'twenty': '20', 'thirty': '30',
        'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
        'eighty': '80', 'ninety': '90', 'hundred': '100'
    };
    
    return text.split(' ').map(word => map[word.toLowerCase()] || word).join(' ');
  };

  // Apply Minimal Domain Corrections
  const applyDomainCorrections = (text: string): string => {
      let corrected = text;
      Object.keys(DOMAIN_CORRECTIONS).forEach(wrong => {
          // Match whole word only, case insensitive
          const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
          corrected = corrected.replace(regex, DOMAIN_CORRECTIONS[wrong]);
      });
      return corrected;
  };

  // Enhanced Regex Parser
  const parseLocalTranscript = (text: string, unitMode: UnitMode, manualFloor: string): ParsedBillItem => {
    // 1. First Apply Minimal Domain Corrections
    let cleanText = applyDomainCorrections(text);
    
    // 2. Normalize Numbers (words to digits)
    let processingText = normalizeNumbers(cleanText);

    let length = 0;
    let width = 0;
    let quantity = 1;
    let rate = 0;
    let floor = manualFloor;
  
    // 3. Normalize Phonetic Matches
    processingText = processingText.toLowerCase()
        // Replace 'by' with 'x' for easy dimension split
        .replace(/\b(by|buy|bye|bai|be|into|cross|multiply|guna)\b/g, 'x') 
        .replace(/\b(ret|red|kimat|bhav|bhaav|ka)\b/g, 'rate');

    // 4. Detect Floor (if not manually selected)
    if (!floor) {
        if (processingText.match(/\b(ground|gf)\b/)) floor = 'Ground Floor';
        else if (processingText.match(/\b(first|1st|ff|pehla)\b/)) floor = '1st Floor';
        else if (processingText.match(/\b(second|2nd|sf|dusra)\b/)) floor = '2nd Floor';
        else if (processingText.match(/\b(third|3rd|tf|tisra)\b/)) floor = '3rd Floor';
        else if (processingText.match(/\b(fourth|4th)\b/)) floor = '4th Floor';
        else if (processingText.match(/\b(basement)\b/)) floor = 'Basement';
    }

    // --- HELPER: Extract and Remove Rate ---
    const extractRate = (txt: string): { val: number, cleanTxt: string } => {
        // Matches: "rate 95", "@95", "95 rupees", "price 50"
        // Negative lookahead (?!\s*\d) prevents matching "12" in "12 rate" (where 12 is dimension)
        const rateRegex = /(\d+(?:\.\d+)?)\s*(?:rs|rupees?|rupaye)|(?:rs|rupees?|rupaye)\s*(\d+(?:\.\d+)?)|(?:rate|price|cost|@|at)\s*[:\-\s]*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rate|price)(?!\s*\d)/i;
        
        const rateMatch = txt.match(rateRegex);
        if (rateMatch) {
            const foundRate = rateMatch[1] || rateMatch[2] || rateMatch[3] || rateMatch[4];
            if (foundRate) {
                return { val: parseFloat(foundRate), cleanTxt: txt.replace(rateMatch[0], ' ') };
            }
        }
        return { val: 0, cleanTxt: txt };
    };

    // --- EXECUTION ORDER BASED ON UNIT ---

    if (unitMode === 'nos') {
        // STRATEGY FOR NOS:
        // 1. Find explicit quantity (e.g. "4 pieces") FIRST to avoid confusion with rate
        // 2. Then Find Rate
        // 3. Then Find implicit numbers
        
        // 1. Explicit Quantity
        const qtyRegex = /(\d+)\s*(?:pcs|pieces|nos|numbers|items|prices)/i; 
        const qtyMatch = processingText.match(qtyRegex);
        
        if (qtyMatch) {
            quantity = parseInt(qtyMatch[1]);
            processingText = processingText.replace(qtyMatch[0], ' ');
        }

        // 2. Extract Rate
        const rateRes = extractRate(processingText);
        if (rateRes.val > 0) {
            rate = rateRes.val;
            processingText = rateRes.cleanTxt;
        }

        // 3. Fallback / Implicit Handling
        const numbers = (processingText.match(/(\d+(?:\.\d+)?)/g) || []).map(Number);
        
        // If explicit quantity wasn't found, take the first number
        if (quantity === 1 && !qtyMatch && numbers.length > 0) {
             quantity = numbers[0];
             // Remove used number
             const idx = processingText.indexOf(numbers[0].toString());
             if (idx > -1) processingText = processingText.slice(0, idx) + processingText.slice(idx + numbers[0].toString().length);
             // Remove from numbers array for next step
             numbers.shift(); 
        }

        // If rate wasn't found but we still have numbers (implicit rate)
        if (rate === 0 && numbers.length > 0) {
            rate = numbers[0];
            const idx = processingText.indexOf(numbers[0].toString());
             if (idx > -1) processingText = processingText.slice(0, idx) + processingText.slice(idx + numbers[0].toString().length);
        }

    } else {
        // STRATEGY FOR SQ.FT / R.FT:
        // 1. Extract Rate FIRST (to protect dimensions like "10" from being seen as "10 rate")
        // 2. Then Extract Dimensions

        // 1. Extract Rate
        const rateRes = extractRate(processingText);
        if (rateRes.val > 0) {
            rate = rateRes.val;
            processingText = rateRes.cleanTxt;
        }

        // 2. Extract Dimensions
        if (unitMode === 'sq.ft') {
            // Pattern 1: Explicit "10 x 12" (remember we replaced 'by' with 'x')
            const dimXRegex = /(\d+(?:\.\d+)?)\s*(?:x|\*)\s*(\d+(?:\.\d+)?)/;
            const dimXMatch = processingText.match(dimXRegex);
    
            if (dimXMatch) {
                length = parseFloat(dimXMatch[1]);
                width = parseFloat(dimXMatch[2]);
                processingText = processingText.replace(dimXMatch[0], ' ');
            } else {
                // Pattern 2: Fallback to finding first 2 numbers
                const numbers = (processingText.match(/(\d+(\.\d+)?)/g) || []).map(Number);
                if (numbers.length >= 2) {
                    length = numbers[0];
                    width = numbers[1];
                    processingText = processingText.replace(numbers[0].toString(), '').replace(numbers[1].toString(), '');
                }
            }
        } else if (unitMode === 'rft') {
            // Find first number
            const numbers = (processingText.match(/(\d+(\.\d+)?)/g) || []).map(Number);
            if (numbers.length > 0) {
                length = numbers[0];
                processingText = processingText.replace(numbers[0].toString(), '');
            }
        }
    }

    // 7. CLEANUP DESCRIPTION
    // Remove the original raw text parts that were used for parsing
    let cleanDesc = processingText
      .replace(/\b(ground|first|second|third|fourth|basement|floor)\b/gi, '')
      .replace(/\b(rate|price|bhav|rs|rupees|rupaye)\b/gi, '')
      .replace(/\b(sq\.?ft|rft|nos|pieces|pcs)\b/gi, '')
      .replace(/[0-9]/g, '') // Remove any stray digits
      .replace(/[^\w\s]/gi, '') // Remove special chars
      .replace(/\s+/g, ' ')
      .trim();
    
    // Capitalize Corrected Description
    if (cleanDesc.length > 0) {
        cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
    }
  
    return {
      description: cleanDesc || "Item", 
      length,
      width,
      quantity,
      rate,
      unit: unitMode,
      floor
    };
  };

  const getHintText = () => {
     if (targetUnit === 'sq.ft') return "Try: 'Bedroom 10 by 12 rate 95'";
     if (targetUnit === 'rft') return "Try: 'Cornice 100 feet rate 45'";
     if (targetUnit === 'nos') return "Try: 'Panel 4 pieces rate 250'";
     return t.voiceEntryHint;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden mb-0 sm:mb-8 border border-slate-200 dark:border-slate-800 transition-colors">
        
        {/* Header */}
        <div className="p-4 bg-indigo-600 dark:bg-indigo-950 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-200" />
            <h3 className="font-semibold text-lg">{t.voiceEntry}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-indigo-500 dark:hover:bg-indigo-800 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col items-center text-center">
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-lg text-sm flex items-center gap-2 w-full text-left">
               <AlertTriangle className="w-4 h-4 shrink-0" />
               {error}
            </div>
          )}

          {/* Controls Grid */}
          <div className="w-full mb-6 space-y-4">
             
             <div className="grid grid-cols-1 gap-4">
                {/* Floor Selector */}
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block text-left">Floor</label>
                    <div className="relative">
                        <select 
                            value={targetFloor} 
                            onChange={(e) => setTargetFloor(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium appearance-none"
                        >
                            <option value="">Auto Detect</option>
                            {Object.values(t.floors).map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                            <option value="custom">Manual...</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
             </div>

             {targetFloor === 'custom' && (
                <input 
                  type="text" 
                  placeholder="e.g. Mezzanine, Roof Top"
                  value={customFloor}
                  onChange={(e) => setCustomFloor(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white animate-in slide-in-from-top-2 duration-200"
                  autoFocus
                />
             )}

             {/* Unit Selector */}
             <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block text-left">Unit Type</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['sq.ft', 'rft', 'nos'] as const).map((u) => (
                    <button
                        key={u}
                        onClick={() => setTargetUnit(u)}
                        className={`py-2 px-1 rounded-lg text-sm font-bold border-2 transition-all ${targetUnit === u ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-500' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300'}`}
                    >
                        {u === 'sq.ft' ? t.sqft : u === 'rft' ? t.rft : t.nos}
                    </button>
                    ))}
                </div>
             </div>
          </div>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 italic">{getHintText()}</p>

          <button 
            onClick={toggleListening}
            className={`
              w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
              ${isListening ? 'bg-red-500 scale-110 ring-4 ring-red-200 dark:ring-red-900/50' : 'bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600'}
              ${error === t.speechNotSupported ? 'opacity-50 cursor-not-allowed bg-slate-400 dark:bg-slate-600' : ''}
            `}
            disabled={error === t.speechNotSupported}
          >
            {isListening ? (
              <span className="animate-pulse text-white"><Mic className="w-8 h-8" /></span>
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </button>

          <p className="mt-4 h-6 text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2">
            {isListening ? t.listening : (isProcessing ? <><span className="animate-spin">⏳</span> {t.processing}</> : (transcript ? "Tap text to edit" : "Tap mic to start"))}
          </p>

          {/* Transcript Editable Display */}
          <div className="mt-4 w-full relative">
            <label className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1 block text-left">Transcript</label>
            <div className="relative">
                <textarea 
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none max-h-32 overflow-y-auto"
                    rows={2}
                    placeholder="Speak details..."
                />
                <Pencil className="w-3 h-3 absolute right-3 bottom-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Parsed Result Preview */}
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
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">
                     {parsedItem.unit === 'sq.ft' ? 'Size (LxW)' : parsedItem.unit === 'rft' ? 'Length' : 'Qty'}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {parsedItem.unit === 'sq.ft' ? `${parsedItem.length} x ${parsedItem.width}` : 
                     parsedItem.unit === 'rft' ? `${parsedItem.length}` : 
                     `${parsedItem.quantity}`}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Rate</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">₹{parsedItem.rate}</span>
                </div>
                <div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Amount</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                     ₹{(parsedItem.unit === 'sq.ft' 
                        ? (parsedItem.length * parsedItem.width * parsedItem.quantity * parsedItem.rate)
                        : parsedItem.unit === 'rft'
                        ? (parsedItem.length * parsedItem.quantity * parsedItem.rate)
                        : (parsedItem.quantity * parsedItem.rate)
                     ).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex w-full gap-3 mt-6">
            <button 
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              {t.cancel}
            </button>
            <button 
              onClick={() => parsedItem && onConfirm(parsedItem)}
              disabled={!parsedItem}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 dark:bg-indigo-700 text-white font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Fill Details
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VoiceEntryModal;
