const functions = require('@google-cloud/functions-framework');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

// Configuração do Transporter (Gmail via OAuth2 recomendado para produção)
// Para testes rápidos, pode-se usar App Password, mas OAuth2 é o requisito 'Gmail API'.
// As credenciais devem estar nas Variáveis de Ambiente da Cloud Function.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER, // Seu email gmail
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN
  }
});

functions.http('sendRecommendationEmail', async (req, res) => {
  // Configuração CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { summaries, emailTo, emailSubject, emailBody } = req.body;

    if (!summaries || !emailTo) {
      return res.status(400).send('Dados incompletos');
    }

    // 1. Gerar o PDF em memória
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // --- Conteúdo do PDF (Simplificado para o Backend) ---
      doc.fontSize(18).fillColor('#166534').text('Smart Recomendação Agrícola', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).fillColor('black').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
      doc.moveDown(2);

      summaries.forEach((summary, index) => {
        if (index > 0) doc.addPage();

        doc.rect(50, doc.y, 500, 25).fill('#DCFCE7').stroke();
        doc.fillColor('#14532D').fontSize(12).font('Helvetica-Bold')
           .text(`Setor: ${summary.sector} - ${summary.farm}`, 60, doc.y - 18);
        
        doc.moveDown();
        doc.fillColor('black').fontSize(10).font('Helvetica');
        
        // Dados Operacionais
        doc.text(`Unidade: ${summary.unit} | Seção: ${summary.section}`);
        doc.text(`Centro de Custos: ${summary.costCenter}`);
        doc.text(`Operação: ${summary.operationCode} | Vazão: ${summary.flowRate} | Tanque: ${summary.tankCapacity}`);
        doc.moveDown();

        // Lista de Talhões
        doc.font('Helvetica-Bold').text('Talhões Selecionados:', { underline: true });
        doc.font('Helvetica').text(summary.selectedPlots.map(p => p.id).join(', '));
        doc.text(`Área Total: ${summary.totalArea.toFixed(2)} ha`);
        doc.moveDown();

        // Produtos
        doc.font('Helvetica-Bold').text('Recomendação de Produtos:', { underline: true });
        doc.moveDown(0.5);
        
        summary.inputs.forEach(input => {
           const total = (input.dose * summary.totalArea).toFixed(2);
           doc.font('Helvetica-Bold').text(`• ${input.name}`);
           doc.font('Helvetica').text(`   Dose: ${input.dose} ${input.unit} | Total: ${total} ${input.unit.split('/')[0]}`);
           doc.moveDown(0.5);
        });
        
        doc.moveDown(2);
      });

      doc.end();
    });

    // 2. Configurar o Email
    const mailOptions = {
      from: `Smart Agrícola <${process.env.EMAIL_USER}>`,
      to: emailTo, // Email informado pelo usuário
      cc: 'Samuel.franco11@hotmail.com', // Destinatário Fixo (Cópia conforme solicitado)
      subject: emailSubject || `Recomendação de Defensivos`,
      text: emailBody || 'Segue anexo o relatório técnico.',
      attachments: [
        {
          filename: 'Recomendacao_Tecnica.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    // 3. Enviar
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Email enviado com sucesso!' });

  } catch (error) {
    console.error('Erro no envio:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});