const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Inicializar clientes AWS
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
  console.log("Iniciando procesamiento de SQS:", JSON.stringify(event));

  // 1. Extraer payload del mensaje SQS
  for (const record of event.Records) {
    const msgId = record.messageId; // Usamos el ID del mensaje SQS como identificador del PDF
    const body = JSON.parse(record.body);
    const { tipoReporte, filtros, emailDestino } = body;

    console.log(`Procesando reporte ${msgId} para:`, emailDestino);

    // 2. Conectar a la base de datos para obtener los datos
    const dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    await dbClient.connect();

    try {
      // (Aquí deberías añadir la lógica exacta de filtrado como en route.ts, 
      //  por simplificación obtenemos todas las facturas o filtramos de manera simple)
      let query = 'SELECT f.*, p.nombre as proveedor_nombre, p."cedulaRuc" as proveedor_ruc FROM facturas_compra f LEFT JOIN "Proveedor" p ON f.proveedor_id = p.id';
      
      const { rows: facturas } = await dbClient.query(query);

      // 3. Generar el PDF
      const pdfBuffer = await generarPDF(facturas);

      // 4. Escribir el PDF en EFS
      // La Lambda debe tener configurado EFS y montado en EFS_MOUNT_PATH (ej. /mnt/efs/reports)
      const efsMountPath = process.env.EFS_MOUNT_PATH || '/mnt/efs/reports';
      
      // Asegurarse de que el directorio exista
      if (!fs.existsSync(efsMountPath)){
          fs.mkdirSync(efsMountPath, { recursive: true });
      }

      const filePath = path.join(efsMountPath, `${msgId}.pdf`);
      fs.writeFileSync(filePath, pdfBuffer);
      console.log(`PDF guardado exitosamente en EFS: ${filePath}`);

      // 5. Subir a S3
      const bucketName = process.env.S3_REPORT_BUCKET || 'reporte-compras-pdf';
      const s3Key = `reportes/${msgId}.pdf`;
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }));
      console.log(`PDF subido a S3: ${bucketName}/${s3Key}`);

      // 6. Enviar correo por SES
      const senderEmail = process.env.SES_SENDER || 'hidalgoesau27@gmail.com';
      await enviarCorreo(senderEmail, emailDestino, msgId);
      console.log(`Correo enviado a: ${emailDestino}`);

    } catch (error) {
      console.error('Error durante el procesamiento del reporte:', error);
      throw error; // Lanzar el error hace que el mensaje vuelva a la cola si falla
    } finally {
      await dbClient.end();
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

    // Tabla simple
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

// Función auxiliar para enviar email usando SES
async function enviarCorreo(sender, destinatario, msgId) {
  // Nota: AWS SES sendEmail básico no soporta adjuntos directos de forma sencilla.
  // Para adjuntos se usa SendRawEmail (requiere construir el MIME multipart).
  // Por simplicidad en este ejemplo de Lambda, enviamos un aviso con instrucciones.
  // Si necesitas enviar el archivo directamente adjunto usando node-mailer, debes añadir 'nodemailer'.
  
  const params = {
    Source: sender,
    Destination: { ToAddresses: [destinatario] },
    Message: {
      Subject: { Data: 'Tu Reporte de Compras PDF está listo' },
      Body: {
        Text: { Data: `Hola,\n\nTu reporte de facturas ha sido procesado correctamente.\nEl ID de seguimiento es: ${msgId}\n\nYa puedes acceder al sistema y descargar o imprimir el archivo.\n\nSaludos,\nSistema de Compras UTN` }
      }
    }
  };

  return sesClient.send(new SendEmailCommand(params));
}
