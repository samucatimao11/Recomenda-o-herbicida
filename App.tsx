import React, { useState } from 'react';
import ImportView from './components/ImportView';
import RecommendationWizard from './components/RecommendationWizard';
import { SpreadsheetRow, ViewState, RecommendationSummary } from './types';
import { LayoutDashboard, History, FileText, Check, Download, ChevronRight, Menu } from 'lucide-react';
import { generateRecommendationPDF } from './services/pdfService';

const LOGO_URL = "https://dkozrkzoghhylgvddkze.supabase.co/storage/v1/object/public/SMART%20CALDA/LOGO.png";

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
        ${active ? 'text-brand-blue font-bold' : 'text-brand-slate hover:text-brand-blue'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
      `}
    >
      <div className={`p-1.5 rounded-2xl mb-1 ${active ? 'bg-brand-blue/10 text-brand-blue' : ''}`}>
        <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
      </div>
      <span className="text-[11px] font-medium tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#F3F4F6] overflow-hidden font-sans">
      
      {/* Desktop Sidebar (White Background style) */}
      <aside className="w-72 bg-white border-r border-gray-200 hidden md:flex flex-col shadow-sm z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-brand-green/10 p-1.5 rounded-lg border border-brand-green/20">
             <img 
               src={LOGO_URL} 
               alt="Smart Calda Logo" 
               className="w-8 h-8 object-contain"
             />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold text-brand-blue leading-none tracking-tight">SMART CALDA</h1>
            <p className="text-xs text-brand-slate font-semibold mt-0.5 uppercase tracking-wide">SOLICITAÇÃO DE KPI</p>
          </div>
        </div>

        <div className="px-6 pb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Geral</p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5">
          {[
            { id: 'IMPORT', icon: LayoutDashboard, label: 'Painel Geral' },
            { id: 'NEW_RECOMMENDATION', icon: FileText, label: 'Nova Operação', disabled: data.length === 0 },
            { id: 'HISTORY', icon: History, label: 'Histórico O.S', disabled: history.length === 0 },
          ].map((item) => {
            const isActive = view === item.id;
            return (
                <button
                key={item.id}
                onClick={() => setView(item.id as ViewState)}
                disabled={item.disabled}
                className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group border-l-4 
                    ${isActive 
                    ? 'bg-brand-blue/5 text-brand-blue font-bold border-brand-blue shadow-sm' 
                    : 'bg-transparent text-brand-slate font-medium border-transparent hover:bg-gray-50 hover:text-brand-blue'}
                    ${item.disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}
                `}
                >
                <item.icon className={`w-5 h-5 mr-3 transition-transform ${isActive ? 'text-brand-blue' : 'text-gray-400 group-hover:text-brand-blue'}`} />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-brand-blue/50" />}
                </button>
            )
          })}
        </nav>
        
        {/* Sidebar Footer Action */}
        <div className="p-6 mt-auto">
             <button 
                onClick={() => setView('IMPORT')}
                className="w-full flex items-center justify-center gap-2 bg-brand-blue text-white py-3.5 rounded-xl font-bold shadow-lg shadow-brand-blue/20 hover:bg-[#042440] active:scale-95 transition-all"
             >
                <Download className="w-5 h-5" />
                Importar Cadastros
             </button>
             <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-400 font-medium">v1.6 © Usina Smart</p>
             </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full w-full overflow-hidden">
        
        {/* Mobile Header (White) */}
        <header className="md:hidden bg-white px-5 py-3 flex items-center justify-between sticky top-0 z-30 border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
             <div className="bg-brand-green/10 p-1 rounded-lg">
                <img 
                  src={LOGO_URL} 
                  alt="Smart Calda" 
                  className="w-8 h-8 object-contain"
                />
             </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-brand-blue text-lg leading-none tracking-tight">SMART CALDA</span>
              <span className="text-[10px] text-brand-slate font-bold uppercase">SOLICITAÇÃO DE KPI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-green"></span>
            </span>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8 p-4 md:p-8">
          
          {view === 'IMPORT' && (
            <div className="h-full max-w-5xl mx-auto flex flex-col justify-center">
              <div className="mb-6 md:mb-8 flex items-center justify-between">
                 <div>
                    <h2 className="text-2xl font-bold text-brand-blue">Painel Geral</h2>
                    <p className="text-brand-slate text-sm">Visão geral e gestão operacional</p>
                 </div>
                 <div className="hidden md:flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-brand-green"></div>
                    <span className="text-xs font-bold text-gray-600">Sistema Online</span>
                 </div>
              </div>
              <ImportView onDataLoaded={handleDataLoaded} />
            </div>
          )}

          {view === 'NEW_RECOMMENDATION' && (
            <div className="h-full max-w-4xl mx-auto">
               <div className="mb-6">
                    <h2 className="text-2xl font-bold text-brand-blue">Nova Operação</h2>
                    <p className="text-brand-slate text-sm">Preencha os dados para gerar recomendação</p>
               </div>
               
               {data.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-[50vh] text-center px-6 bg-white rounded-3xl shadow-sm border border-gray-200">
                   <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-inner">
                      <LayoutDashboard className="w-10 h-10 text-brand-slate/50" />
                   </div>
                   <h3 className="text-xl font-bold text-brand-blue mb-2">Sem dados carregados</h3>
                   <p className="text-brand-slate mb-6 max-w-xs font-medium">
                     Importe uma planilha para começar a gerar recomendações.
                   </p>
                   <button 
                    onClick={() => setView('IMPORT')} 
                    className="bg-brand-blue text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-brand-blue/20 active:scale-95 transition-all hover:bg-[#042440]"
                   >
                     Importar Cadastros
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
               <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-lg border-4 border-brand-green/20 relative">
                 <Check className="w-12 h-12 text-brand-green stroke-[3px]" />
               </div>
               <h2 className="text-2xl font-bold text-brand-blue mb-3">Sucesso!</h2>
               <p className="text-brand-slate mb-8 leading-relaxed font-medium">
                 O relatório com <strong>{lastReport?.length} setor(es)</strong> foi gerado e enviado para o e-mail cadastrado.
               </p>
               
               <div className="flex flex-col w-full gap-3">
                 <button 
                   onClick={handleDownloadLastPdf}
                   className="flex items-center justify-center w-full px-6 py-4 bg-white border border-gray-300 text-brand-blue rounded-xl font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                 >
                   <Download className="w-5 h-5 mr-3 text-brand-blue" /> Baixar Cópia PDF
                 </button>
                 <button 
                   onClick={() => setView('NEW_RECOMMENDATION')}
                   className="flex items-center justify-center w-full px-6 py-4 bg-brand-blue text-white rounded-xl font-bold shadow-lg shadow-brand-blue/20 active:scale-95 transition-all hover:bg-[#042440]"
                 >
                   Nova Recomendação
                 </button>
               </div>
            </div>
          )}

          {view === 'HISTORY' && (
            <div className="max-w-4xl mx-auto pb-20">
              <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-brand-blue px-1">Histórico de O.S.</h2>
                    <p className="text-brand-slate text-sm px-1">Registros recentes gerados</p>
                </div>
                <button className="text-sm font-bold text-brand-blue bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
                    Filtrar
                </button>
              </div>

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
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:border-brand-blue/30 group"
                     >
                       <div className="flex items-center gap-4">
                         <div className="bg-gray-50 w-12 h-12 rounded-xl flex items-center justify-center text-brand-blue font-bold text-lg border border-gray-200 group-hover:bg-brand-blue/5 group-hover:border-brand-blue/20 transition-colors">
                            {count}
                         </div>
                         <div>
                           <h4 className="font-bold text-brand-blue text-sm group-hover:text-[#042440]">
                             {count > 1 ? `Multi-Setor` : `Setor ${mainSector.sector}`}
                           </h4>
                           <p className="text-xs text-brand-slate mt-0.5 line-clamp-1 font-medium">{mainSector.farm}</p>
                           <p className="text-[10px] text-gray-500 mt-1 font-bold flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span>
                             {new Date(mainSector.date).toLocaleDateString('pt-BR')}
                           </p>
                         </div>
                       </div>
                       <div className="text-right">
                         <div className="text-base font-bold text-brand-blue">{totalArea.toFixed(1)} <span className="text-xs font-normal text-gray-400">ha</span></div>
                         <div className="flex items-center justify-end text-brand-blue text-xs font-bold mt-1 bg-brand-blue/5 py-1 px-2 rounded-md">
                           <Download className="w-3 h-3 mr-1" /> PDF
                         </div>
                       </div>
                     </div>
                   );
                 })}
                 {history.length === 0 && (
                   <div className="py-20 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-gray-200 shadow-sm">
                     <History className="w-12 h-12 mb-3 opacity-30 text-brand-blue" />
                     <p className="font-medium text-brand-slate">Nenhum histórico disponível.</p>
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
              label="Painel" 
            />
            <div className="relative -top-5">
              <button 
                onClick={() => setView('NEW_RECOMMENDATION')}
                disabled={data.length === 0}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-brand-blue/30 transition-all active:scale-95 border-4 border-white
                  ${view === 'NEW_RECOMMENDATION' ? 'bg-brand-blue' : 'bg-brand-blue'}
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