import React, { useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, Check, X, FileText, CloudDownload, RefreshCw } from 'lucide-react';
import { SpreadsheetRow } from '../types';

interface ImportViewProps {
  onDataLoaded: (data: SpreadsheetRow[]) => void;
}

const DEFAULT_DB_URL = "https://dkozrkzoghhylgvddkze.supabase.co/storage/v1/object/public/SMART%20CALDA/Cadastro_Envio%203%20(1)%20-%20Copia.xlsx";

const ImportView: React.FC<ImportViewProps> = ({ onDataLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<SpreadsheetRow[] | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Função centralizada para processar o buffer do arquivo
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

  // Função para carregar a planilha da nuvem
  const loadDefaultSheet = async () => {
    setLoading(true);
    setError(null);
    setPreviewData(null); // Limpa preview anterior se houver
    
    try {
      console.log("Iniciando download da base de dados...");
      const response = await fetch(DEFAULT_DB_URL);
      if (!response.ok) {
         throw new Error(`Erro HTTP: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      processExcelBuffer(buffer, "Base de Dados Padrão (Cloud)");
    } catch (err) {
      console.error("Falha no carregamento automático:", err);
      setError("Não foi possível sincronizar com a base de dados. Verifique sua conexão.");
      setLoading(false);
    }
  };

  // Carregamento automático ao montar o componente
  useEffect(() => {
    loadDefaultSheet();
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
      <div className="flex flex-col h-full bg-white animate-in slide-in-from-bottom-10 duration-500 rounded-t-3xl md:rounded-2xl shadow-up md:shadow-soft overflow-hidden">
        {/* Preview Header */}
        <div className="p-5 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-3 rounded-2xl mr-3 border border-green-200">
              <FileSpreadsheet className="w-6 h-6 text-green-800" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Confirmação</h3>
              <p className="text-xs text-gray-600 font-medium">{fileName} • {previewData.length} linhas</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleCancel}
              className="flex-1 py-3.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl active:bg-gray-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              className="flex-1 py-3.5 text-sm font-bold text-white bg-agro-700 rounded-xl shadow-lg shadow-agro-800/20 active:scale-95 transition-all hover:bg-agro-800"
            >
              Confirmar
            </button>
          </div>
        </div>

        {/* Excel-like Table */}
        <div className="flex-1 overflow-auto bg-white p-4">
          <div className="border border-gray-300 rounded-xl overflow-hidden">
            <table className="min-w-full text-xs text-left text-gray-700 font-medium">
              <thead className="text-gray-600 uppercase bg-gray-100 font-bold tracking-wider">
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
      
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-agro-300 blur-xl opacity-30 rounded-full"></div>
        <div className="relative bg-gradient-to-br from-agro-50 to-white p-6 rounded-3xl shadow-soft border border-agro-100">
           {loading ? (
             <CloudDownload className="w-16 h-16 text-agro-600 animate-pulse" />
           ) : (
             <FileText className="w-16 h-16 text-agro-600" />
           )}
        </div>
      </div>
      
      <h2 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">Base de Dados</h2>
      
      {loading ? (
        <div className="flex flex-col items-center mb-10">
           <p className="text-gray-500 text-center text-sm font-medium mb-2">
             Sincronizando com a base de dados...
           </p>
           <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
             <div className="h-full bg-agro-600 animate-[loading_1.5s_ease-in-out_infinite]"></div>
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
        <p className="text-gray-500 text-center mb-8 max-w-xs text-sm leading-relaxed font-medium">
          Sincronize para baixar a versão mais recente ou faça o upload manual.
        </p>
      )}

      {/* Sync Button */}
      <button 
        onClick={loadDefaultSheet}
        disabled={loading}
        className="mb-4 w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-agro-100 text-agro-700 font-bold rounded-2xl shadow-sm hover:bg-agro-50 hover:border-agro-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        Sincronizar Agora
      </button>

      <div className="relative flex items-center py-4 w-full max-w-xs">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">OU</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      <label 
          htmlFor="file-upload" 
          className={`group w-full max-w-xs h-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300
            ${loading 
              ? 'bg-gray-50 border-gray-300 opacity-50 cursor-wait' 
              : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-agro-400 active:scale-95 active:border-agro-600'}
          `}
        >
          {loading ? (
             <span className="text-gray-400 font-bold text-sm">Aguarde...</span>
          ) : (
             <>
               <Upload className="w-6 h-6 text-gray-400 mb-2 group-hover:text-agro-600 transition-colors" />
               <span className="text-gray-600 font-bold text-sm group-hover:text-agro-700">Upload Manual</span>
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