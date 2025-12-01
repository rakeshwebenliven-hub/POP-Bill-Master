
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
        // MOBILE STABILITY FIX: Continuous false prevents browser crashes and duplicate text on Android
        recognitionRef.current.continuous = false; 
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-IN'; 

        recognitionRef.current.onstart = () => { 
            setIsListening(true); 
            setError(null); 
        };
        
        recognitionRef.current.onresult = (event: any) => {
          // Only process the current phrase
          let currentPhrase = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
             if (event.results[i].isFinal) {
                currentPhrase += event.results[i][0].transcript;
             }
          }
          // We handle the actual appending in 'onend' or via state update logic below if needed,
          // but for interim visual feedback:
          const interim = event.results[event.results.length - 1][0].transcript;
          // We don't set transcript here to avoid jitter, we rely on the final result logic
        };
        
        // Better handling for non-continuous mode
        recognitionRef.current.onend = () => {
             setIsListening(false);
        };
        
        // Capture final result specifically
        // We override the onresult to be simpler for non-continuous mode
        recognitionRef.current.onresult = (event: any) => {
             const result = event.results[0][0].transcript;
             if (event.results[0].isFinal) {
                 setTranscript(prev => {
                     const trimmed = prev.trim();
                     return trimmed ? `${trimmed} ${result}` : result;
                 });
             }
        };

        recognitionRef.current.onerror = (event: any) => {
          if (event.error === 'no-speech') {
             setIsListening(false);
          } else if (event.error === 'not-allowed') {
             setIsListening(false);
             setError("Microphone permission denied.");
          } else if (event.error === 'aborted') {
             setIsListening(false);
          } else {
             setIsListening(false);
             // Don't show generic errors to keep UI clean unless critical
          }
        };

      } else {
        setError(t.speechNotSupported);
      }
    }
    
    return () => {
      if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e) {}
      }
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isOpen]); 

  useEffect(() => {
    // Debounce the parsing to prevent UI lag
    if (transcript || transcript === '') {
        setIsProcessing(true);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        
        debounceTimerRef.current = setTimeout(() => {
            const floorToUse = targetFloor === 'custom' ? customFloor : targetFloor;
            try {
                const parsed = parseLocalTranscript(transcript, targetUnit, floorToUse);
                setParsedItem(parsed);
            } catch (e) {
                console.error("Parsing error", e);
            }
            setIsProcessing(false);
        }, 400);
    }
  }, [transcript, targetUnit, targetFloor, customFloor]);

  const toggleListening = () => {
    if (error === t.speechNotSupported) return;
    
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch(e) {}
    } else {
      try { 
          recognitionRef.current?.start(); 
      } catch (e) { 
          // If already started, ignore
          console.error(e);
      }
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

  const parseLocalTranscript = (text: string, currentUnitMode: string, manualFloor: string): ParsedBillItem => {
    if (!text.trim()) {
        return { description: '', length: 0, width: 0, height: 0, quantity: 1, rate: 0, unit: currentUnitMode, floor: manualFloor };
    }

    // 1. Normalize
    let processingText = normalizeNumbers(text).toLowerCase();
    
    // Normalize Separators
    processingText = processingText.replace(/\b(by|buy|bye|bai|be|into|cross)\b/g, 'x');

    let length = 0, width = 0, height = 0, quantity = 1, rate = 0, floor = manualFloor;
    let detectedUnit = currentUnitMode;

    // Detect Floor
    if (!floor) {
        if (processingText.match(/\b(ground|gf)\b/)) floor = 'Ground Floor';
        else if (processingText.match(/\b(first|1st|ff)\b/)) floor = '1st Floor';
        else if (processingText.match(/\b(second|2nd|sf)\b/)) floor = '2nd Floor';
        else if (processingText.match(/\b(third|3rd|tf)\b/)) floor = '3rd Floor';
        else if (processingText.match(/\b(fourth|4th)\b/)) floor = '4th Floor';
        else if (processingText.match(/\b(fifth|5th)\b/)) floor = '5th Floor';
    }

    // Keyword detection only happens if we are in 'Auto' mode or similar, 
    // BUT we prioritize the `currentUnitMode` passed in.
    if (processingText.match(/\b(sq\.?ft|square\s*feet)\b/)) detectedUnit = 'sq.ft';
    else if (processingText.match(/\b(cu\.?ft|cubic\s*feet)\b/)) detectedUnit = 'cu.ft';
    else if (processingText.match(/\b(r\.?ft|running\s*feet)\b/)) detectedUnit = 'rft';
    else if (processingText.match(/\b(brass)\b/)) detectedUnit = 'brass';
    else if (processingText.match(/\b(pcs|pieces|nos|numbers|bags|boxes|pkts|points|sets)\b/)) detectedUnit = 'nos';

    if (!processingText.match(/\b(sq\.?ft|cu\.?ft|r\.?ft|brass|pcs|nos)\b/)) {
        detectedUnit = currentUnitMode;
    }

    // 2. EXTRACT & REMOVE RATE FIRST
    // Standard Regex (No Lookbehind) for max compatibility
    const ratePatterns = [
        // rate 50, price 50, @ 50, rate of 50
        /\b(?:rate|price|@|bhav|ret|cost|at|of)\s*[:\-\s]*(\d+(?:\.\d+)?)/i, 
        // rs 50, inr 50
        /\b(?:rs|rupees?|inr)\.?\s*(\d+(?:\.\d+)?)/i,
        // 50 rs, 50 rupees
        /\b(\d+(?:\.\d+)?)\s*(?:rs|rupees?|inr)\b/i
    ];

    for (const pat of ratePatterns) {
        const match = processingText.match(pat);
        if (match) {
            rate = parseFloat(match[1]);
            processingText = processingText.replace(match[0], ' '); 
            break; 
        }
    }

    // 3. UNIT SPECIFIC PARSING
    // Re-scan numbers after rate removal
    const numbers = (processingText.match(/(\d+(?:\.\d+)?)/g) || []).map(Number);
    
    const isVolumetric = ['cu.ft', 'cu.mt', 'brass'].includes(detectedUnit);
    const isArea = ['sq.ft', 'sq.mt', 'sq.yd', 'acre'].includes(detectedUnit);
    const isLinear = ['rft', 'r.mt'].includes(detectedUnit);
    const isSimple = !isVolumetric && !isArea && !isLinear; 

    if (isSimple) {
        // NOS/PCS Logic
        const qtyRegex = /(\d+)\s*(?:pcs|piece|pieces|nos|numbers|items|bag|bags|box|boxes|pkt|pkts|point|points|hrs|days|hours|kg|tons|visit|visits|month|months|set|sets|kw|hp|quintal|quintals)\b/i; 
        const qtyMatch = processingText.match(qtyRegex);
        
        if (qtyMatch) {
            quantity = parseFloat(qtyMatch[1]);
            if (rate === 0) {
                 const remainingText = processingText.replace(qtyMatch[0], ' ');
                 const remNumbers = (remainingText.match(/(\d+(?:\.\d+)?)/g) || []).map(Number);
                 if (remNumbers.length > 0) rate = remNumbers[0];
            }
        } else {
             // Implicit Qty
             if (numbers.length > 0) {
                 if (rate > 0) {
                     quantity = numbers[0]; // Rate already found, so this is Qty
                 } else {
                     if (numbers.length === 1) {
                         quantity = numbers[0]; 
                     } else if (numbers.length >= 2) {
                         quantity = numbers[0];
                         rate = numbers[1]; // Implicit: Qty then Rate
                     }
                 }
             }
        }

    } else {
        // DIMENSIONS Logic
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
            // No explicit rate found
            const requiredDims = isVolumetric ? 3 : (isArea ? 2 : 1);
            
            if (numbers.length === requiredDims) {
                if (isVolumetric) [length, width, height] = numbers;
                else if (isArea) [length, width] = numbers;
                else if (isLinear) length = numbers[0];
            } else if (numbers.length > requiredDims) {
                rate = numbers[numbers.length - 1];
                const dimNumbers = numbers.slice(0, numbers.length - 1);
                
                if (isVolumetric) {
                    if (dimNumbers.length >= 3) [length, width, height] = dimNumbers;
                    else if (dimNumbers.length === 2) [length, width] = dimNumbers; 
                } else if (isArea) {
                    if (dimNumbers.length >= 2) [length, width] = dimNumbers;
                } else if (isLinear) {
                    length = dimNumbers[0];
                }
            } else {
                 if (isVolumetric && numbers.length >= 2) [length, width] = numbers;
                 else if (isArea && numbers.length >= 1) length = numbers[0];
                 else if (isLinear && numbers.length >= 1) length = numbers[0];
            }
        }
    }

    // 4. Cleanup Description
    let cleanDesc = processingText
      .replace(/\b(ground|first|second|floor|third|fourth|fifth)\b/gi, '')
      .replace(/\b(rate|price|rs|rupees|bhav|ret|cost|at|of)\b/gi, '')
      .replace(/\b(sq\.?ft|rft|nos|pieces|cu\.?ft|brass)\b/gi, '')
      .replace(/[0-9.]/g, '') // Remove numbers
      .replace(/[^\w\s]/gi, '') // Remove special chars
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleanDesc) cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
    if (!cleanDesc && (length || quantity > 1)) cleanDesc = "Item";
  
    return { description: cleanDesc, length, width, height, quantity, rate, unit: detectedUnit, floor };
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border-t border-slate-200 dark:border-slate-800 sm:border transition-all animate-slide-up safe-area-bottom">
        
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden" onClick={onClose}>
           <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
               <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{t.voiceEntry}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center text-center max-h-[80vh] overflow-y-auto">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-xl text-sm flex items-center gap-2 w-full text-left"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}

          <div className="w-full mb-6 grid grid-cols-2 gap-3">
             <div className="col-span-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5 block text-left ml-1">Floor</label>
                <div className="relative">
                    <select value={targetFloor} onChange={(e) => setTargetFloor(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium appearance-none">
                        <option value="">Auto Detect</option>
                        {Object.values(t.floors).map(f => <option key={f} value={f}>{f}</option>)}
                        <option value="custom">Manual...</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
             </div>
             
             <div className="col-span-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5 block text-left ml-1">Unit</label>
                <select 
                    value={targetUnit} 
                    onChange={(e) => setTargetUnit(e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium appearance-none text-center"
                >
                    {CONSTRUCTION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
             </div>

             {targetFloor === 'custom' && (
                <div className="col-span-2">
                   <input type="text" placeholder="e.g. Mezzanine" value={customFloor} onChange={(e) => setCustomFloor(e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white animate-in slide-in-from-top-2 duration-200" autoFocus />
                </div>
             )}
          </div>
          
          <button onClick={toggleListening} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl mb-4 ${isListening ? 'bg-red-500 scale-110 ring-4 ring-red-200 dark:ring-red-900/50' : 'bg-gradient-to-br from-indigo-500 to-indigo-700 hover:to-indigo-600'} ${error === t.speechNotSupported ? 'opacity-50 cursor-not-allowed bg-slate-400' : ''}`} disabled={error === t.speechNotSupported}>
            {isListening ? <span className="animate-pulse text-white"><Mic className="w-8 h-8" /></span> : <Mic className="w-8 h-8 text-white" />}
          </button>

          <p className="h-6 text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2 mb-2">
            {isListening ? t.listening : (isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.processing}</> : (transcript ? "Tap text below to edit" : "Tap mic to speak"))}
          </p>
          
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 italic">{getHintText()}</p>

          <div className="w-full relative mb-4">
            <div className="relative">
                <textarea 
                    value={transcript} 
                    onChange={(e) => setTranscript(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-800 p-3 pl-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none max-h-24 overflow-y-auto shadow-inner" 
                    rows={2} 
                    placeholder="Transcript appears here..." 
                />
                <Pencil className="w-3 h-3 absolute right-3 bottom-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {parsedItem && (
            <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 text-left animate-in zoom-in-95 duration-200 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 block mb-0.5">Description</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{parsedItem.description}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 block mb-0.5">
                    {['sq.ft','sq.mt','sq.yd','acre'].includes(parsedItem.unit) ? 'Size (LxW)' : 
                     ['cu.ft','cu.mt','brass'].includes(parsedItem.unit) ? 'Size (LxWxH)' : 
                     ['rft','r.mt'].includes(parsedItem.unit) ? 'Length' : 'Quantity'}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {['sq.ft','sq.mt','sq.yd','acre'].includes(parsedItem.unit) ? `${parsedItem.length} x ${parsedItem.width}` : 
                     ['cu.ft','cu.mt','brass'].includes(parsedItem.unit) ? `${parsedItem.length} x ${parsedItem.width} x ${parsedItem.height}` : 
                     ['rft','r.mt'].includes(parsedItem.unit) ? `${parsedItem.length}` : `${parsedItem.quantity}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 block mb-0.5">Rate</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">₹{parsedItem.rate}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex w-full gap-3">
            <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition">{t.cancel}</button>
            <button onClick={() => parsedItem && onConfirm(parsedItem)} disabled={!parsedItem} className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 dark:bg-indigo-700 text-white font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"><Check className="w-4 h-4" /> Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceEntryModal;
