import React, { useState, useMemo } from 'react';
import { StockItem } from '../types';
import { Search, Package, AlertTriangle, CheckCircle2, TrendingDown, Layers } from 'lucide-react';

interface StockDashboardProps {
  stockData: StockItem[];
  onBack: () => void;
}

const StockDashboard: React.FC<StockDashboardProps> = ({ stockData, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtering Logic
  const filteredItems = useMemo(() => {
    if (!searchTerm) return stockData;
    const lower = searchTerm.toLowerCase();
    return stockData.filter(item => 
      item.name.toLowerCase().includes(lower)
    );
  }, [stockData, searchTerm]);

  // Aggregated Stats
  const totalItems = stockData.length;
  const lowStockItems = stockData.filter(i => i.balance < 0 || (i.balance > 0 && i.balance < i.total * 0.1)).length;

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6]">
       {/* Header */}
       <div className="bg-white px-6 py-5 border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <div>
                <h2 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
                   <Package className="w-6 h-6 text-brand-blue" />
                   Estoque de Insumos
                </h2>
                <p className="text-sm text-brand-slate font-medium">Monitoramento de saldos e reservas</p>
             </div>
             <div className="bg-blue-50 text-brand-blue px-3 py-1 rounded-lg text-xs font-bold border border-blue-100">
                {totalItems} Itens Cadastrados
             </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
             <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
             <input 
               type="text" 
               placeholder="Pesquisar insumo por nome..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-brand-blue font-medium focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
             />
          </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
          
          {filteredItems.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <Package className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-lg font-bold text-brand-slate">Nenhum insumo encontrado</p>
                <p className="text-sm text-gray-400">Tente buscar por outro termo.</p>
             </div>
          ) : (
             <div className="grid grid-cols-1 gap-4">
                {filteredItems.map((item, idx) => {
                   // Visual Logic based on balance
                   const isCritical = item.balance <= 0;
                   const isLow = !isCritical && item.balance < (item.total * 0.2); // < 20%
                   
                   return (
                      <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                         {/* Header: Name and Status */}
                         <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-xl ${isCritical ? 'bg-red-50 text-red-600' : isLow ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-brand-blue'}`}>
                                  <Layers className="w-5 h-5" />
                               </div>
                               <div>
                                  <h3 className="font-bold text-brand-blue text-sm md:text-base leading-tight">{item.name}</h3>
                                  <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 mt-1 inline-block">
                                     UN: {item.unit}
                                  </span>
                               </div>
                            </div>
                            {isCritical && (
                               <div className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full border border-red-100">
                                  <AlertTriangle className="w-3 h-3" /> Crítico
                               </div>
                            )}
                         </div>

                         {/* Grid Stats */}
                         <div className="grid grid-cols-3 gap-2 text-center">
                            {/* Total Stock */}
                            <div className="flex flex-col items-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                               <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total</span>
                               <span className="text-sm md:text-base font-extrabold text-brand-blue">{item.total.toLocaleString('pt-BR')}</span>
                            </div>

                            {/* Reserved */}
                            <div className="flex flex-col items-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                               <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Reservado</span>
                               <span className="text-sm md:text-base font-extrabold text-brand-slate">{item.reserved.toLocaleString('pt-BR')}</span>
                            </div>

                            {/* Balance */}
                            <div className={`flex flex-col items-center p-2 rounded-xl border ${isCritical ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                               <span className={`text-[10px] font-bold uppercase mb-1 ${isCritical ? 'text-red-400' : 'text-green-600'}`}>Saldo</span>
                               <span className={`text-sm md:text-base font-extrabold ${isCritical ? 'text-red-700' : 'text-brand-green'}`}>
                                  {item.balance.toLocaleString('pt-BR')}
                               </span>
                            </div>
                         </div>
                      </div>
                   );
                })}
             </div>
          )}
       </div>
    </div>
  );
};

export default StockDashboard;