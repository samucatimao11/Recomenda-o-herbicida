import React, { useState } from 'react';
import ImportView from './components/ImportView';
import RecommendationWizard from './components/RecommendationWizard';
import { SpreadsheetRow, ViewState, RecommendationSummary } from './types';
import { Sprout, LayoutDashboard, History, FileText, Check, Download, ChevronRight } from 'lucide-react';
import { generateRecommendationPDF } from './services/pdfService';

const App: React.FC = () => {
  const [data, setData] = useState<SpreadsheetRow[]>([]);
  const [view, setView] = useState<ViewState>('IMPORT');
  
  // History stores lists of lists (each entry is a report with 1+ sectors)
  const [history, setHistory] = useState<RecommendationSummary[][]>([]);
  const [lastReport, setLastReport] = useState<RecommendationSummary[] | null>(null);

  const handleDataLoaded = (loadedData: SpreadsheetRow[]) => {
    setData(loadedData);
    setView('NEW_RECOMMENDATION');
  };

  const handleRecommendationComplete = (summaries: RecommendationSummary[]) => {
    setHistory(prev => [summaries, ...prev]);
    setLastReport(summaries);
    setView('SUCCESS_SENT');
  };

  const handleDownloadLastPdf = () => {
    if (lastReport && lastReport.length > 0) {
      const doc = generateRecommendationPDF(lastReport);
      const name = lastReport.length > 1 
        ? `Relatorio_Multiplos_Setores.pdf` 
        : `Recomendacao_Setor_${lastReport[0].sector}.pdf`;
      doc.save(name);
    }
  };

  // Mobile Bottom Nav Item
  const BottomNavItem = ({ active, onClick, icon: Icon, label, disabled = false }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-200
        ${active ? 'text-agro-700 font-semibold' : 'text-gray-500 hover:text-gray-700'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
      `}
    >
      <div className={`p-1.5 rounded-2xl mb-1 ${active ? 'bg-agro-100' : ''}`}>
        <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
      </div>
      <span className="text-[11px] font-medium tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="w-72 bg-white border-r border-gray-200 hidden md:flex flex-col shadow-soft z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-gradient-to-br from-agro-600 to-agro-800 p-2.5 rounded-xl shadow-lg shadow-agro-200/50">
            <Sprout className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">Smart</h1>
            <p className="text-xs text-agro-700 font-bold tracking-[0.2em] mt-1">AGRÍCOLA</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {[
            { id: 'IMPORT', icon: LayoutDashboard, label: 'Base de Dados' },
            { id: 'NEW_RECOMMENDATION', icon: FileText, label: 'Recomendação', disabled: data.length === 0 },
            { id: 'HISTORY', icon: History, label: 'Histórico', disabled: history.length === 0 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              disabled={item.disabled}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group border border-transparent
                ${view === item.id 
                  ? 'bg-agro-50 text-agro-800 font-semibold border-agro-100 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <item.icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${view === item.id ? 'text-agro-700' : 'text-gray-500'}`} />
              {item.label}
              {view === item.id && <ChevronRight className="w-4 h-4 ml-auto text-agro-500" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full w-full overflow-hidden bg-[#F3F4F6]">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white/95 backdrop-blur-md px-5 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-agro-600 to-agro-800 p-1.5 rounded-lg shadow-sm">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-gray-800 text-lg tracking-tight">Smart Agrícola</span>
          </div>
          <div className="bg-agro-100 text-agro-800 text-xs font-bold px-2.5 py-1 rounded-md border border-agro-200">
             v1.0
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8 p-4 md:p-8">
          
          {view === 'IMPORT' && (
            <div className="h-full max-w-4xl mx-auto flex flex-col justify-center">
              <ImportView onDataLoaded={handleDataLoaded} />
            </div>
          )}

          {view === 'NEW_RECOMMENDATION' && (
            <div className="h-full max-w-3xl mx-auto">
               {data.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
                   <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
                      <LayoutDashboard className="w-10 h-10 text-gray-500" />
                   </div>
                   <h3 className="text-xl font-bold text-gray-900 mb-2">Sem dados carregados</h3>
                   <p className="text-gray-600 mb-6 max-w-xs font-medium">
                     Importe uma planilha para começar a gerar recomendações.
                   </p>
                   <button 
                    onClick={() => setView('IMPORT')} 
                    className="bg-agro-700 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-agro-900/10 active:scale-95 transition-all hover:bg-agro-800"
                   >
                     Carregar Planilha
                   </button>
                 </div>
               ) : (
                 <RecommendationWizard 
                   data={data} 
                   onComplete={handleRecommendationComplete}
                   onCancel={() => setView('IMPORT')}
                 />
               )}
            </div>
          )}

          {view === 'SUCCESS_SENT' && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-md mx-auto text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-agro-700 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-green-200 ring-4 ring-white">
                 <Check className="w-12 h-12 text-white stroke-[3px]" />
               </div>
               <h2 className="text-2xl font-bold text-gray-900 mb-3">Sucesso!</h2>
               <p className="text-gray-600 mb-8 leading-relaxed font-medium">
                 O relatório com <strong>{lastReport?.length} setor(es)</strong> foi gerado e enviado para o e-mail cadastrado.
               </p>
               
               <div className="flex flex-col w-full gap-3">
                 <button 
                   onClick={handleDownloadLastPdf}
                   className="flex items-center justify-center w-full px-6 py-4 bg-white border border-gray-300 text-gray-800 rounded-xl font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                 >
                   <Download className="w-5 h-5 mr-3 text-agro-700" /> Baixar Cópia PDF
                 </button>
                 <button 
                   onClick={() => setView('NEW_RECOMMENDATION')}
                   className="flex items-center justify-center w-full px-6 py-4 bg-agro-700 text-white rounded-xl font-bold shadow-lg shadow-agro-700/20 active:scale-95 transition-all hover:bg-agro-800"
                 >
                   Nova Recomendação
                 </button>
               </div>
            </div>
          )}

          {view === 'HISTORY' && (
            <div className="max-w-3xl mx-auto pb-20">
              <h2 className="text-xl font-bold text-gray-900 mb-6 px-1">Histórico Recente</h2>
              <div className="space-y-4">
                 {history.map((report, idx) => {
                   const mainSector = report[0];
                   const totalArea = report.reduce((acc, curr) => acc + curr.totalArea, 0);
                   const count = report.length;

                   return (
                     <div 
                        key={idx} 
                        onClick={() => {
                           const doc = generateRecommendationPDF(report);
                           doc.save(`Relatorio_Historico_${idx + 1}.pdf`);
                        }}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:border-agro-300"
                     >
                       <div className="flex items-center gap-4">
                         <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center text-blue-700 font-bold text-lg border border-blue-100">
                            {count}
                         </div>
                         <div>
                           <h4 className="font-bold text-gray-900 text-sm">
                             {count > 1 ? `Multi-Setor` : `Setor ${mainSector.sector}`}
                           </h4>
                           <p className="text-xs text-gray-600 mt-0.5 line-clamp-1 font-medium">{mainSector.farm}</p>
                           <p className="text-[10px] text-gray-500 mt-1 font-bold bg-gray-100 px-2 py-0.5 rounded-full w-fit">
                             {new Date(mainSector.date).toLocaleDateString('pt-BR')}
                           </p>
                         </div>
                       </div>
                       <div className="text-right">
                         <div className="text-base font-bold text-gray-900">{totalArea.toFixed(1)} <span className="text-xs font-normal text-gray-500">ha</span></div>
                         <div className="flex items-center justify-end text-agro-700 text-xs font-bold mt-1">
                           <Download className="w-3 h-3 mr-1" /> PDF
                         </div>
                       </div>
                     </div>
                   );
                 })}
                 {history.length === 0 && (
                   <div className="py-20 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                     <History className="w-12 h-12 mb-3 opacity-30" />
                     <p className="font-medium text-gray-500">Nenhum histórico disponível.</p>
                   </div>
                 )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-1 px-2 flex justify-around items-end z-40 shadow-up">
            <BottomNavItem 
              active={view === 'IMPORT'} 
              onClick={() => setView('IMPORT')} 
              icon={LayoutDashboard} 
              label="Dados" 
            />
            <div className="relative -top-5">
              <button 
                onClick={() => setView('NEW_RECOMMENDATION')}
                disabled={data.length === 0}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-agro-700/30 transition-all active:scale-95 border-4 border-white
                  ${view === 'NEW_RECOMMENDATION' ? 'bg-agro-700' : 'bg-agro-600'}
                  ${data.length === 0 ? 'opacity-50 grayscale bg-gray-400' : ''}
                `}
              >
                <FileText className="w-6 h-6 text-white stroke-[2.5px]" />
              </button>
            </div>
            <BottomNavItem 
              active={view === 'HISTORY'} 
              onClick={() => setView('HISTORY')} 
              icon={History} 
              label="Histórico" 
              disabled={history.length === 0}
            />
        </div>

      </main>
    </div>
  );
};

export default App;