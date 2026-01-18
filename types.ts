// Represents a raw row from the Excel/CSV file.
// We use a flexible record because columns must be read exactly as is.
export type SpreadsheetRow = Record<string, any>;

export interface AgriculturalInput {
  id: string;
  name: string;
  dose: number;
  unit: string;
}

export interface SelectedPlot {
  id: string | number; // Talhão identifier
  area: number; // Área (ha)
}

export interface RecommendationSummary {
  id: string;
  date: string;
  sector: string | number;
  farm: string;
  unit: string;
  section: string;
  cuttingStage: string;
  selectedPlots: SelectedPlot[];
  totalArea: number;
  inputs: AgriculturalInput[];
  
  // Operational Fields
  costCenter: string;
  operationCode: string;
  flowRate: string;
  tankCapacity: string;
  supervisor: string; // Novo campo
  
  // Multiplier logic
  areaFactor?: number;
}

export type ViewState = 'IMPORT' | 'NEW_RECOMMENDATION' | 'HISTORY' | 'SUCCESS_SENT';