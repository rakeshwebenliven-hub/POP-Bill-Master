
import React, { useState, useEffect, useRef } from 'react';
import { ParsedBillItem } from '../types';
import { APP_TEXT, CONSTRUCTION_UNITS } from '../constants';
import { Mic, X, Check, MessageSquare, AlertTriangle, Pencil, ChevronDown, Loader2 } from 'lucide-react';

interface VoiceEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: ParsedBillItem) => void;
}

const VoiceEntryModal: React.FC<VoiceEntryModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedItem, setParsedItem] = useState<ParsedBillItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetUnit, setTargetUnit] = useState<string>('sq.ft');
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
        }, 400);
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
    const map: Record<string, string> = { 
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10', 
        'twenty': '20', 'thirty': '30', 'forty': '40', 'fifty': '50', 
        'sixty': '60', 'seventy': '70', 'eighty': '80', 'ninety': '90', 
        'hundred': '100' 
    };
    return text.split(' ').map(word => map[word.toLowerCase()] || word).join(' ');
  };

  const parseLocalTranscript = (text: string, unitMode: string, manualFloor: string): ParsedBillItem => {
    // 1. Normalize Numbers
    let processingText = normalizeNumbers(text).toLowerCase();
    
    // Normalize Separators: Replace 'by', 'into', 'cross' with 'x'
    processingText = processingText.replace(/\b(by|buy|bye|bai|be|into|cross)\b/g, 'x');

    // Default values
    let length = 0, width = 0, height = 0, quantity = 1, rate = 0, floor = manualFloor;

    // Detect Floor if not manual
    if (!floor) {
        if (processingText.match(/\b(ground|gf)\b/)) floor = 'Ground Floor';
        else if (processingText.match(/\b(first|1st|ff)\b/)) floor = '1st Floor';
        else if (processingText.match(/\b(second|2nd|sf)\b/)) floor = '2nd Floor';
        else if (processingText.match(/\b(third|3rd|tf)\b/)) floor = '3rd Floor';
        else if (processingText.match(/\b(fourth|4th)\b/)) floor = '4th Floor';
        else if (processingText.match(/\b(fifth|5th)\b/)) floor = '5th Floor';
    }

    // 2. EXTRACT & REMOVE RATE FIRST (Priority Pass)
    // We look for patterns like "rate 95", "@ 95", "95 rs", "rs 95", "price 95"
    // Regex logic: Word boundary for keywords, optional spacing/colons, capturing digits/decimals
    const ratePatterns = [
        /\b(?:rate|price|@|bhav|ret|cost|at)\b\s*[:\-\s]*(\d+(?:\.\d+)?)/i, // "rate 50"
        /\b(?:rs|rupees?|inr)\.?\s*(\d+(?:\.\d+)?)/i, // "rs 50"
        /(\d+(?:\.\d+)?)\s*(?:rs|rupees?|inr)\b/i     // "50 rs"
    ];

    for (const pat of ratePatterns) {
        const match = processingText.match(pat);
        if (match) {
            rate = parseFloat(match[1]);
            // Remove the matched rate string from text so it's not confused for a dimension
            processingText = processingText.replace(match[0], ' '); 
            break; // Found rate, stop looking
        }
    }

    // 3. UNIT SPECIFIC PARSING
    // Extract remaining numbers from the text
    const numbers = (processingText.match(/(\d+(?:\.\d+)?)/g) || []).map(Number);
    
    const isVolumetric = ['cu.ft', 'cu.mt', 'brass'].includes(unitMode);
    const isArea = ['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(unitMode);
    const isLinear = ['rft', 'r.mt'].includes(unitMode);
    const isSimple = !isVolumetric && !isArea && !isLinear; // Nos, Pcs, etc.

    if (isSimple) {
        // --- LOGIC FOR NOS/PCS ---
        // Explicit Qty check: "4 pieces"
        const qtyRegex = /(\d+)\s*(?:pcs|pieces|nos|numbers|items|bags|boxes|pkts|points|hrs|days|hours|kg|tons|visits|months|sets|kw|hp|quintals)\b/i; 
        const qtyMatch = processingText.match(qtyRegex);
        
        if (qtyMatch) {
            quantity = parseFloat(qtyMatch[1]);
            // Remove explicit quantity from text to look for rate if still 0
            if (rate === 0) {
                 const remainingText = processingText.replace(qtyMatch[0], ' ');
                 const remNumbers = (remainingText.match(/(\d+(?:\.\d+)?)/g) || []).map(Number);
                 if (remNumbers.length > 0) rate = remNumbers[0];
            }
        } else {
             // Implicit Qty (No keyword)
             // If rate was already found: First remaining number is Qty
             // If rate NOT found:
             //   - 1 number -> Qty (Rate 0)
             //   - 2 numbers -> Qty, Rate
             if (numbers.length > 0) {
                 if (rate > 0) {
                     quantity = numbers[0];
                 } else {
                     if (numbers.length === 1) {
                         quantity = numbers[0];
                     } else if (numbers.length >= 2) {
                         quantity = numbers[0];
                         rate = numbers[1];
                     }
                 }
             }
        }

    } else {
        // --- LOGIC FOR DIMENSIONS (SQ.FT / CU.FT / R.FT) ---
        // If rate is found explicitly, just take first N numbers as dimensions
        if (rate > 0) {
            if (isVolumetric) {
                if (numbers.length >= 3) { [length, width, height] = numbers; }
                else if (numbers.length === 2) { [length, width] = numbers; }
            } else if (isArea) {
                 if (numbers.length >= 2) { [length, width] = numbers; }
            } else if (isLinear) {
                 if (numbers.length >= 1) { length = numbers[0]; }
            }
        } else {
            // Rate NOT found explicitly. Check for implicit rate at the end.
            const requiredDims = isVolumetric ? 3 : (isArea ? 2 : 1);
            
            if (numbers.length === requiredDims) {
                // Exact dimensions found, no rate
                if (isVolumetric) [length, width, height] = numbers;
                else if (isArea) [length, width] = numbers;
                else if (isLinear) length = numbers[0];
            } else if (numbers.length > requiredDims) {
                // Extra numbers found, assume last is rate
                rate = numbers[numbers.length - 1];
                const dimNumbers = numbers.slice(0, numbers.length - 1);
                
                if (isVolumetric) {
                    if (dimNumbers.length >= 3) [length, width, height] = dimNumbers;
                    else if (dimNumbers.length === 2) [length, width] = dimNumbers; // Partial
                } else if (isArea) {
                    if (dimNumbers.length >= 2) [length, width] = dimNumbers;
                } else if (isLinear) {
                    length = dimNumbers[0];
                }
            } else {
                // Not enough numbers? Just take what we have
                 if (isVolumetric && numbers.length >= 2) [length, width] = numbers;
                 else if (isArea && numbers.length >= 1) length = numbers[0];
                 else if (isLinear && numbers.length >= 1) length = numbers[0];
            }
        }
    }

    // 4. CLEANUP DESCRIPTION
    // Remove all numbers, unit names, floor names from the description text
    let cleanDesc = processingText
      .replace(/\b(ground|first|second|floor|third|fourth|fifth)\b/gi, '')
      .replace(/\b(rate|price|rs|rupees|bhav|ret|cost|at)\b/gi, '')
      .replace(/\b(sq\.?ft|rft|nos|pieces|cu\.?ft|brass)\b/gi, '')
      .replace(/[0-9.]/g, '') // Remove digits and decimals
      .replace(/[^\w\s]/gi, '') // Remove punctuation
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleanDesc) cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
  
    return { description: cleanDesc || "Item", length, width, height, quantity, rate, unit: unitMode, floor };
  };

  const getHintText = () => {
     if (targetUnit === 'sq.ft') return t.voiceHints.sqft;
     if (targetUnit === 'cu.ft') return t.voiceHints.cuft;
     if (targetUnit === 'brass') return t.voiceHints.brass;
     if (targetUnit === 'rft') return t.voiceHints.rft;
     if (targetUnit === 'visit') return t.voiceHints.visit;
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
                <select 
                    value={targetUnit} 
                    onChange={(e) => setTargetUnit(e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
                >
                    {CONSTRUCTION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
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
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">
                    {['sq.ft','sq.mt','sq.yd','acre'].includes(parsedItem.unit) ? 'Size (LxW)' : 
                     ['cu.ft','cu.mt','brass'].includes(parsedItem.unit) ? 'Size (LxWxH)' : 
                     ['rft','r.mt'].includes(parsedItem.unit) ? 'Length' : 'Qty'}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {['sq.ft','sq.mt','sq.yd','acre'].includes(parsedItem.unit) ? `${parsedItem.length} x ${parsedItem.width}` : 
                     ['cu.ft','cu.mt','brass'].includes(parsedItem.unit) ? `${parsedItem.length} x ${parsedItem.width} x ${parsedItem.height}` : 
                     ['rft','r.mt'].includes(parsedItem.unit) ? `${parsedItem.length}` : `${parsedItem.quantity}`}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Rate</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">₹{parsedItem.rate}</span>
                </div>
                <div>
                    {/* Logic duplicated for display preview */}
                    {(() => {
                        let amt = 0;
                        if(['sq.ft','sq.mt','sq.yd','acre'].includes(parsedItem.unit)) amt = parsedItem.length * parsedItem.width * parsedItem.quantity * parsedItem.rate;
                        else if(['cu.ft','cu.mt'].includes(parsedItem.unit)) amt = parsedItem.length * parsedItem.width * (parsedItem.height||0) * parsedItem.quantity * parsedItem.rate;
                        else if(parsedItem.unit === 'brass') amt = ((parsedItem.length * parsedItem.width * (parsedItem.height||0)) / 100) * parsedItem.quantity * parsedItem.rate;
                        else if(['rft','r.mt'].includes(parsedItem.unit)) amt = parsedItem.length * parsedItem.quantity * parsedItem.rate;
                        else amt = parsedItem.quantity * parsedItem.rate;
                        return (
                            <div>
                                <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Amount</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">₹{amt.toFixed(0)}</span>
                            </div>
                        )
                    })()}
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
