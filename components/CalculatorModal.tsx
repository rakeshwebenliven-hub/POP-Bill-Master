
import React, { useState, useEffect } from 'react';
import { X, Delete, Calculator as CalcIcon, Ruler, Briefcase, Percent, Check, ChevronRight, ArrowLeft, PaintBucket, Layers, Droplets, RefreshCw, Scale, ArrowRightLeft } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CalcMode = 'standard' | 'construction' | 'business' | 'converter';
type ConstructionTool = 'volume' | 'tiles' | 'steel' | 'paint' | 'tank';
type BusinessTool = 'gst' | 'discount' | 'margin';

const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<CalcMode>('standard');
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Standard Calc State
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  // Construction State
  const [cDims, setCDims] = useState({ l: '', w: '', h: '', size: '', dia: '', qty: '1' });
  
  // Business State
  const [bVals, setBVals] = useState({ amount: '', rate: '18', count: '' });
  
  // Converter State
  const [convVal, setConvVal] = useState('');
  const [convType, setConvType] = useState('ft-mtr');

  useEffect(() => {
      if(!isOpen) {
          // Reset on close
          setMode('standard');
          setActiveTool(null);
          setInput('');
          setResult('');
      }
  }, [isOpen]);

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

  // --- CONSTRUCTION LOGIC (Real Time) ---
  const renderConstructionTool = () => {
      const l = parseFloat(cDims.l) || 0;
      const w = parseFloat(cDims.w) || 0;
      const h = parseFloat(cDims.h) || 0;
      const size = parseFloat(cDims.size) || 0;
      
      let resItems: {label: string, value: string}[] = [];

      switch(activeTool) {
          case 'volume': 
              // Brass Logic: (L x W x H) / 100
              const cuft = l * w * h;
              const brass = cuft / 100;
              const cumt = cuft / 35.315;
              resItems = [
                  { label: 'Volume (Cu.ft)', value: cuft.toFixed(2) },
                  { label: 'Volume (Cu.mt)', value: cumt.toFixed(2) },
                  { label: 'Total Brass', value: brass.toFixed(2) }
              ];
              break;
          case 'tiles': 
              // Tile Logic
              const area = l * w;
              const tileSize = size || 4; // Default 2x2 = 4 sqft
              const tilesNeeded = Math.ceil(area / tileSize);
              resItems = [
                  { label: 'Floor Area', value: `${area.toFixed(2)} Sq.ft` },
                  { label: 'Tiles Needed', value: `${tilesNeeded} pcs` },
                  { label: 'Box Estimate', value: `${Math.ceil(tilesNeeded / 4)} boxes` } // Approx 4 per box
              ];
              break;
          case 'steel':
              // Steel Weight: D^2 * L / 162
              const d = parseFloat(cDims.dia) || 0;
              const len = parseFloat(cDims.l) || 12; // Standard bar 12m
              const qty = parseFloat(cDims.qty) || 1;
              const weightPerMeter = (d * d) / 162;
              const totalWeight = weightPerMeter * len * qty;
              resItems = [
                  { label: 'Weight / Meter', value: `${weightPerMeter.toFixed(3)} kg` },
                  { label: 'Total Weight', value: `${totalWeight.toFixed(2)} kg` },
                  { label: 'In Tons', value: `${(totalWeight/1000).toFixed(3)} Ton` }
              ];
              break;
          case 'paint':
              const wallArea = l * w;
              const coverage = size || 100; // sqft per liter (approx)
              const coats = parseFloat(cDims.qty) || 2;
              const liters = (wallArea * coats) / coverage;
              resItems = [
                  { label: 'Total Wall Area', value: `${wallArea.toFixed(0)} Sq.ft` },
                  { label: 'Paint Required', value: `${liters.toFixed(1)} Liters` }
              ];
              break;
          case 'tank':
              // L x W x H (ft) * 28.317 = Liters
              const volCuFt = l * w * h;
              const litersCap = volCuFt * 28.317;
              resItems = [
                  { label: 'Volume', value: `${volCuFt.toFixed(2)} Cu.ft` },
                  { label: 'Water Capacity', value: `${litersCap.toFixed(0)} Liters` }
              ];
              break;
      }

      return (
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                  {(activeTool === 'volume' || activeTool === 'tiles' || activeTool === 'paint' || activeTool === 'tank') && (
                      <>
                        <input type="number" placeholder="Length (ft)" className="input-field" value={cDims.l} onChange={e => setCDims({...cDims, l: e.target.value})} autoFocus />
                        <input type="number" placeholder="Width (ft)" className="input-field" value={cDims.w} onChange={e => setCDims({...cDims, w: e.target.value})} />
                      </>
                  )}
                  {(activeTool === 'volume' || activeTool === 'tank') && (
                      <input type="number" placeholder="Height/Depth (ft)" className="input-field col-span-2" value={cDims.h} onChange={e => setCDims({...cDims, h: e.target.value})} />
                  )}
                  
                  {activeTool === 'steel' && (
                      <>
                        <input type="number" placeholder="Diameter (mm)" className="input-field" value={cDims.dia} onChange={e => setCDims({...cDims, dia: e.target.value})} autoFocus />
                        <input type="number" placeholder="Rod Length (m)" className="input-field" value={cDims.l} onChange={e => setCDims({...cDims, l: e.target.value})} />
                        <input type="number" placeholder="Quantity (Nos)" className="input-field col-span-2" value={cDims.qty} onChange={e => setCDims({...cDims, qty: e.target.value})} />
                      </>
                  )}

                  {activeTool === 'tiles' && <input type="number" placeholder="One Tile Area (sq.ft)" className="input-field col-span-2" value={cDims.size} onChange={e => setCDims({...cDims, size: e.target.value})} />}
                  
                  {activeTool === 'paint' && (
                      <>
                        <input type="number" placeholder="Coverage (sq.ft/L)" className="input-field" value={cDims.size} onChange={e => setCDims({...cDims, size: e.target.value})} />
                        <input type="number" placeholder="No. of Coats" className="input-field" value={cDims.qty} onChange={e => setCDims({...cDims, qty: e.target.value})} />
                      </>
                  )}
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl space-y-2">
                  {resItems.map((r, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">{r.label}</span>
                          <span className="font-bold text-slate-900 dark:text-white text-base">{r.value}</span>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  // --- BUSINESS LOGIC (Real Time) ---
  const renderBusinessTool = () => {
      const amt = parseFloat(bVals.amount) || 0;
      const rt = parseFloat(bVals.rate) || 0;
      let resItems: {label: string, value: string, highlight?: boolean}[] = [];

      switch(activeTool) {
          case 'gst':
              const gstAmt = amt * (rt / 100);
              const totalInc = amt + gstAmt;
              const baseEx = amt / (1 + (rt / 100));
              const gstFromInc = amt - baseEx;
              
              resItems = [
                  { label: `Add ${rt}% GST`, value: `+ ₹${gstAmt.toFixed(2)}` },
                  { label: 'Total (Forward)', value: `₹${totalInc.toFixed(2)}`, highlight: true },
                  { label: '---', value: '---' },
                  { label: `Remove ${rt}% GST`, value: `- ₹${gstFromInc.toFixed(2)}` },
                  { label: 'Base Value (Reverse)', value: `₹${baseEx.toFixed(2)}`, highlight: true },
              ];
              break;
          case 'discount':
              const discAmt = amt * (rt / 100);
              const finalPrice = amt - discAmt;
              resItems = [
                  { label: 'Original Price', value: `₹${amt.toFixed(2)}` },
                  { label: `Discount (${rt}%)`, value: `- ₹${discAmt.toFixed(2)}` },
                  { label: 'Final Selling Price', value: `₹${finalPrice.toFixed(2)}`, highlight: true }
              ];
              break;
          case 'margin':
              // Cost + Margin = Selling
              const marginAmt = amt * (rt / 100);
              const selling = amt + marginAmt;
              resItems = [
                  { label: 'Cost Price', value: `₹${amt.toFixed(2)}` },
                  { label: `Profit Margin (${rt}%)`, value: `+ ₹${marginAmt.toFixed(2)}` },
                  { label: 'Selling Price', value: `₹${selling.toFixed(2)}`, highlight: true }
              ];
              break;
      }

      return (
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Amount / Cost</label>
                      <input type="number" className="input-field text-xl font-bold" value={bVals.amount} onChange={e => setBVals({...bVals, amount: e.target.value})} autoFocus />
                  </div>
                  <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Rate / Percentage (%)</label>
                      <div className="grid grid-cols-4 gap-2">
                          <input type="number" className="input-field col-span-2" value={bVals.rate} onChange={e => setBVals({...bVals, rate: e.target.value})} />
                          {[5, 12, 18, 28].map(r => (
                              <button key={r} onClick={() => setBVals({...bVals, rate: r.toString()})} className="bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                                  {r}%
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl space-y-2">
                  {resItems.map((r, i) => (
                      <div key={i} className={`flex justify-between items-center text-sm ${r.label === '---' ? 'opacity-20 my-2' : ''}`}>
                          {r.label === '---' ? <hr className="w-full border-slate-500" /> : (
                              <>
                                <span className="text-slate-500 dark:text-slate-400 font-medium">{r.label}</span>
                                <span className={`font-bold ${r.highlight ? 'text-indigo-600 dark:text-indigo-400 text-lg' : 'text-slate-900 dark:text-white'}`}>{r.value}</span>
                              </>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  // --- CONVERTER LOGIC ---
  const renderConverter = () => {
      const val = parseFloat(convVal) || 0;
      let res = '';
      
      switch(convType) {
          case 'ft-mtr': res = `${(val * 0.3048).toFixed(3)} Meters`; break;
          case 'mtr-ft': res = `${(val * 3.28084).toFixed(3)} Feet`; break;
          case 'inch-mm': res = `${(val * 25.4).toFixed(2)} mm`; break;
          case 'sqft-sqmt': res = `${(val * 0.0929).toFixed(3)} Sq.mt`; break;
          case 'sqmt-sqft': res = `${(val * 10.764).toFixed(3)} Sq.ft`; break;
          case 'acre-sqft': res = `${(val * 43560).toFixed(0)} Sq.ft`; break;
      }

      return (
          <div className="space-y-4">
              <select value={convType} onChange={e => setConvType(e.target.value)} className="input-field">
                  <option value="ft-mtr">Feet to Meters</option>
                  <option value="mtr-ft">Meters to Feet</option>
                  <option value="inch-mm">Inches to mm</option>
                  <option value="sqft-sqmt">Sq.ft to Sq.mt</option>
                  <option value="sqmt-sqft">Sq.mt to Sq.ft</option>
                  <option value="acre-sqft">Acre to Sq.ft</option>
              </select>
              
              <input type="number" placeholder="Enter Value" className="input-field text-xl font-bold" value={convVal} onChange={e => setConvVal(e.target.value)} autoFocus />
              
              <div className="bg-indigo-600 text-white p-5 rounded-xl text-center">
                  <p className="text-xs opacity-70 uppercase tracking-wide mb-1">Result</p>
                  <p className="text-2xl font-bold">{res || '0'}</p>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors animate-slide-up max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h3 className="font-bold flex items-center gap-2 dark:text-white text-lg"><CalcIcon className="w-5 h-5 text-indigo-500" /> Calculator</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 dark:bg-slate-950 p-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto shrink-0 no-scrollbar">
            <button onClick={() => { setMode('standard'); setActiveTool(null); }} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${mode === 'standard' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600 dark:text-white' : 'text-slate-400'}`}>Basic</button>
            <button onClick={() => { setMode('construction'); setActiveTool(null); }} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${mode === 'construction' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600 dark:text-white' : 'text-slate-400'}`}>Construction</button>
            <button onClick={() => { setMode('business'); setActiveTool(null); }} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${mode === 'business' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600 dark:text-white' : 'text-slate-400'}`}>Retail/Biz</button>
            <button onClick={() => { setMode('converter'); setActiveTool(null); }} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${mode === 'converter' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600 dark:text-white' : 'text-slate-400'}`}>Convert</button>
        </div>
        
        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1">
            
            {/* STANDARD MODE */}
            {mode === 'standard' && (
                <div>
                    <div className="mb-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-right shadow-inner">
                        <div className="text-sm text-slate-500 dark:text-slate-400 h-5 font-mono overflow-hidden">{input || '0'}</div>
                        <div className="text-4xl font-bold text-slate-800 dark:text-slate-100 h-12 font-mono tracking-tight">{result || (input ? '' : '0')}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {buttons.map(btn => (
                        <button key={btn} onClick={() => btn === 'C' ? handleClear() : handlePress(btn)}
                            className={`p-4 rounded-xl font-bold text-xl shadow-sm active:scale-95 transition ${btn === 'C' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'} ${['/','*','-','+'].includes(btn) ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : ''}`}>
                            {btn}
                        </button>
                        ))}
                        <button onClick={handleCalculate} className="col-span-4 bg-indigo-600 text-white p-4 rounded-xl font-bold mt-2 shadow-lg active:scale-95 transition text-xl">=</button>
                    </div>
                </div>
            )}

            {/* CONSTRUCTION MENU */}
            {mode === 'construction' && !activeTool && (
                <div className="grid grid-cols-2 gap-3">
                    <ToolBtn icon={<Ruler className="text-orange-500" />} label="Volume & Brass" onClick={() => setActiveTool('volume')} color="bg-orange-50 dark:bg-orange-900/20" />
                    <ToolBtn icon={<Layers className="text-blue-500" />} label="Flooring / Tiles" onClick={() => setActiveTool('tiles')} color="bg-blue-50 dark:bg-blue-900/20" />
                    <ToolBtn icon={<Scale className="text-slate-600 dark:text-slate-300" />} label="Steel Weight" onClick={() => setActiveTool('steel')} color="bg-slate-100 dark:bg-slate-800" />
                    <ToolBtn icon={<PaintBucket className="text-pink-500" />} label="Paint Calculator" onClick={() => setActiveTool('paint')} color="bg-pink-50 dark:bg-pink-900/20" />
                    <ToolBtn icon={<Droplets className="text-cyan-500" />} label="Water Tank" onClick={() => setActiveTool('tank')} color="bg-cyan-50 dark:bg-cyan-900/20" />
                </div>
            )}

            {/* BUSINESS MENU */}
            {mode === 'business' && !activeTool && (
                <div className="grid grid-cols-1 gap-3">
                    <ToolBtn icon={<Briefcase className="text-indigo-500" />} label="GST Calculator (Add / Remove)" onClick={() => setActiveTool('gst')} color="bg-indigo-50 dark:bg-indigo-900/20" />
                    <ToolBtn icon={<Percent className="text-green-500" />} label="Discount Calculator" onClick={() => setActiveTool('discount')} color="bg-green-50 dark:bg-green-900/20" />
                    <ToolBtn icon={<TrendingUp className="text-emerald-500" />} label="Profit Margin" onClick={() => setActiveTool('margin')} color="bg-emerald-50 dark:bg-emerald-900/20" />
                </div>
            )}

            {/* CONVERTER */}
            {mode === 'converter' && renderConverter()}

            {/* TOOL DETAIL VIEW */}
            {activeTool && (mode === 'construction' || mode === 'business') && (
                <div className="animate-in slide-in-from-right duration-200">
                    <button onClick={() => setActiveTool(null)} className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-4 hover:text-indigo-600 transition"><ArrowLeft className="w-3 h-3" /> Back to Tools</button>
                    {mode === 'construction' ? renderConstructionTool() : renderBusinessTool()}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

const ToolBtn = ({ icon, label, onClick, color }: any) => (
    <button onClick={onClick} className={`p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 flex flex-col items-center gap-3 transition active:scale-95 ${color}`}>
        <div className="p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm">{React.cloneElement(icon, { className: `w-6 h-6 ${icon.props.className}` })}</div>
        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 text-center">{label}</span>
    </button>
);

const TrendingUp = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);

export default CalculatorModal;
