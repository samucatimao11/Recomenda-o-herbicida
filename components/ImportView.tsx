import React, { useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, Check, X, FileText, CloudDownload, RefreshCw, Layers } from 'lucide-react';
import { SpreadsheetRow, StockItem } from '../types';

interface ImportViewProps {
  onDataLoaded: (data: SpreadsheetRow[]) => void;
  onStockLoaded: (stock: StockItem[]) => void;
}

const DEFAULT_DB_URL = "https://dkozrkzoghhylgvddkze.supabase.co/storage/v1/object/public/SMART%20CALDA/Cadastro_Envio%203%20(1)%20-%20Copia.xlsx";
const STOCK_DB_URL = "https://dkozrkzoghhylgvddkze.supabase.co/storage/v1/object/public/SMART%20CALDA/Estoque%20de%20insumos.xlsx";

const ImportView: React.FC<ImportViewProps> = ({ onDataLoaded, onStockLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<SpreadsheetRow[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  
  // Status state for sync process
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Helper para normalizar colunas e encontrar valores
  const getColValue = (row: any, candidates: string[]): any => {
    const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const keys = Object.keys(row);
    for (const c of candidates) {
        const key = keys.find(k => normalize(k) === normalize(c));
        if (key) return row[key];
    }
    return 0; // Default number 0 if not found
  };
  
  const getColString = (row: any, candidates: string[]): string => {
      const val = getColValue(row, candidates);
      return val ? String(val) : "Desconhecido";
  };

  // Processa dados de estoque
  const processStockData = (data: any[]): StockItem[] => {
      return data.map((row, index) => {
          // Mapeamento de colunas flexível
          const name = getColString(row, ["Insumo", "Produto", "Descricao", "Nome"]);
          const unit = getColString(row, ["Unidade", "UN", "Und"]);
          
          // Tratamento numérico
          const parseNum = (v: any) => {
             if (typeof v === 'number') return v;
             if (typeof v === 'string') return parseFloat(v.replace(',', '.')) || 0;
             return 0;
          };

          const total = parseNum(getColValue(row, ["Total em estoque", "Estoque Total", "Total", "Quantidade"]));
          const reserved = parseNum(getColValue(row, ["Reservado com O.S", "Reservado", "Bloqueado"]));
          const balance = parseNum(getColValue(row, ["Saldo", "Disponivel"]));

          // Se o Excel não tiver saldo calculado, calcular na mão
          const finalBalance = (balance === 0 && total > 0) ? (total - reserved) : balance;

          return {
              id: `stock-${index}`,
              name,
              unit,
              total,
              reserved,
              balance: finalBalance
          };
      }).filter(item => item.name !== "Desconhecido"); // Remove linhas vazias/cabeçalhos extras
  };

  // Função centralizada para processar o buffer do arquivo da BASE DE DADOS
  const processExcelBuffer = (buffer: ArrayBuffer, name: string) => {
    try {
      const workbook = XLSX.read(buffer, { type: 'array' });
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json<SpreadsheetRow>(ws, { defval: "" });

      if (data.length === 0) {
        setError("A planilha parece estar vazia.");
        setLoading(false);
        return;
      }
      setFileName(name);
      setPreviewData(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Erro ao processar o arquivo.");
      setLoading(false);
    }
  };

  // Função de Sincronização Dupla (Base + Estoque)
  const loadCloudData = async () => {
    setLoading(true);
    setError(null);
    setPreviewData(null); 
    
    try {
      console.log("Iniciando download sincronizado...");
      setSyncStatus("Baixando Base de Cadastros...");
      
      const [baseResponse, stockResponse] = await Promise.all([
         fetch(DEFAULT_DB_URL),
         fetch(STOCK_DB_URL)
      ]);

      if (!baseResponse.ok) throw new Error("Falha ao baixar Base de Dados");
      if (!stockResponse.ok) console.warn("Falha ao baixar Estoque (prosseguindo apenas com base)");

      // Processar Base
      const baseBuffer = await baseResponse.arrayBuffer();
      processExcelBuffer(baseBuffer, "Base de Dados Sincronizada");

      // Processar Estoque (se sucesso)
      if (stockResponse.ok) {
          setSyncStatus("Processando Estoque...");
          const stockBuffer = await stockResponse.arrayBuffer();
          const workbook = XLSX.read(stockBuffer, { type: 'array' });
          const wsname = workbook.SheetNames[0];
          const rawStock = XLSX.utils.sheet_to_json(workbook.Sheets[wsname]);
          const stockItems = processStockData(rawStock);
          console.log(`Estoque carregado: ${stockItems.length} itens`);
          onStockLoaded(stockItems);
      }

    } catch (err) {
      console.error("Falha no carregamento:", err);
      setError("Não foi possível sincronizar. Verifique a internet.");
      setLoading(false);
    } finally {
       setSyncStatus('');
    }
  };

  // Carregamento automático ao montar o componente
  useEffect(() => {
    loadCloudData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const arrayBuffer = evt.target?.result;
      if (arrayBuffer instanceof ArrayBuffer) {
        processExcelBuffer(arrayBuffer, file.name);
      }
    };
    reader.onerror = () => {
      setError("Erro ao ler o arquivo local.");
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirm = () => {
    if (previewData) onDataLoaded(previewData);
  };

  const handleCancel = () => {
    setPreviewData(null);
    setFileName('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (previewData && previewData.length > 0) {
    const columns = Object.keys(previewData[0]);

    return (
      <div className="flex flex-col h-full bg-white animate-in slide-in-from-bottom-10 duration-500 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Preview Header */}
        <div className="p-5 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center mb-4">
            <div className="bg-brand-blue/10 p-3 rounded-2xl mr-3 border border-brand-blue/20">
              <FileSpreadsheet className="w-6 h-6 text-brand-blue" />
            </div>
            <div>
              <h3 className="font-bold text-brand-blue text-lg">Confirmação da Base</h3>
              <p className="text-xs text-brand-slate font-medium">{fileName} • {previewData.length} linhas</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleCancel}
              className="flex-1 py-3.5 text-sm font-bold text-brand-slate bg-white border border-gray-300 rounded-xl active:bg-gray-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              className="flex-1 py-3.5 text-sm font-bold text-white bg-brand-blue rounded-xl shadow-lg shadow-brand-blue/20 active:scale-95 transition-all hover:bg-[#042440]"
            >
              Confirmar
            </button>
          </div>
        </div>

        {/* Excel-like Table */}
        <div className="flex-1 overflow-auto bg-white p-4">
          <div className="border border-gray-300 rounded-xl overflow-hidden">
            <table className="min-w-full text-xs text-left text-brand-slate font-medium">
              <thead className="text-brand-blue uppercase bg-gray-100 font-bold tracking-wider">
                <tr>
                  {columns.slice(0, 5).map((col) => (
                    <th key={col} className="px-4 py-3 border-b border-gray-300 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 20).map((row, index) => (
                  <tr key={index} className="bg-white border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    {columns.slice(0, 5).map((col) => (
                      <td key={`${index}-${col}`} className="px-4 py-3 whitespace-nowrap">
                        {row[col] !== undefined ? String(row[col]) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 20 && (
                <div className="p-4 text-center text-gray-500 text-xs italic bg-gray-50 border-t border-gray-200">
                    + {previewData.length - 20} linhas ocultas...
                </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in zoom-in duration-300">
      
      {/* Cards Visuais (Estáticos para Demo - Idealmente viriam do Estoque no futuro) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-3 bg-brand-blue/10 rounded-xl">
                <FileText className="w-6 h-6 text-brand-blue" />
            </div>
            <div>
                <p className="text-xs text-brand-slate font-bold uppercase">Base de Dados</p>
                <p className="text-sm font-bold text-brand-blue">Cadastros Operacionais</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                <Layers className="w-6 h-6 text-brand-green" />
            </div>
            <div>
                <p className="text-xs text-brand-slate font-bold uppercase">Estoque Insumos</p>
                <p className="text-sm font-bold text-brand-blue">Saldos & Reservas</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                <RefreshCw className="w-6 h-6 text-brand-yellow" />
            </div>
            <div>
                <p className="text-xs text-brand-slate font-bold uppercase">Sincronização</p>
                <p className="text-sm font-bold text-brand-blue">Automática (Cloud)</p>
            </div>
         </div>
      </div>

      <div className="relative mb-8 mt-4">
        <div className="absolute inset-0 bg-brand-blue blur-xl opacity-20 rounded-full"></div>
        <div className="relative bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
           {loading ? (
             <CloudDownload className="w-16 h-16 text-brand-blue animate-pulse" />
           ) : (
             <RefreshCw className="w-16 h-16 text-brand-blue" />
           )}
        </div>
      </div>
      
      <h2 className="text-2xl font-extrabold text-brand-blue mb-2 text-center">Sincronizar Sistema</h2>
      
      {loading ? (
        <div className="flex flex-col items-center mb-10 w-full max-w-xs">
           <p className="text-brand-slate text-center text-sm font-medium mb-2">
             {syncStatus || "Processando dados..."}
           </p>
           <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
             <div className="h-full bg-brand-blue animate-[loading_1.5s_ease-in-out_infinite]"></div>
           </div>
           <style>{`
             @keyframes loading {
               0% { width: 0%; margin-left: 0; }
               50% { width: 100%; margin-left: 0; }
               100% { width: 0%; margin-left: 100%; }
             }
           `}</style>
        </div>
      ) : (
        <p className="text-brand-slate text-center mb-8 max-w-xs text-sm leading-relaxed font-medium">
          Sincronize para baixar as últimas versões de Cadastros e Estoque de Insumos.
        </p>
      )}

      {/* Sync Button */}
      <button 
        onClick={loadCloudData}
        disabled={loading}
        className="mb-4 w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-gray-300 text-brand-blue font-bold rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        Sincronizar Tudo
      </button>

      <div className="relative flex items-center py-4 w-full max-w-xs">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="flex-shrink-0 mx-4 text-brand-slate text-xs font-bold uppercase tracking-wider">OU</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      <label 
          htmlFor="file-upload" 
          className={`group w-full max-w-xs h-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300
            ${loading 
              ? 'bg-gray-50 border-gray-300 opacity-50 cursor-wait' 
              : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-brand-blue active:scale-95 active:border-brand-blue'}
          `}
        >
          {loading ? (
             <span className="text-brand-slate font-bold text-sm">Aguarde...</span>
          ) : (
             <>
               <Upload className="w-6 h-6 text-brand-slate mb-2 group-hover:text-brand-blue transition-colors" />
               <span className="text-brand-slate font-bold text-sm group-hover:text-brand-blue">Upload Manual (Base)</span>
             </>
          )}
          <input 
            id="file-upload" 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
            onChange={handleFileUpload}
            disabled={loading}
            ref={fileInputRef}
          />
        </label>
        
        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center text-sm max-w-xs w-full animate-in slide-in-from-bottom-2 font-medium">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            {error}
          </div>
        )}
    </div>
  );
};

export default ImportView;