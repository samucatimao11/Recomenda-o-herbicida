import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SpreadsheetRow, AgriculturalInput, SelectedPlot, RecommendationSummary, StockItem } from '../types';
import { Search, Calculator, Plus, Trash2, ArrowRight, ArrowLeft, Edit2, Check, FileStack, Settings, Droplets, Fuel, Hash, AlertTriangle, MapPin, Send, Loader2, CopyPlus, UserCircle2, XCircle, Package } from 'lucide-react';
import { generateRecommendationPDF } from '../services/pdfService';

interface RecommendationWizardProps {
  data: SpreadsheetRow[];
  stockData?: StockItem[]; // Nova prop opcional para dados de estoque
  onComplete: (summaries: RecommendationSummary[]) => void;
  onCancel: () => void;
}

// URL da Cloud Function (Substitua pela URL real após o deploy no Google Cloud)
const CLOUD_FUNCTION_URL = "https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/sendRecommendationEmail"; 

// Flexible Column Definitions
const COLS_SETOR = ["Setor", "Cód. Setor", "Codigo Setor", "Set"];
const COLS_FAZENDA = ["Fazenda", "Nome da Fazenda", "Nm Fazenda", "Fzda", "Propriedade"];
const COLS_UNIDADE = ["Unidade", "Und"];
const COLS_SECAO = ["Seção", "Secao", "Sec"];
const COLS_ESTAGIO = ["Estágio de corte", "Estágio", "Estagio", "Corte", "Est. Corte"];
const COLS_TALHAO = ["Talhão", "Talhao", "Talh", "Cd. Talhao"];
const COLS_AREA = ["Área (ha)", "Area (ha)", "Area", "Area ha", "Hectares"];

const COST_CENTERS = [
  "5121 – Soqueira",
  "5116 – Rua Mãe",
  "5111 – Preparo de solo",
  "5117 – Plantio"
];

const SUPERVISORS = [
  "21479 - VICTOR AUGUSTO CARVALHO",
  "27542 - RAFAEL VINICIUS NEVES",
  "1867 - SIDINEI DA MATA MEDEIROS",
  "20720 - JOSE COSTA DE OLIVEIRA JUNIOR"
];

