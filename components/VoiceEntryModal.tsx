

import React, { useState, useEffect, useRef } from 'react';
import { ParsedBillItem } from '../types';
import { APP_TEXT } from '../constants';
import { Mic, X, Check, MessageSquare, AlertTriangle, Pencil } from 'lucide-react';

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
  
  const recognitionRef = useRef<any>(null);
  const t = APP_TEXT;

  useEffect(() => {
    if (isOpen) {
      // Reset state
      setTranscript('');
      setParsedItem(null);
      setError(null);
      
      // Initialize Speech Recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false; // Stop after one sentence/pause
        recognitionRef.current.interimResults = true; // Real-time feedback
        
        // Use Indian English for better recognition of terms like "Rupees", "Lakh", and general accent
        recognitionRef.current.lang = 'en-IN'; 

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setError(null);
        };
        
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            finalTranscript += event.results[i][0].transcript;
          }
          
          setTranscript(finalTranscript);
          // Parsing is handled by the useEffect below depending on transcript change
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setError("Microphone permission denied.");
          } else if (event.error === 'no-speech') {
            // Ignore, just means silence
          } else {
            setError("Error hearing voice. Please try again.");
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
    };
  }, [isOpen]);

  // Re-parse whenever transcript changes (voice or manual edit)
  useEffect(() => {
    if (transcript) {
        const parsed = parseLocalTranscript(transcript);
        setParsedItem(parsed);
    }
  }, [transcript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (error === t.speechNotSupported) return;
      
      // Don't clear transcript if user wants to add to it, only clear on fresh open usually, 
      // but for simplicity here we assume new dictation per button press unless we want append.
      // Let's clear for fresh start logic.
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

  // Enhanced Regex Parser
  const parseLocalTranscript = (text: string): ParsedBillItem => {
    let description = text;
    let length = 0;
    let width = 0;
    let quantity = 1;
    let rate = 0;
    let floor = '';
  
    const lower = text.toLowerCase();
  
    // 1. Detect Floor
    if (lower.match(/\b(ground|gf)\b/)) floor = 'Ground Floor';
    else if (lower.match(/\b(first|1st|ff)\b/)) floor = '1st Floor';
    else if (lower.match(/\b(second|2nd|sf)\b/)) floor = '2nd Floor';
    else if (lower.match(/\b(third|3rd|tf)\b/)) floor = '3rd Floor';
    else if (lower.match(/\b(fourth|4th)\b/)) floor = '4th Floor';
    else if (lower.match(/\b(basement)\b/)) floor = 'Basement';

    // 2. Detect Rate (Do this early to remove it from string)
    // Matches: "rate 50", "@ 50", "price 50", "rupees 50", "rs 50", "50 rupees"
    const rateRegex = /(?:rate|@|at|price|rs\.?|rupees?)\s*[:\-\s]*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rupees|rs\.?)/i;
    const rateMatch = description.match(rateRegex);
    if (rateMatch) {
      // Match[1] is "rate 50", Match[2] is "50 rupees"
      rate = parseFloat(rateMatch[1] || rateMatch[2]);
      // Remove match but keep a space
      description = description.replace(rateMatch[0], ' ').trim();
    }
  
    // 3. Detect Quantity
    // Matches: "qty 5", "quantity 5", "5 nos", "5 pieces", "5 numbers"
    const qtyRegex = /(?:qty|quantity|count)\s*[:\-\s]*(\d+)|(\d+)\s*(?:nos|numbers|pieces|pcs)/i;
    const qtyMatch = description.match(qtyRegex);
    if (qtyMatch) {
      // qtyMatch[1] is from "qty X", qtyMatch[2] is from "X nos"
      quantity = parseInt(qtyMatch[1] || qtyMatch[2]);
      description = description.replace(qtyMatch[0], ' ').trim();
    }
  
    // 4. Detect Dimensions (LxW)
    // Matches: "10 by 12", "10x12", "10*12", "10 into 12", AND "10 12" (space separated)
    // The space separated one is tricky, needs to ensure they are numbers near each other
    const dimRegex = /(\d+(?:\.\d+)?)\s*(?:x|by|into|\*|\s)\s*(\d+(?:\.\d+)?)/i;
    const dimMatch = description.match(dimRegex);
  
    if (dimMatch) {
      length = parseFloat(dimMatch[1]);
      width = parseFloat(dimMatch[2]);
      description = description.replace(dimMatch[0], ' ').trim();
    } else {
      // Fallback: Check for single number with 'rft' context or just single number if no other numbers exist
      // Handles: "10 rft", "10 running feet", "10 running"
      const rftRegex = /(\d+(?:\.\d+)?)\s*(?:rft|running|ft|feet)/i;
      const rftMatch = description.match(rftRegex);
      if (rftMatch) {
        length = parseFloat(rftMatch[1]);
        width = 0; // Implies RFT
        description = description.replace(rftMatch[0], ' ').trim();
      }
    }
  
    // 5. Cleanup Description
    // Remove detected keywords to leave just the item name
    description = description
      .replace(/\b(ground|first|second|third|fourth|basement|floor)\b/gi, '')
      .replace(/[^\w\s]/gi, '') // Remove special chars
      .replace(/\s+/g, ' ')
      .trim();
    
    // Capitalize first letter
    if (description.length > 0) {
        description = description.charAt(0).toUpperCase() + description.slice(1);
    }
  
    return {
      description: description || "Item", 
      length,
      width,
      quantity,
      rate,
      floor
    };
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
        <div className="p-6 flex flex-col items-center text-center">
          
          {error ? (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
               <AlertTriangle className="w-4 h-4 shrink-0" />
               {error}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.voiceEntryHint}</p>
          )}

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

          <p className="mt-4 h-6 text-sm font-medium text-indigo-600 dark:text-indigo-400">
            {isListening ? "Listening..." : (transcript ? "Tap text to edit" : "Tap mic to start")}
          </p>

          {/* Transcript Editable Display */}
          <div className="mt-4 w-full relative">
            <label className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1 block text-left">Transcript (Editable)</label>
            <div className="relative">
                <textarea 
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    rows={2}
                    placeholder="Speak or type here..."
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
                <div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Size (LxW)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{parsedItem.length} x {parsedItem.width}</span>
                </div>
                 <div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Qty (Nos)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{parsedItem.quantity || 1}</span>
                </div>
                <div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Rate</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">₹{parsedItem.rate}</span>
                </div>
                <div>
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Amount</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">₹{(parsedItem.length * (parsedItem.width || 1) * (parsedItem.quantity || 1) * parsedItem.rate).toFixed(0)}</span>
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
