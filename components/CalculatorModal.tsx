import React, { useState } from 'react';
import { X, Delete, Calculator as CalcIcon } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  if (!isOpen) return null;

  const handlePress = (val: string) => {
    setInput(prev => prev + val);
  };

  const handleClear = () => {
    setInput('');
    setResult('');
  };

  const handleCalculate = () => {
    try {
      // eslint-disable-next-line no-eval
      const res = eval(input); 
      setResult(res.toString());
    } catch (e) {
      setResult('Error');
    }
  };

  const buttons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', 'C', '+',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="bg-slate-900 dark:bg-slate-950 p-3 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <CalcIcon className="w-5 h-5 text-yellow-400" />
            <span className="font-bold">Calculator</span>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-950">
          <div className="mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-right">
             <div className="text-sm text-slate-500 dark:text-slate-400 h-5">{input || '0'}</div>
             <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 h-8">{result || (input ? '' : '0')}</div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {buttons.map(btn => (
              <button
                key={btn}
                onClick={() => btn === 'C' ? handleClear() : handlePress(btn)}
                className={`
                  p-3 rounded-lg font-bold text-lg shadow-sm active:scale-95 transition
                  ${btn === 'C' ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}
                  ${['/','*','-','+'].includes(btn) ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : ''}
                `}
              >
                {btn}
              </button>
            ))}
            <button 
              onClick={handleCalculate}
              className="col-span-4 bg-indigo-600 dark:bg-indigo-700 text-white p-3 rounded-lg font-bold mt-2 shadow hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95 transition"
            >
              =
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorModal;