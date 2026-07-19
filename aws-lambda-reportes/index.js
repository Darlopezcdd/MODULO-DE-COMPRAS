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
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(22).fillColor('#1E3A5F')
       .text('REPORTE DE COMPRAS (ASÍNCRONO)', 40, 40);
    
    doc.fontSize(12).text(`Se procesaron ${facturas.length} facturas.`, 40, 80);

    let y = 120;
    facturas.slice(0, 50).forEach(f => {
       doc.fontSize(10).fillColor('#000').text(`${f.fecha} | Factura: ${f.numero_factura} | Proveedor: ${f.proveedor_nombre} | Total: $${f.total}`, 40, y);
       y += 15;
    });

    if(facturas.length > 50) {
        doc.text(`... y ${facturas.length - 50} facturas más.`, 40, y + 10);
    }

    doc.end();
  });
}