const RecommendationWizard: React.FC<RecommendationWizardProps> = ({ data, stockData = [], onComplete, onCancel }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Queue State for multiple sectors
  const [reportQueue, setReportQueue] = useState<RecommendationSummary[]>([]);

  // Current Sector State
  const [sectorInput, setSectorInput] = useState('');
  const [sectorError, setSectorError] = useState('');
  const [matchedRows, setMatchedRows] = useState<SpreadsheetRow[]>([]);
  
  const [selectedPlotIds, setSelectedPlotIds] = useState<Set<string | number>>(new Set());
  
  // Area Editing State
  const [areaOverrides, setAreaOverrides] = useState<Record<string | number, number>>({});
  const [editingPlotId, setEditingPlotId] = useState<string | number | null>(null);
  const [tempEditValue, setTempEditValue] = useState<string>('');
  
  // New: Global Area Multiplier
  const [areaMultiplier, setAreaMultiplier] = useState<string>('1');

  // Operational Fields State
  const [costCenter, setCostCenter] = useState('');
  const [opCode, setOpCode] = useState('');
  const [flowRate, setFlowRate] = useState('');
  const [tankCapacity, setTankCapacity] = useState('');
  const [supervisor, setSupervisor] = useState('');

  const [inputs, setInputs] = useState<AgriculturalInput[]>([]);
  const [currentInput, setCurrentInput] = useState<Partial<AgriculturalInput>>({ name: '', dose: 0, unit: 'L/ha' });

  // Email State (Background)
  const [emailTo, setEmailTo] = useState('Samuel.franco11@hotmail.com');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Sending State
  const [isSending, setIsSending] = useState(false);

  // Scroll to top on step change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [step]);

  // Pre-fill email fields when reaching step 4
  useEffect(() => {
    if (step === 4) {
      const sectorsList = [...reportQueue.map(r => r.sector), sectorInput].filter(Boolean).join(', ');
      setEmailSubject(`Recomendação de Defensivos – Setor ${sectorInput}`);
      setEmailBody(`Olá,\n\nSegue em anexo o relatório técnico de recomendação agrícola para o(s) setor(es): ${sectorsList}.\n\nAtenciosamente,\nSmart Recomendação Agrícola`);
    }
  }, [step, sectorInput, reportQueue]);

  // Robust value getter...
  const getSafeValue = (row: SpreadsheetRow, aliases: string[]): any => {
    const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const rowKeys = Object.keys(row);

    for (const alias of aliases) {
      const cleanAlias = normalize(alias);
      const foundKey = rowKeys.find(k => normalize(k) === cleanAlias);
      if (foundKey) return row[foundKey];
    }
    // Fallback partial match
    if (aliases.length > 0) {
        const primaryKeyword = normalize(aliases[0].split(' ')[0]); 
        if (primaryKeyword.length > 3) { 
            const partialKey = rowKeys.find(k => normalize(k).includes(primaryKeyword));
            if (partialKey) return row[partialKey];
        }
    }
    return undefined;
  };

  // Step 1: Search Logic
  const handleSearchSector = () => {
    if (!sectorInput) {
      setSectorError('Informe o nº do setor');
      return;
    }

    const cleanInput = sectorInput.toString().trim().toLowerCase();

    const matches = data.filter(row => {
        const val = getSafeValue(row, COLS_SETOR);
        if (val === undefined || val === null) return false;
        return String(val).trim().toLowerCase() === cleanInput;
    });

    if (matches.length === 0) {
       setSectorError(`Setor "${sectorInput}" não encontrado.`);
       return;
    }

    setMatchedRows(matches);
    setSectorError('');
    setAreaOverrides({});
    setAreaMultiplier('1'); // Reset multiplier on new search
    setStep(2);
  };

  const contextRow = matchedRows[0] || {};
  
  const parseArea = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
    return 0;
  };

  const availablePlots: SelectedPlot[] = useMemo(() => {
    return matchedRows.map(row => ({
      id: getSafeValue(row, COLS_TALHAO),
      area: parseArea(getSafeValue(row, COLS_AREA))
    })).filter(p => p.id !== undefined && !isNaN(p.area));
  }, [matchedRows]);

  const getEffectiveArea = (plot: SelectedPlot) => {
    // If there's a manual override, use it absolutely.
    if (areaOverrides[plot.id] !== undefined) {
      return areaOverrides[plot.id];
    }
    // Otherwise, apply the global multiplier to the base area.
    const mult = parseFloat(areaMultiplier.replace(',', '.')) || 1;
    return plot.area * mult;
  };

  const selectedTotalArea = useMemo(() => {
    return availablePlots
      .filter(p => selectedPlotIds.has(p.id))
      .reduce((acc, curr) => acc + getEffectiveArea(curr), 0);
  }, [availablePlots, selectedPlotIds, areaOverrides, areaMultiplier]);

  // --- STOCK LOOKUP HELPER ---
  const findStockItem = (name: string): StockItem | undefined => {
      if (!name || stockData.length === 0) return undefined;
      const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const search = normalize(name);
      return stockData.find(s => normalize(s.name) === search);
  };

  const currentStockItem = currentInput.name ? findStockItem(currentInput.name) : undefined;
  
  const calculateStockStatus = (dose: number, item?: StockItem) => {
      if (!item) return null;
      const required = dose * selectedTotalArea;
      const balance = item.balance;
      const isSufficient = balance >= required;
      return { required, balance, isSufficient };
  };
  
  const currentStockStatus = useMemo(() => 
      calculateStockStatus(currentInput.dose || 0, currentStockItem), 
      [currentInput.dose, currentStockItem, selectedTotalArea]
  );

  // --- AREA EDITING HANDLERS ---
  const startEditing = (e: React.MouseEvent, plot: SelectedPlot) => {
    e.stopPropagation(); 
    setEditingPlotId(plot.id);
    setTempEditValue(getEffectiveArea(plot).toString());
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlotId(null);
    setTempEditValue('');
  };

  const saveEditing = (e: React.MouseEvent, plotId: string | number) => {
    e.stopPropagation();
    const val = parseFloat(tempEditValue.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      setAreaOverrides(prev => ({ ...prev, [plotId]: val }));
    }
    setEditingPlotId(null);
  };

  const handleTogglePlot = (id: string | number) => {
    if (editingPlotId === id) return; 
    const next = new Set(selectedPlotIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPlotIds(next);
  };

  const handleSelectAllPlots = () => {
    if (selectedPlotIds.size === availablePlots.length) {
      setSelectedPlotIds(new Set());
    } else {
      const all = new Set(availablePlots.map(p => p.id));
      setSelectedPlotIds(all);
    }
  };

  const handleAddInput = () => {
    if (!currentInput.name || !currentInput.dose || !currentInput.unit) return;
    const newInput: AgriculturalInput = {
      id: Date.now().toString(),
      name: currentInput.name,
      dose: Number(currentInput.dose),
      unit: currentInput.unit
    };
    setInputs([...inputs, newInput]);
    setCurrentInput({ name: '', dose: 0, unit: 'L/ha' });
  };

  const handleRemoveInput = (id: string) => {
    setInputs(inputs.filter(i => i.id !== id));
  };

  const buildCurrentSummary = (): RecommendationSummary => {
    const finalPlots = availablePlots
      .filter(p => selectedPlotIds.has(p.id))
      .map(p => ({ ...p, area: getEffectiveArea(p) }));
    
    const currentFactor = parseFloat(areaMultiplier.replace(',', '.')) || 1;

    return {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      sector: sectorInput,
      farm: getSafeValue(contextRow, COLS_FAZENDA) || "Não identificado",
      unit: getSafeValue(contextRow, COLS_UNIDADE) || "-",
      section: getSafeValue(contextRow, COLS_SECAO) || "-",
      cuttingStage: getSafeValue(contextRow, COLS_ESTAGIO) || "-",
      selectedPlots: finalPlots,
      totalArea: selectedTotalArea,
      inputs: inputs,
      costCenter: costCenter || "Não informado",
      operationCode: opCode || "-",
      flowRate: flowRate || "-",
      tankCapacity: tankCapacity || "-",
      supervisor: supervisor || "Não informado",
      areaFactor: currentFactor
    };
  };

  // Reseta TUDO para uma nova recomendação "do zero"
  const handleAddToQueue = () => {
    const summary = buildCurrentSummary();
    setReportQueue(prev => [...prev, summary]);
    
    // Reseta localização
    setSectorInput('');
    setSectorError('');
    setMatchedRows([]);
    setSelectedPlotIds(new Set());
    setAreaOverrides({});
    setAreaMultiplier('1');
    
    // Reseta Operacional e Insumos
    setInputs([]);
    setCostCenter('');
    setOpCode('');
    setFlowRate('');
    setTankCapacity('');
    setSupervisor('');
    
    setStep(1);
  };

  // Adiciona à fila mas MANTÉM os insumos e dados operacionais para o próximo setor
  const handleAddSameInputs = () => {
    const summary = buildCurrentSummary();
    setReportQueue(prev => [...prev, summary]);

    // Reseta APENAS a localização (Setor e Talhões)
    setSectorInput('');
    setSectorError('');
    setMatchedRows([]);
    setSelectedPlotIds(new Set());
    setAreaOverrides({});
    setAreaMultiplier('1');
    
    // NOTA: inputs, costCenter, opCode, flowRate, tankCapacity e supervisor NÃO SÃO RESETADOS
    
    setStep(1);
  };

  const handleFinalize = async () => {
    if (isSending) return;
    
    setIsSending(true);
    const currentSummary = buildCurrentSummary();
    const finalReport = [...reportQueue, currentSummary];
    
    // 1. Download Local Copy (UX Requirement)
    try {
      const pdf = generateRecommendationPDF(finalReport);
      const name = finalReport.length > 1 
        ? `Relatorio_Multiplos_Setores.pdf` 
        : `Recomendacao_Setor_${currentSummary.sector}.pdf`;
      pdf.save(name);
    } catch (e) {
      console.error("Erro ao baixar PDF local", e);
    }

    // 2. Send via Cloud Function
    try {
      // Nota: Estamos enviando os DADOS para que a Cloud Function gere seu próprio PDF.
      // Isso é mais seguro para APIs de backend do que enviar blobs gigantes.
      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaries: finalReport,
          emailTo: emailTo,
          emailSubject: emailSubject,
          emailBody: emailBody
        }),
      });

      if (!response.ok) {
        // Se falhar (ex: 404 porque a URL é placeholder), apenas avisamos
        // mas completamos o fluxo pois o usuário já baixou o PDF.
        console.warn("API de email indisponível ou erro no envio.");
        alert("O PDF foi baixado, mas houve um erro ao enviar o e-mail automático. Verifique a conexão.");
      } else {
        // Sucesso silencioso ou toast, aqui vamos direto pro complete
      }
    } catch (e) {
      console.error("Erro de conexão com Cloud Function", e);
      alert("O PDF foi baixado. Não foi possível conectar ao servidor de e-mail.");
    } finally {
      setIsSending(false);
      onComplete(finalReport);
    }
  };

  const displayFarm = getSafeValue(contextRow, COLS_FAZENDA);

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6]">
      
      {/* Mobile-optimized Header/Stepper */}
      <div className="bg-white px-5 py-4 border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="flex justify-between items-center mb-2">
           <h2 className="text-lg font-bold text-brand-blue">
             {step === 1 ? 'Busca' : step === 2 ? 'Talhões' : step === 3 ? 'Aplicação' : 'Resumo'}
             {reportQueue.length > 0 && step === 1 && <span className="text-xs font-bold text-brand-blue ml-2 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Setor #{reportQueue.length + 1}</span>}
           </h2>
           <span className="text-xs font-bold text-brand-slate bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">Passo {step} de 4</span>
        </div>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand-blue transition-all duration-500 ease-out" 
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-4 py-6 overflow-y-auto pb-32" ref={scrollRef}>
        
        {/* STEP 1: SECTOR SEARCH */}
        {step === 1 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <label className="block text-sm font-bold text-brand-blue mb-2">Qual o número do setor?</label>
              <div className="relative">
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={sectorInput}
                  onChange={(e) => setSectorInput(e.target.value)}
                  className="w-full pl-4 pr-12 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all placeholder:text-gray-400 font-medium text-brand-blue"
                  placeholder="Ex: 12"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSector()}
                />
                <button 
                  onClick={handleSearchSector}
                  className="absolute right-2 top-2 bottom-2 bg-brand-blue text-white px-3 rounded-lg flex items-center justify-center hover:bg-[#042440] active:scale-95 transition-all"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
              {sectorError && (
                <div className="mt-3 flex items-center text-red-700 text-sm bg-red-50 border border-red-200 p-3 rounded-lg font-medium">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {sectorError}
                </div>
              )}
            </div>

            {reportQueue.length > 0 && (
              <div className="bg-white border border-brand-blue/20 rounded-2xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-brand-blue mb-3 flex items-center">
                  <FileStack className="w-4 h-4 mr-2" />
                  Itens na Fila ({reportQueue.length})
                </h4>
                <div className="space-y-2">
                  {reportQueue.map((item, idx) => (
                    <div key={idx} className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-sm flex justify-between shadow-sm">
                      <span className="font-bold text-gray-800">Setor {item.sector}</span>
                      <span className="text-brand-blue font-semibold">{item.totalArea.toFixed(1)} ha</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Informational Box for Copied Inputs */}
            {inputs.length > 0 && (
               <div className="bg-brand-yellow/10 border border-brand-yellow/30 rounded-2xl p-4 animate-in slide-in-from-top-2">
                 <div className="flex items-center gap-2 mb-2">
                   <CopyPlus className="w-5 h-5 text-brand-yellow" />
                   <h4 className="text-sm font-bold text-yellow-800">Modo Mesma Calda Ativo</h4>
                 </div>
                 <p className="text-xs text-yellow-900">
                   Os dados operacionais e os <strong>{inputs.length} produtos</strong> da recomendação anterior serão aplicados automaticamente ao próximo setor selecionado.
                 </p>
               </div>
            )}
          </div>
        )}

        {/* STEP 2: PLOT SELECTION */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300">
            {/* Info Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
               <div className="flex items-start gap-3 mb-2">
                 <div className="bg-brand-blue/10 p-2.5 rounded-xl">
                   <MapPin className="w-5 h-5 text-brand-blue" />
                 </div>
                 <div>
                   <h3 className="font-bold text-brand-blue text-lg leading-tight">{displayFarm}</h3>
                   <p className="text-sm text-brand-slate font-medium">Unidade: {getSafeValue(contextRow, COLS_UNIDADE) || "-"}</p>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-3 mt-4">
                 <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
                   <span className="text-xs text-brand-slate font-bold uppercase block mb-1">Seção</span>
                   <span className="text-sm font-bold text-brand-blue">{getSafeValue(contextRow, COLS_SECAO) || "-"}</span>
                 </div>
                 <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
                   <span className="text-xs text-brand-slate font-bold uppercase block mb-1">Estágio</span>
                   <span className="text-sm font-bold text-brand-blue">{getSafeValue(contextRow, COLS_ESTAGIO) || "-"}</span>
                 </div>
               </div>
            </div>

            {/* Selection Header & Multiplier */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
              <div className="flex-1">
                 <h3 className="font-bold text-brand-blue text-lg mb-2">Talhões</h3>
                 <div className="flex items-center gap-2 bg-brand-blue/5 p-2 rounded-lg border border-brand-blue/10 w-fit">
                    <span className="text-xs font-bold text-brand-slate">Fator de Área (x):</span>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0"
                      value={areaMultiplier}
                      onChange={(e) => setAreaMultiplier(e.target.value)}
                      className="w-16 p-1 text-center font-bold text-brand-blue bg-white border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue outline-none"
                    />
                 </div>
              </div>
              <button onClick={handleSelectAllPlots} className="text-sm text-brand-blue font-bold py-2.5 px-4 bg-white hover:bg-gray-50 rounded-lg border border-brand-blue/30 transition-colors shadow-sm whitespace-nowrap">
                {selectedPlotIds.size === availablePlots.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>

            {/* Plots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availablePlots.map((plot) => {
                const isSelected = selectedPlotIds.has(plot.id);
                const isEditing = editingPlotId === plot.id;
                const effectiveArea = getEffectiveArea(plot);
                const isOverridden = areaOverrides[plot.id] !== undefined;
                
                // Determine display area text
                let areaText = effectiveArea.toFixed(2);
                const mult = parseFloat(areaMultiplier.replace(',', '.')) || 1;
                const isMultiplied = mult !== 1 && !isOverridden;

                return (
                  <div 
                    key={plot.id}
                    onClick={() => handleTogglePlot(plot.id)}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98]
                      ${isSelected 
                        ? 'bg-brand-green/5 border-brand-green shadow-sm' 
                        : 'bg-white border-gray-200 shadow-sm hover:border-brand-slate'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-lg font-bold ${isSelected ? 'text-brand-blue' : 'text-gray-700'}`}>
                        {plot.id}
                      </span>
                      {isSelected && <div className="bg-brand-green rounded-full p-0.5"><Check className="w-3 h-3 text-white stroke-[3px]" /></div>}
                    </div>
                    
                    {isEditing ? (
                      <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
                        <input 
                          autoFocus
                          type="number"
                          className="w-full text-sm p-1 border-2 border-brand-green rounded bg-white outline-none font-bold text-brand-blue"
                          value={tempEditValue}
                          onChange={(e) => setTempEditValue(e.target.value)}
                        />
                        <button onClick={(e) => saveEditing(e, plot.id)} className="p-1 bg-green-100 text-green-800 rounded border border-green-200"><Check className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                         <div className="flex flex-col">
                             <span className={`text-sm font-bold ${isOverridden || isMultiplied ? 'text-brand-blue' : 'text-brand-slate'}`}>
                               {areaText} ha
                             </span>
                             {(isOverridden || isMultiplied) && (
                                <span className="text-[10px] text-gray-400 font-medium">
                                   Original: {plot.area.toFixed(2)}
                                </span>
                             )}
                         </div>
                         <div className="flex gap-1">
                             {isOverridden && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); const n = {...areaOverrides}; delete n[plot.id]; setAreaOverrides(n); }} 
                                 className="p-1.5 rounded-full text-red-400 hover:bg-red-50"
                                 title="Restaurar valor original"
                               >
                                 <XCircle className="w-3.5 h-3.5" />
                               </button>
                             )}
                             <button 
                               onClick={(e) => startEditing(e, plot)}
                               className={`p-1.5 rounded-full transition-colors ${isOverridden ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-brand-blue hover:bg-gray-100'}`}
                             >
                               <Edit2 className="w-3.5 h-3.5" />
                             </button>
                         </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="h-4"></div>
          </div>
        )}

        {/* STEP 3: APPLICATION DATA */}
        {step === 3 && (
           <div className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-300">
              {/* Ops Card */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-brand-slate uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Operacional
                </h3>
                
                <div className="space-y-4">
                  {/* Supervisor Field (New) */}
                  <div>
                    <label className="text-sm font-bold text-brand-blue mb-1 block flex items-center">
                      <UserCircle2 className="w-4 h-4 mr-1.5 text-brand-slate"/> Encarregado Responsável
                    </label>
                    <div className="relative">
                      <select 
                        value={supervisor}
                        onChange={(e) => setSupervisor(e.target.value)}
                        className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl text-brand-blue font-medium focus:ring-2 focus:ring-brand-blue focus:border-brand-blue appearance-none"
                      >
                        <option value="">Selecione...</option>
                        {SUPERVISORS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <div className="absolute right-3 top-4 pointer-events-none text-gray-600">▼</div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-brand-blue mb-1 block">Centro de Custos</label>
                    <div className="relative">
                      <select 
                        value={costCenter}
                        onChange={(e) => setCostCenter(e.target.value)}
                        className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl text-brand-blue font-medium focus:ring-2 focus:ring-brand-blue focus:border-brand-blue appearance-none"
                      >
                        <option value="">Selecione...</option>
                        {COST_CENTERS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <div className="absolute right-3 top-4 pointer-events-none text-gray-600">▼</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-xs font-bold text-brand-slate mb-1 block flex items-center"><Hash className="w-3 h-3 mr-1"/> Cód. Op.</label>
                       <input 
                         type="text"
                         value={opCode}
                         onChange={(e) => setOpCode(e.target.value)}
                         className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-brand-blue font-medium focus:ring-2 focus:ring-brand-blue placeholder:text-gray-400"
                         placeholder="1234"
                       />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-brand-slate mb-1 block flex items-center"><Droplets className="w-3 h-3 mr-1"/> Vazão</label>
                       <input 
                         type="text"
                         value={flowRate}
                         onChange={(e) => setFlowRate(e.target.value)}
                         className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-brand-blue font-medium focus:ring-2 focus:ring-brand-blue placeholder:text-gray-400"
                         placeholder="L/ha"
                       />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-brand-slate mb-1 block flex items-center"><Fuel className="w-3 h-3 mr-1"/> Tanque (L)</label>
                     <input 
                       type="text"
                       value={tankCapacity}
                       onChange={(e) => setTankCapacity(e.target.value)}
                       className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-brand-blue font-medium focus:ring-2 focus:ring-brand-blue placeholder:text-gray-400"
                       placeholder="Capacidade total"
                     />
                  </div>
                </div>
              </div>

              {/* Inputs Card */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                 <h3 className="text-sm font-bold text-brand-slate uppercase tracking-wider mb-4 flex items-center gap-2">
                   <Plus className="w-4 h-4" /> Defensivos
                 </h3>

                 <div className="space-y-3 mb-6">
                    <div className="relative">
                      <input 
                        className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl text-brand-blue font-medium focus:ring-2 focus:ring-brand-blue placeholder:text-gray-400"
                        value={currentInput.name}
                        onChange={e => setCurrentInput({...currentInput, name: e.target.value})}
                        placeholder="Nome do Produto"
                        list="stock-products"
                      />
                      {/* Datalist for autocomplete */}
                      <datalist id="stock-products">
                         {stockData.map(item => (
                             <option key={item.id} value={item.name} />
                         ))}
                      </datalist>
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                       <div className="col-span-8">
                           <input 
                             type="number"
                             className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl text-brand-blue font-medium focus:ring-2 focus:ring-brand-blue placeholder:text-gray-400"
                             value={currentInput.dose || ''}
                             onChange={e => setCurrentInput({...currentInput, dose: parseFloat(e.target.value)})}
                             placeholder="Dose"
                           />
                       </div>
                       <div className="col-span-4">
                           <select 
                             className="w-full h-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl text-brand-blue font-medium focus:ring-2 focus:ring-brand-blue"
                             value={currentInput.unit}
                             onChange={e => setCurrentInput({...currentInput, unit: e.target.value})}
                           >
                             <option>L/ha</option>
                             <option>kg/ha</option>
                             <option>g/ha</option>
                             <option>mL/ha</option>
                           </select>
                       </div>
                    </div>

                    {/* Stock Check Visual Indicator */}
                    {currentStockStatus && (
                        <div className={`rounded-xl p-3 border text-sm animate-in fade-in slide-in-from-top-1
                           ${currentStockStatus.isSufficient ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
                        `}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`font-bold ${currentStockStatus.isSufficient ? 'text-green-800' : 'text-red-800'}`}>
                                    {currentStockStatus.isSufficient ? 'Estoque OK' : 'Estoque Insuficiente'}
                                </span>
                                <span className="text-xs font-medium text-gray-500 uppercase">Previsão</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="block text-gray-500">Saldo Atual</span>
                                    <span className="font-bold text-gray-800">{currentStockStatus.balance.toLocaleString('pt-BR')} {currentInput.unit?.split('/')[0]}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500">Necessário</span>
                                    <span className={`font-bold ${currentStockStatus.isSufficient ? 'text-green-600' : 'text-red-600'}`}>
                                        {currentStockStatus.required.toFixed(1)} {currentInput.unit?.split('/')[0]}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <button 
                      onClick={handleAddInput}
                      disabled={!currentInput.name || !currentInput.dose}
                      className="w-full bg-brand-blue text-white py-3.5 rounded-xl font-bold active:scale-[0.98] transition-transform disabled:opacity-50 hover:bg-[#042440]"
                    >
                      Adicionar
                    </button>
                 </div>

                 {/* List */}
                 <div className="space-y-3">
                   {inputs.map(input => {
                     // Check stock for added item
                     const stockItem = findStockItem(input.name);
                     const totalRequired = input.dose * selectedTotalArea;
                     const isInsufficient = stockItem ? stockItem.balance < totalRequired : false;
                     const hasStockData = !!stockItem;

                     return (
                     <div key={input.id} className="flex flex-col bg-gray-50 p-3 rounded-xl border border-gray-200">
                       <div className="flex justify-between items-center">
                           <div>
                             <p className="font-bold text-brand-blue text-sm">{input.name}</p>
                             <p className="text-xs text-brand-slate font-medium mt-0.5">{input.dose} {input.unit} x {selectedTotalArea.toFixed(1)}ha</p>
                           </div>
                           <div className="flex items-center gap-3">
                             <span className="font-bold text-brand-blue text-base">
                               {totalRequired.toFixed(1)} <span className="text-xs">{input.unit.split('/')[0]}</span>
                             </span>
                             <button onClick={() => handleRemoveInput(input.id)} className="text-red-600 p-2 hover:bg-red-50 rounded-lg">
                               <Trash2 className="w-5 h-5" />
                             </button>
                           </div>
                       </div>
                       
                       {/* Stock warning in list */}
                       {hasStockData && (
                           <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
                               {isInsufficient ? (
                                   <>
                                     <AlertTriangle className="w-3 h-3 text-red-500" />
                                     <span className="text-[10px] font-bold text-red-600">
                                         Falta no estoque (Saldo: {stockItem?.balance})
                                     </span>
                                   </>
                               ) : (
                                   <>
                                     <Package className="w-3 h-3 text-green-600" />
                                     <span className="text-[10px] font-bold text-green-700">
                                         Estoque atende (Saldo: {stockItem?.balance})
                                     </span>
                                   </>
                               )}
                           </div>
                       )}
                     </div>
                   )})}
                   {inputs.length === 0 && <p className="text-center text-sm text-gray-500 italic py-4">Nenhum produto adicionado.</p>}
                 </div>
              </div>
           </div>
        )}

        {/* STEP 4: SUMMARY (Email Config Removed) */}
        {step === 4 && (
           <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-brand-yellow/10 border border-brand-yellow/30 p-4 rounded-xl text-yellow-900 flex items-start text-xs leading-relaxed font-medium">
                 <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-brand-yellow" />
                 <p>“Esta recomendação é uma ferramenta de apoio à decisão e não substitui o receituário agronômico.”</p>
               </div>

               <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="bg-gray-50 p-5 border-b border-gray-200 grid grid-cols-2 gap-y-4 text-sm">
                    <div><span className="text-brand-slate text-xs font-bold uppercase block mb-1">Fazenda</span><span className="font-bold text-brand-blue text-base">{displayFarm}</span></div>
                    <div><span className="text-brand-slate text-xs font-bold uppercase block mb-1">Setor</span><span className="font-bold text-brand-blue text-base">{sectorInput}</span></div>
                    <div><span className="text-brand-slate text-xs font-bold uppercase block mb-1">Área Total</span><span className="font-bold text-brand-blue text-base">{selectedTotalArea.toFixed(2)} ha</span></div>
                    <div><span className="text-brand-slate text-xs font-bold uppercase block mb-1">Talhões</span><span className="font-bold text-brand-blue text-base">{availablePlots.filter(p => selectedPlotIds.has(p.id)).length}</span></div>
                    <div className="col-span-2"><span className="text-brand-slate text-xs font-bold uppercase block mb-1">Encarregado</span><span className="font-bold text-brand-blue text-sm">{supervisor || "Não informado"}</span></div>
                 </div>
                 
                 <div className="p-5">
                   <h4 className="text-xs font-bold text-brand-slate uppercase mb-4 tracking-wider">Produtos Calculados</h4>
                   <div className="space-y-3">
                     {inputs.map(input => (
                       <div key={input.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                         <span className="text-brand-blue font-medium">{input.name}</span>
                         <span className="font-bold text-brand-blue text-base">{(input.dose * selectedTotalArea).toFixed(2)} {input.unit.split('/')[0]}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
               
               {/* Seção de Email removida conforme solicitado */}
           </div>
        )}

      </div>

      {/* STICKY BOTTOM ACTIONS */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:static md:border-t-0 md:bg-transparent z-50 md:z-auto safe-area-pb shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.1)]">
        <div className="max-w-3xl mx-auto flex gap-3">
          {step > 1 && (
             <button 
               onClick={() => setStep(s => Math.max(1, s - 1) as any)} 
               className="px-5 py-3.5 rounded-xl border-2 border-gray-300 text-brand-slate font-bold active:bg-gray-50 transition-colors"
               disabled={isSending}
             >
               <ArrowLeft className="w-6 h-6" />
             </button>
          )}

          {step === 1 && (
            <button onClick={onCancel} className="flex-1 py-3.5 text-brand-slate font-bold">Cancelar</button>
          )}

          {step < 3 && step !== 1 && (
             <button 
               onClick={() => setStep(s => s + 1 as any)} 
               disabled={step === 2 && selectedPlotIds.size === 0}
               className="flex-1 bg-brand-blue text-white py-3.5 rounded-xl font-bold shadow-lg shadow-brand-blue/20 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center hover:bg-[#042440]"
             >
               {step === 2 ? `Confirmar (${selectedTotalArea.toFixed(1)} ha)` : 'Próximo'} 
               <ArrowRight className="w-5 h-5 ml-2" />
             </button>
          )}

          {step === 3 && (
            <button 
               onClick={() => setStep(4)} 
               className="flex-1 bg-brand-blue text-white py-3.5 rounded-xl font-bold shadow-lg shadow-brand-blue/20 active:scale-95 transition-all flex items-center justify-center hover:bg-[#042440]"
             >
               Revisar <Calculator className="w-5 h-5 ml-2" />
             </button>
          )}

          {step === 4 && (
            <>
              {/* Botão: Novo Setor (Limpar Dados) */}
              <button 
               onClick={handleAddToQueue}
               className="px-4 py-3.5 bg-gray-100 text-brand-slate rounded-xl font-bold border border-gray-200 active:bg-gray-200 disabled:opacity-50"
               title="Adicionar Outro Setor (Nova Calda)"
               disabled={isSending}
             >
               <Plus className="w-6 h-6" />
             </button>

             {/* Botão: Novo Setor (Mesma Calda) */}
             <button 
               onClick={handleAddSameInputs}
               className="px-4 py-3.5 bg-blue-50 text-brand-blue rounded-xl font-bold border border-blue-200 active:bg-blue-100 disabled:opacity-50 flex items-center gap-2"
               title="Adicionar Setor com Mesma Calda"
               disabled={isSending}
             >
               <CopyPlus className="w-6 h-6" />
               <span className="hidden sm:inline text-sm">Mesma Calda</span>
             </button>

             <button 
               onClick={handleFinalize} 
               disabled={isSending}
               className="flex-1 bg-brand-blue text-white py-3.5 rounded-xl font-bold shadow-lg shadow-brand-blue/20 active:scale-95 transition-all flex items-center justify-center hover:bg-[#042440] disabled:opacity-70 disabled:cursor-wait"
             >
               {isSending ? (
                 <>
                   <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                   Enviando...
                 </>
               ) : (
                 <>
                   Finalizar
                   <Send className="w-5 h-5 ml-2" />
                 </>
               )}
             </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendationWizard;