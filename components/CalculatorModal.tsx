
import React, { useState } from 'react';
import { X, Delete, Calculator as CalcIcon, Ruler, Briefcase, Percent, Check, ChevronRight, ArrowLeft } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CalcMode = 'standard' | 'construction' | 'business';
type ConstructionTool = 'volume' | 'tiles' | 'steel' | 'paint';

const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<CalcMode>('standard');
  const [activeTool, setActiveTool] = useState<ConstructionTool | null>(null);

  // Standard Calc State
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  // Construction State
  const [dims, setDims] = useState({ l: '', w: '', h: '', size: '', dia: '' });
  
  // Business State
  const [bizValues, setBizValues] = useState({ amount: '', rate: '18' });
  const [bizResult, setBizResult] = useState<{ label: string, value: string } | null>(null);

  if (!isOpen) return null;

  // --- STANDARD CALC LOGIC ---
  const handlePress = (val: string) => setInput(prev => prev + val);
  const handleClear = () => { setInput(''); setResult(''); };
  const handleCalculate = () => {
    try {
      // eslint-disable-next-line no-eval
      const res = eval(input.replace(/x/g, '*')); 
      setResult(res.toString());
    } catch (e) {
      setResult('Error');
    }
  };
  const buttons = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','C','+'];

  // --- CONSTRUCTION CALC LOGIC ---
  const calculateConstruction = () => {
      const l = parseFloat(dims.l) || 0;
      const w = parseFloat(dims.w) || 0;
      const h = parseFloat(dims.h) || 0;
      
      switch(activeTool) {
          case 'volume': // Brass / Cu.ft
              const cuft = l * w * h;
              const brass = cuft / 100;
              const cumt = cuft / 35.315;
              return [
                  { label: 'Volume (Cu.ft)', value: cuft.toFixed(2) },
                  { label: 'Volume (Cu.mt)', value: cumt.toFixed(2) },
                  { label: 'Total Brass', value: brass.toFixed(2) }
              ];
          case 'tiles': // Flooring
              const area = l * w;
              // Tile size usually in inches (e.g. 24x24) or feet (2x2). Let's assume input is 2x2 feet for simplicity or allow custom
              const tileSizeSqFt = parseFloat(dims.size) || 1; // user enters sqft per tile
              const tilesNeeded = Math.ceil(area / tileSizeSqFt);
              return [
                  { label: 'Total Area', value: `${area.toFixed(2)} Sq.ft` },
                  { label: 'Tiles Required', value: `${tilesNeeded} pcs` }
              ];
          case 'steel': // Weight: D^2 * L / 162
              const d = parseFloat(dims.dia) || 0; // mm
              const len = parseFloat(dims.l) || 0; // meters
              const weightPerMeter = (d * d) / 162;
              const totalWeight = weightPerMeter * len;
              return [
                  { label: 'Weight/Meter', value: `${weightPerMeter.toFixed(2)} kg` },
                  { label: 'Total Weight', value: `${totalWeight.toFixed(2)} kg` }
              ];
          case 'paint': // Wall Area
              const wallArea = l * w;
              const coverage = parseFloat(dims.size) || 100; // sq.ft per liter
              const liters = wallArea / coverage;
              return [
                  { label: 'Total Area', value: `${wallArea.toFixed(2)} Sq.ft` },
                  { label: 'Approx Paint', value: `${liters.toFixed(1)} Liters` }
              ];
          default: return [];
      }
  };

  // --- BUSINESS CALC LOGIC ---
  const calculateGST = (type: 'add' | 'remove') => {
      const amt = parseFloat(bizValues.amount) || 0;
      const rt = parseFloat(bizValues.rate) || 0;
      if (type === 'add') {
          const gst = amt * (rt / 100);
          setBizResult({ label: 'Total (Inc. GST)', value: `₹${(amt + gst).toFixed(2)}` });
      } else {
          const base = amt / (1 + (rt / 100));
          setBizResult({ label: 'Base Amount (Ex. GST)', value: `₹${base.toFixed(2)}` });
      }
  };

  const calculateDiscount = () => {
      const amt = parseFloat(bizValues.amount) || 0;
      const rt = parseFloat(bizValues.rate) || 0;
      const disc = amt * (rt / 100);
      setBizResult({ label: 'Final Price', value: `₹${(amt - disc).toFixed(2)}` });
  };

  const renderContent = () => {
      if (mode === 'standard') {
          return (
            <div className="p-4 bg-slate-50 dark:bg-slate-950">
                <div className="mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-right shadow-inner">
                    <div className="text-sm text-slate-500 dark:text-slate-400 h-5 font-mono">{input || '0'}</div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 h-10 font-mono tracking-tight">{result || (input ? '' : '0')}</div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {buttons.map(btn => (
                    <button key={btn} onClick={() => btn === 'C' ? handleClear() : handlePress(btn)}
                        className={`p-4 rounded-xl font-bold text-xl shadow-sm active:scale-95 transition ${btn === 'C' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'} ${['/','*','-','+'].includes(btn) ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : ''}`}>
                        {btn}
                    </button>
                    ))}
                    <button onClick={handleCalculate} className="col-span-4 bg-indigo-600 text-white p-4 rounded-xl font-bold mt-2 shadow-lg active:scale-95 transition text-xl">=</button>
                </div>
            </div>
          );
      }

      if (mode === 'construction') {
          if (!activeTool) {
              return (
                  <div className="p-4 grid grid-cols-2 gap-3">
                      <button onClick={() => setActiveTool('volume')} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 flex flex-col items-center gap-2 transition">
                          <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full"><Ruler className="w-6 h-6 text-orange-600" /></div>
                          <span className="font-bold text-sm dark:text-white">Concrete / Brass</span>
                      </button>
                      <button onClick={() => setActiveTool('tiles')} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 flex flex-col items-center gap-2 transition">
                          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full"><Briefcase className="w-6 h-6 text-blue-600" /></div>
                          <span className="font-bold text-sm dark:text-white">Flooring / Tiles</span>
                      </button>
                      <button onClick={() => setActiveTool('steel')} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 flex flex-col items-center gap-2 transition">
                          <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-full"><Ruler className="w-6 h-6 text-slate-600 dark:text-slate-300" /></div>
                          <span className="font-bold text-sm dark:text-white">Steel Weight</span>
                      </button>
                      <button onClick={() => setActiveTool('paint')} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 flex flex-col items-center gap-2 transition">
                          <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full"><Briefcase className="w-6 h-6 text-green-600" /></div>
                          <span className="font-bold text-sm dark:text-white">Paint Area</span>
                      </button>
                  </div>
              );
          }

          const results = calculateConstruction();
          return (
              <div className="p-5 space-y-4">
                  <button onClick={() => setActiveTool(null)} className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-2"><ArrowLeft className="w-3 h-3" /> Back to Tools</button>
                  
                  <div className="grid grid-cols-2 gap-3">
                      {['volume', 'tiles', 'paint'].includes(activeTool) && <input type="number" placeholder="Length (ft)" className="input-field" value={dims.l} onChange={e => setDims({...dims, l: e.target.value})} />}
                      {['volume', 'tiles', 'paint'].includes(activeTool) && <input type="number" placeholder="Width (ft)" className="input-field" value={dims.w} onChange={e => setDims({...dims, w: e.target.value})} />}
                      {activeTool === 'volume' && <input type="number" placeholder="Height (ft)" className="input-field col-span-2" value={dims.h} onChange={e => setDims({...dims, h: e.target.value})} />}
                      
                      {activeTool === 'steel' && <input type="number" placeholder="Diameter (mm)" className="input-field" value={dims.dia} onChange={e => setDims({...dims, dia: e.target.value})} />}
                      {activeTool === 'steel' && <input type="number" placeholder="Length (m)" className="input-field" value={dims.l} onChange={e => setDims({...dims, l: e.target.value})} />}
                      
                      {activeTool === 'tiles' && <input type="number" placeholder="Tile Area (sq.ft)" className="input-field col-span-2" value={dims.size} onChange={e => setDims({...dims, size: e.target.value})} />}
                      {activeTool === 'paint' && <input type="number" placeholder="Coverage (sq.ft/L)" className="input-field col-span-2" value={dims.size} onChange={e => setDims({...dims, size: e.target.value})} />}
                  </div>

                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl space-y-2">
                      {results.map((r, i) => (
                          <div key={i} className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">{r.label}</span>
                              <span className="font-bold text-slate-900 dark:text-white">{r.value}</span>
                          </div>
                      ))}
                  </div>
              </div>
          );
      }

      if (mode === 'business') {
          return (
              <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><label className="text-xs font-bold text-slate-400">Amount</label><input type="number" className="input-field text-lg font-bold" value={bizValues.amount} onChange={e => setBizValues({...bizValues, amount: e.target.value})} /></div>
                      <div className="col-span-2"><label className="text-xs font-bold text-slate-400">Rate (%)</label><input type="number" className="input-field" value={bizValues.rate} onChange={e => setBizValues({...bizValues, rate: e.target.value})} /></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => calculateGST('add')} className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-200">+ Add GST</button>
                      <button onClick={() => calculateGST('remove')} className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-200">- Remove GST</button>
                      <button onClick={calculateDiscount} className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-xs font-bold hover:bg-green-200 col-span-2">Calculate Discount</button>
                  </div>

                  {bizResult && (
                      <div className="bg-slate-900 text-white p-4 rounded-xl text-center animate-in slide-in-from-bottom-2">
                          <p className="text-xs opacity-70 uppercase tracking-wide">{bizResult.label}</p>
                          <p className="text-2xl font-bold">{bizResult.value}</p>
                      </div>
                  )}
              </div>
          );
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors animate-slide-up">
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2 dark:text-white"><CalcIcon className="w-5 h-5 text-indigo-500" /> Calculator</h3>
          <button onClick={onClose} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 dark:bg-slate-950 p-1 border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setMode('standard')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'standard' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600 dark:text-white' : 'text-slate-400'}`}>Standard</button>
            <button onClick={() => setMode('construction')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'construction' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600 dark:text-white' : 'text-slate-400'}`}>Tools</button>
            <button onClick={() => setMode('business')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'business' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600 dark:text-white' : 'text-slate-400'}`}>GST/Disc</button>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
};

export default CalculatorModal;
