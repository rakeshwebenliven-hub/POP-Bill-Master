
import React, { useMemo } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign, Users, PieChart, BarChart3, ArrowUpRight } from 'lucide-react';
import { SavedBillData } from '../types';
import { calculateDashboardStats, getMonthlyData, getClientPerformance } from '../services/analyticsService';
import { DASHBOARD_TEXT } from '../constants';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SavedBillData[];
}

const DashboardModal: React.FC<DashboardModalProps> = ({ isOpen, onClose, history }) => {
  
  const stats = useMemo(() => calculateDashboardStats(history), [history]);
  const monthlyData = useMemo(() => getMonthlyData(history), [history]);
  const topClients = useMemo(() => getClientPerformance(history), [history]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                <BarChart3 className="w-6 h-6" />
             </div>
             <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white">{DASHBOARD_TEXT.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Financial Overview</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
           
           {/* KPI Cards */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard 
                 title={DASHBOARD_TEXT.totalRevenue} 
                 value={`₹${(stats.totalRevenue/1000).toFixed(1)}k`} 
                 subValue={`${stats.totalInvoices} Invoices`}
                 icon={<DollarSign className="w-5 h-5 text-blue-600" />} 
                 color="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"
                 textColor="text-blue-700 dark:text-blue-300"
              />
              <StatCard 
                 title={DASHBOARD_TEXT.netProfit} 
                 value={`₹${(stats.netProfit/1000).toFixed(1)}k`} 
                 subValue={`${stats.profitMargin.toFixed(1)}% Margin`}
                 icon={<TrendingUp className="w-5 h-5 text-green-600" />} 
                 color="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800"
                 textColor="text-green-700 dark:text-green-300"
              />
              <StatCard 
                 title={DASHBOARD_TEXT.totalExpenses} 
                 value={`₹${(stats.totalExpenses/1000).toFixed(1)}k`} 
                 subValue="Cost of Work"
                 icon={<TrendingDown className="w-5 h-5 text-red-600" />} 
                 color="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
                 textColor="text-red-700 dark:text-red-300"
              />
              <StatCard 
                 title={DASHBOARD_TEXT.outstanding} 
                 value={`₹${(stats.outstandingDue/1000).toFixed(1)}k`} 
                 subValue="To Collect"
                 icon={<Users className="w-5 h-5 text-amber-600" />} 
                 color="bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"
                 textColor="text-amber-700 dark:text-amber-300"
              />
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Monthly Chart (CSS Bar Chart) */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2"><PieChart className="w-5 h-5 text-indigo-500" /> {DASHBOARD_TEXT.monthlyTrend}</h4>
                 
                 <div className="flex items-end gap-3 h-48 w-full overflow-x-auto pb-2">
                    {monthlyData.map((data, i) => {
                       const maxVal = Math.max(...monthlyData.map(d => d.revenue));
                       const heightPercent = maxVal > 0 ? (data.revenue / maxVal) * 100 : 0;
                       const expHeight = maxVal > 0 ? (data.expenses / maxVal) * 100 : 0;
                       
                       return (
                          <div key={i} className="flex flex-col items-center gap-2 flex-1 min-w-[40px] group relative">
                             <div className="w-full flex items-end justify-center h-full relative rounded-t-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                                {/* Revenue Bar */}
                                <div style={{ height: `${heightPercent}%` }} className="w-full bg-indigo-500 hover:bg-indigo-600 transition-all relative group-hover:opacity-90"></div>
                                {/* Expense Overlay */}
                                <div style={{ height: `${expHeight}%` }} className="absolute bottom-0 w-full bg-red-400/50 hover:bg-red-500/60 transition-all border-t border-white/20"></div>
                             </div>
                             <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 rotate-0 sm:truncate">{data.month.split(' ')[0]}</span>
                             
                             {/* Tooltip */}
                             <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10 shadow-xl">
                                <div className="font-bold mb-1">{data.month}</div>
                                <div className="text-green-400">Rev: ₹{data.revenue}</div>
                                <div className="text-red-400">Exp: ₹{data.expenses}</div>
                                <div className="font-bold pt-1 border-t border-white/10 mt-1">Net: ₹{data.profit}</div>
                             </div>
                          </div>
                       );
                    })}
                 </div>
              </div>

              {/* Top Clients */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> {DASHBOARD_TEXT.topClients}</h4>
                 <div className="space-y-3">
                    {topClients.length === 0 ? (
                       <p className="text-sm text-slate-400 italic py-4 text-center">No client data yet.</p>
                    ) : (
                       topClients.map((client, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border border-slate-100 dark:border-slate-800/50">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                   {client.name.charAt(0)}
                                </div>
                                <div>
                                   <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">{client.name}</div>
                                   <div className="text-[10px] text-slate-500">{client.invoiceCount} Bills</div>
                                </div>
                             </div>
                             <div className="text-right">
                                <div className="text-sm font-bold text-green-600 dark:text-green-400">₹{client.profit.toFixed(0)}</div>
                                <div className="text-[10px] text-slate-400">Profit</div>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subValue, icon, color, textColor }: any) => (
  <div className={`p-4 rounded-2xl border ${color} flex flex-col justify-between h-32`}>
     <div className="flex justify-between items-start">
        <span className={`text-xs font-bold uppercase tracking-wider ${textColor} opacity-70`}>{title}</span>
        <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/10`}>{icon}</div>
     </div>
     <div>
        <h4 className={`text-2xl font-black ${textColor}`}>{value}</h4>
        <p className={`text-xs font-medium ${textColor} opacity-80 flex items-center gap-1`}>
           {subValue}
        </p>
     </div>
  </div>
);

export default DashboardModal;
