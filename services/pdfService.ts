import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RecommendationSummary } from '../types';

export const generateRecommendationPDF = (summaries: RecommendationSummary[]): jsPDF => {
  const doc = new jsPDF();

  summaries.forEach((summary, index) => {
    // Add new page for subsequent sectors
    if (index > 0) {
      doc.addPage();
    }

    // Header
    doc.setFontSize(18);
    doc.setTextColor(22, 101, 52); // Green-800
    doc.text('Smart Recomendação Agrícola', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data da Recomendação: ${new Date(summary.date).toLocaleString('pt-BR')}`, 14, 28);

    // Farm Details Section (Expanded height to fit Op Data)
    doc.setFillColor(220, 252, 231); // Green-100
    doc.rect(14, 35, 182, 55, 'F'); // Height increased from 35 to 55
    
    // --- LOCATION DATA ---
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes do Local', 18, 42);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Left Column
    doc.text(`Fazenda: ${summary.farm}`, 18, 50);
    doc.text(`Unidade: ${summary.unit}`, 18, 56);
    doc.text(`Seção: ${summary.section}`, 18, 62);
    
    // Right Column
    doc.text(`Setor: ${summary.sector}`, 110, 50);
    doc.text(`Estágio de Corte: ${summary.cuttingStage}`, 110, 56);
    doc.text(`Área Total Selecionada: ${summary.totalArea.toFixed(2)} ha`, 110, 62);

    // --- OPERATIONAL DATA ---
    doc.setDrawColor(22, 163, 74); // Green border line
    doc.line(18, 66, 190, 66); // Separator

    doc.setFont('helvetica', 'bold');
    doc.text('Dados Operacionais', 18, 72);
    doc.setFont('helvetica', 'normal');

    // Row 1
    doc.text(`Centro de Custos: ${summary.costCenter}`, 18, 79);
    doc.text(`Cód. Operação: ${summary.operationCode}`, 110, 79);
    
    // Row 2
    doc.text(`Vazão: ${summary.flowRate}`, 18, 85);
    doc.text(`Capacidade Tanque: ${summary.tankCapacity}`, 110, 85);

    // Plots List (Shifted Y down to 100)
    const plotsData = summary.selectedPlots.map(plot => [
      String(plot.id),
      `${plot.area.toFixed(2)} ha`
    ]);

    autoTable(doc, {
      startY: 100, // Shifted down due to larger header
      head: [['Talhões Selecionados', 'Área Individual']],
      body: plotsData,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] }, // Green-600
      margin: { left: 14, right: 14 },
    });

    // Inputs Recommendation
    const currentY = (doc as any).lastAutoTable.finalY + 10;
    
    const inputsData = summary.inputs.map(input => {
      const totalQty = input.dose * summary.totalArea;
      return [
        input.name,
        `${input.dose} ${input.unit}`,
        totalQty.toFixed(2)
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Insumo / Defensivo', 'Dose Aplicada', 'Quantidade Total']],
      body: inputsData,
      theme: 'striped',
      headStyles: { fillColor: [21, 128, 61] }, // Green-700
      margin: { left: 14, right: 14 },
    });

    // Disclaimer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.setTextColor(200, 0, 0); // Red
    doc.setFont('helvetica', 'bolditalic');
    doc.text(
      'AVISO: Esta recomendação é uma ferramenta de apoio à decisão e não substitui o receituário agronômico.',
      105,
      finalY,
      { align: 'center' }
    );
    
    // Footer Page Number
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${index + 1} de ${summaries.length}`, 195, 290, { align: 'right' });
  });

  return doc;
};