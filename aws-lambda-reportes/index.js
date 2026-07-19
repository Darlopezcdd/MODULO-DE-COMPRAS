const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Inicializar clientes AWS
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
  console.log("Iniciando procesamiento de SQS:", JSON.stringify(event));

  for (const record of event.Records) {
    const msgId = record.messageId; 
    const body = JSON.parse(record.body);
    const { emailDestino, datosFacturas } = body;

    console.log(`Procesando reporte ${msgId} para:`, emailDestino);

    try {
      const facturas = datosFacturas || [];
      console.log(`Generando PDF con ${facturas.length} facturas recibidas...`);
      const pdfBuffer = await generarPDF(facturas);

      // Guardar en /tmp para S3 (ya no usamos EFS)
      const efsMountPath = process.env.EFS_MOUNT_PATH || '/tmp/reports';
      if (!fs.existsSync(efsMountPath)){
          fs.mkdirSync(efsMountPath, { recursive: true });
      }
      const filePath = path.join(efsMountPath, `${msgId}.pdf`);
      fs.writeFileSync(filePath, pdfBuffer);

      // Subir a S3 usando el BUCKET CORRECTO (termina en 946... en vez de 646...)
      const bucketName = process.env.S3_REPORT_BUCKET || 'compras-facturas-erp-946445280288';
      const s3Key = `reportes/${msgId}.pdf`;
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }));
      console.log(`PDF subido exitosamente a S3: ${bucketName}/${s3Key}`);

      // EL ENVÍO DE CORREO HA SIDO ELIMINADO PARA SIMPLIFICAR

    } catch (error) {
      console.error('Error durante el procesamiento del reporte:', error);
      throw error;
    }
  }

  return { statusCode: 200, body: 'Procesamiento completo' };
};

// Función auxiliar para generar PDF
async function generarPDF(facturas) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryColor = '#1E3A5F'; // Azul oscuro elegante
    const secondaryColor = '#475569'; // Gris oscuro
    const accentColor = '#3B82F6'; // Azul claro para detalles
    
    // Función para dibujar el encabezado
    const drawHeader = () => {
      // Franja de color superior
      doc.rect(0, 0, doc.page.width, 10).fill(primaryColor);
      
      doc.font('Helvetica-Bold').fontSize(26).fillColor(primaryColor)
         .text('REPORTE DE COMPRAS', 50, 50);
      
      const currentDate = new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });
      
      doc.font('Helvetica').fontSize(10).fillColor(secondaryColor)
         .text(`Fecha de emisión: ${currentDate}`, 50, 80);
         
      doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor)
         .text('Sistema de Compras UTN', 50, 95);
      
      // Línea divisoria
      doc.moveTo(50, 120).lineTo(doc.page.width - 50, 120).lineWidth(1).stroke(accentColor);
      
      // Resumen
      doc.rect(50, 135, doc.page.width - 100, 30).fill('#F1F5F9');
      doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor)
         .text(`Total de facturas procesadas: ${facturas.length}`, 60, 145);
         
      return 190; // Retorna la posición Y donde debe iniciar la tabla
    };

    let currentY = drawHeader();

    // Configuración de la tabla
    const tableTop = currentY;
    const itemX = 50;
    const dateX = 150;
    const providerX = 250;
    const amountX = 450;

    const drawTableHeader = (y) => {
      doc.rect(50, y, doc.page.width - 100, 25).fill(primaryColor);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF');
      doc.text('Nº FACTURA', itemX + 10, y + 8);
      doc.text('FECHA', dateX, y + 8);
      doc.text('PROVEEDOR', providerX, y + 8);
      doc.text('TOTAL', amountX, y + 8, { width: 90, align: 'right' });
      return y + 25;
    };

    currentY = drawTableHeader(currentY);

    // Dibujar filas de la tabla
    doc.font('Helvetica').fontSize(10);
    
    let totalAmount = 0;
    
    facturas.forEach((f, i) => {
      totalAmount += Number(f.total) || 0;
      
      // Control de paginación
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = drawHeader();
        currentY = drawTableHeader(currentY);
        doc.font('Helvetica').fontSize(10);
      }

      // Fondo intercalado para filas (Cebra)
      if (i % 2 === 0) {
        doc.rect(50, currentY, doc.page.width - 100, 20).fill('#F8FAFC');
      }
      
      doc.fillColor(secondaryColor);
      doc.text(f.numero_factura || 'N/A', itemX + 10, currentY + 5);
      doc.text(f.fecha || 'N/A', dateX, currentY + 5);
      
      // Truncar nombre del proveedor si es muy largo
      let providerName = f.proveedor_nombre || 'N/A';
      if (providerName.length > 30) providerName = providerName.substring(0, 27) + '...';
      doc.text(providerName, providerX, currentY + 5);
      
      doc.text(`$${Number(f.total || 0).toFixed(2)}`, amountX, currentY + 5, { width: 90, align: 'right' });

      currentY += 20;
    });

    // Línea de cierre de tabla
    doc.moveTo(50, currentY).lineTo(doc.page.width - 50, currentY).lineWidth(1).stroke(primaryColor);
    
    // Total General
    currentY += 15;
    if (currentY > doc.page.height - 100) {
      doc.addPage();
      currentY = 50;
    }
    
    doc.rect(doc.page.width - 250, currentY, 200, 30).fill('#F1F5F9');
    doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor)
       .text('TOTAL GENERAL:', doc.page.width - 240, currentY + 10);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(accentColor)
       .text(`$${totalAmount.toFixed(2)}`, doc.page.width - 150, currentY + 9, { width: 90, align: 'right' });

    // Pie de página
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(8).fillColor('#94A3B8')
         .text(
           `Página ${i + 1} de ${pages.count}`,
           50,
           doc.page.height - 40,
           { align: 'center', width: doc.page.width - 100 }
         );
    }

    doc.end();
  });
}
