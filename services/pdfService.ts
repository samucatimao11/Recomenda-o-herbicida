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
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    // Navy Blue: #052D51 -> [5, 45, 81]
    doc.setTextColor(5, 45, 81); 
    // CHANGE 1: New Title
    doc.text('Solicitação de KPI Herbicida', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    // Slate: #4B5F73 -> [75, 95, 115]
    doc.setTextColor(75, 95, 115);
    doc.text('Gestão Agrícola', 14, 26);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data da Recomendação: ${new Date(summary.date).toLocaleString('pt-BR')}`, 195, 20, { align: 'right' });

    // Farm Details Section (Expanded height to fit Op Data)
    // Very Light Green bg
    doc.setFillColor(244, 251, 231); // Closest light tint to #76B72A
    // Green Border: #76B72A -> [118, 183, 42]
    doc.setDrawColor(118, 183, 42); 
    doc.rect(14, 35, 182, 60, 'FD'); // Fill and Draw
    
    // --- LOCATION DATA ---
    doc.setFontSize(12);
    // Navy Blue text
    doc.setTextColor(5, 45, 81); 
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes do Local', 18, 42);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    // Left Column
    doc.text(`Fazenda: ${summary.farm}`, 18, 50);
    doc.text(`Unidade: ${summary.unit}`, 18, 56);
    doc.text(`Seção: ${summary.section}`, 18, 62);
    
    // Right Column
    doc.text(`Setor: ${summary.sector}`, 110, 50);
    doc.text(`Estágio de Corte: ${summary.cuttingStage}`, 110, 56);
    doc.text(`Área Total Selecionada: ${summary.totalArea.toFixed(2)} ha`, 110, 62);

    // --- OPERATIONAL DATA ---
    doc.setDrawColor(118, 183, 42); // Green border line
    doc.setLineWidth(0.5);
    doc.line(18, 66, 190, 66); // Separator

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 45, 81); // Navy Blue
    doc.text('Dados Operacionais', 18, 72);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    // Row 1
    doc.text(`Centro de Custos: ${summary.costCenter}`, 18, 79);
    doc.text(`Cód. Operação: ${summary.operationCode}`, 110, 79);
    
    // Row 2
    doc.text(`Vazão: ${summary.flowRate}`, 18, 85);
    doc.text(`Capacidade Tanque: ${summary.tankCapacity}`, 110, 85);

    // Row 3 (New)
    doc.text(`Encarregado: ${summary.supervisor}`, 18, 91);

    // Plots List (Shifted Y down to 105)
    const plotsData = summary.selectedPlots.map(plot => [
      String(plot.id),
      `${plot.area.toFixed(2)} ha`
    ]);

    autoTable(doc, {
      startY: 105, // Shifted down due to larger header
      head: [['Talhões Selecionados', 'Área Individual']],
      body: plotsData,
      theme: 'grid',
      // Green Header: #76B72A -> [118, 183, 42]
      headStyles: { fillColor: [118, 183, 42], textColor: 255, fontStyle: 'bold' }, 
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });

    // CHANGE 2: Warning Message if multiplier is not 1
    let nextY = (doc as any).lastAutoTable.finalY + 8;

    if (summary.areaFactor && summary.areaFactor !== 1) {
       doc.setFontSize(9);
       doc.setTextColor(220, 38, 38); // Red color for warning
       doc.setFont('helvetica', 'bold');
       doc.text(`Area dos talhões multiplicadas por ${summary.areaFactor}`, 14, nextY);
       nextY += 8; // Push next section down
    } else {
       // Regular spacing if no warning
       nextY += 2;
    }

    // Inputs Recommendation
    const inputsData = summary.inputs.map(input => {
      const totalQty = input.dose * summary.totalArea;
      return [
        input.name,
        `${input.dose} ${input.unit}`,
        totalQty.toFixed(2)
      ];
    });

    autoTable(doc, {
      startY: nextY,
      head: [['Insumo / Defensivo', 'Dose Aplicada', 'Quantidade Total']],
      body: inputsData,
      theme: 'striped',
      // Navy Blue Header: #052D51 -> [5, 45, 81]
      headStyles: { fillColor: [5, 45, 81], textColor: 255, fontStyle: 'bold' }, 
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: 14, right: 14 },
    });

    // Disclaimer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    // Yellow/Gold for Warning: #EABA00 -> [234, 186, 0]
    doc.setTextColor(200, 0, 0); 
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