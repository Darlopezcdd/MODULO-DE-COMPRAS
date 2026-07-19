const PDFDocument = require('pdfkit');

const COLORS = {
  primary: '#1E3A5F',
  secondary: '#2E86AB',
  light: '#F8FAFC',
  border: '#E2E8F0',
  textDark: '#1E293B',
  textLight: '#64748B',
};

const fmtM = (num) => `$${Number(num).toFixed(2)}`;

async function generarFacturaPDF(datos) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const margin = 40;
    const contentW = pageW - margin * 2;

    // 1. ENCABEZADO
    doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.primary).text('FACTURA DE COMPRA', margin, margin);
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.textLight).text('MÓDULO DE COMPRAS - SISTEMA ADMINISTRATIVO', margin, margin + 28);
    
    const boxRightW = 200;
    const boxRightX = pageW - margin - boxRightW;
    doc.roundedRect(boxRightX, margin, boxRightW, 60, 4).lineWidth(1).strokeColor(COLORS.primary).stroke();
    
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text('N° DE FACTURA', boxRightX, margin + 8, { width: boxRightW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.textDark).text(datos.numeroFactura, boxRightX, margin + 24, { width: boxRightW, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.textLight).text(`FECHA EMISIÓN: ${datos.fechaEmision}`, boxRightX, margin + 45, { width: boxRightW, align: 'center' });
    
    doc.moveTo(margin, 120).lineTo(pageW - margin, 120).lineWidth(2).strokeColor(COLORS.secondary).stroke();

    // 2. DATOS PROVEEDOR
    let curY = 135;
    doc.roundedRect(margin, curY, contentW, 85, 4).fillAndStroke(COLORS.light, COLORS.border);
    
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary).text('DATOS DEL PROVEEDOR', margin + 15, curY + 12);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.textDark)
       .text('Razón Social:', margin + 15, curY + 30)
       .text('Cédula/RUC:', margin + 15, curY + 45)
       .text('Tipo de Pago:', margin + 15, curY + 60);
       
    doc.font('Helvetica').fillColor(COLORS.textDark)
       .text(datos.proveedor.nombre, margin + 90, curY + 30)
       .text(datos.proveedor.cedulaRuc, margin + 90, curY + 45)
       .text(datos.tipoPago, margin + 90, curY + 60);
       
    const col2X = margin + 250;
    doc.font('Helvetica-Bold').fillColor(COLORS.textDark).text('Dirección:', col2X, curY + 30);
    doc.font('Helvetica').fillColor(COLORS.textDark).text(datos.proveedor.direccion, col2X + 60, curY + 30, { width: 200 });

    const nextY = Math.max(curY + 45, doc.y + 5);
    doc.font('Helvetica-Bold').fillColor(COLORS.textDark).text('Teléfono:', col2X, nextY);
    doc.font('Helvetica').fillColor(COLORS.textDark).text(datos.proveedor.telefono || 'N/A', col2X + 60, nextY);

    curY += 105;

    // 3. PRODUCTOS
    const cols = [
      { h: 'CÓDIGO', w: 60, align: 'left' },
      { h: 'DESCRIPCIÓN', w: 180, align: 'left' },
      { h: 'CANT.', w: 40, align: 'center' },
      { h: 'V. UNITARIO', w: 70, align: 'right' },
      { h: 'IVA', w: 50, align: 'center' },
      { h: 'V. TOTAL', w: 90, align: 'right' },
    ];

    doc.rect(margin, curY, contentW, 25).fill(COLORS.primary);
    let cx = margin;
    cols.forEach(c => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF').text(c.h, cx + 5, curY + 8, { width: c.w - 10, align: c.align });
      cx += c.w;
    });
    curY += 25;

    (datos.productos || []).forEach((prod, i) => {
      const isEven = i % 2 === 0;
      const rowH = 20;
      if (curY + rowH > pageW - 120) { doc.addPage(); curY = 40; }

      doc.rect(margin, curY, contentW, rowH).fill(isEven ? '#FFFFFF' : COLORS.light);
      const vTotal = prod.cantidad * prod.pvp;
      
      cx = margin;
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.textDark);
      doc.text(prod.codigo, cx + 5, curY + 5, { width: cols[0].w - 10, align: cols[0].align }); cx += cols[0].w;
      doc.text(prod.descripcion, cx + 5, curY + 5, { width: cols[1].w - 10, align: cols[1].align }); cx += cols[1].w;
      doc.text(prod.cantidad.toString(), cx + 5, curY + 5, { width: cols[2].w - 10, align: cols[2].align }); cx += cols[2].w;
      doc.text(fmtM(prod.pvp), cx + 5, curY + 5, { width: cols[3].w - 10, align: cols[3].align }); cx += cols[3].w;
      const textIva = prod.grabaIva ? `${prod.porcentajeIva}%` : '0%';
      doc.text(textIva, cx + 5, curY + 5, { width: cols[4].w - 10, align: cols[4].align }); cx += cols[4].w;
      doc.text(fmtM(vTotal), cx + 5, curY + 5, { width: cols[5].w - 10, align: cols[5].align });
      
      curY += rowH;
    });

    doc.moveTo(margin, curY).lineTo(pageW - margin, curY).lineWidth(1).strokeColor(COLORS.border).stroke();

    // 4. TOTALES
    curY += 15;
    const totW = 200;
    const totX = pageW - margin - totW;
    if (curY + 100 > doc.page.height - 40) { doc.addPage(); curY = 40; }
    
    doc.roundedRect(totX, curY, totW, 85, 4).fillAndStroke(COLORS.light, COLORS.border);
    const dY = 18;
    let tY = curY + 10;
    
    const printTot = (label, val, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(COLORS.textDark)
         .text(label, totX + 10, tY)
         .text(fmtM(val), totX, tY, { width: totW - 10, align: 'right' });
      tY += dY;
    };

    printTot('Subtotal sin IVA:', datos.totales.subtotalSinIva);
    printTot('Subtotal con IVA:', datos.totales.subtotalConIva);
    printTot('IVA (15%):', datos.totales.totalIva);
    
    doc.moveTo(totX + 10, tY - 6).lineTo(totX + totW - 10, tY - 6).strokeColor(COLORS.border).stroke();
    
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary)
       .text('TOTAL A PAGAR:', totX + 10, tY)
       .text(fmtM(datos.totales.total), totX, tY, { width: totW - 10, align: 'right' });

    // PIE
    const pieY = doc.page.height - 50;
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLORS.textLight)
       .text('Documento generado automáticamente por el Sistema Módulo de Compras.', margin, pieY, { align: 'center', width: contentW })
       .text('No válido como comprobante tributario SRI. Uso exclusivamente interno.', margin, pieY + 12, { align: 'center', width: contentW });

    doc.end();
  });
}

exports.handler = async (event) => {
  try {
    let bodyStr = event.body;
    if (event.isBase64Encoded && bodyStr) {
        bodyStr = Buffer.from(bodyStr, 'base64').toString('utf8');
    }
    
    const datos = JSON.parse(bodyStr || '{}');

    if (!datos.numeroFactura) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Payload incompleto o inválido' })
      };
    }

    const pdfBuffer = await generarFacturaPDF(datos);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("Error en generación Lambda:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Internal Server Error: ${error.message}` })
    };
  }
};
