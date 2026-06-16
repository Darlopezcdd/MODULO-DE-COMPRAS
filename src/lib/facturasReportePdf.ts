import PDFDocument from 'pdfkit';

const COLORS = {
  primary: '#1E3A5F',
  secondary: '#2E86AB',
  accent: '#F0F4F8',
  white: '#FFFFFF',
  text: '#2D3748',
  textLight: '#718096',
  border: '#CBD5E0',
};

export async function generarReporteFacturasPDF(
  facturas: any[],
  filtros?: { estado?: string; fechaInicio?: string; fechaFin?: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const margin = 40;
    const contentW = pageW - margin * 2;
    const fechaGeneracion = new Date().toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' });

    // HEADER
    doc.rect(0, 0, pageW, 75).fill(COLORS.primary);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(20).text('MÓDULO DE COMPRAS', margin, 15);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.white).text('REPORTE DE FACTURAS', margin, 15, { align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor('#A0C4E8').text(`Generado: ${fechaGeneracion}`, margin, 36, { align: 'right' });
    doc.rect(0, 75, pageW, 4).fill(COLORS.secondary);

    let curY = 95;

    if (filtros?.estado || filtros?.fechaInicio) {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORS.textLight)
        .text(`Filtros aplicados: Estado = ${filtros.estado || 'Todos'} | Fechas = ${filtros.fechaInicio || 'N/A'} a ${filtros.fechaFin || 'N/A'}`, margin, curY);
      curY += 20;
    }

    if (facturas.length === 0) {
      doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.textLight).text('No se encontraron facturas con los filtros aplicados.', margin, curY);
    } else {
      facturas.forEach(f => {
        if (curY > doc.page.height - 100) { doc.addPage(); curY = 40; }
        
        doc.rect(margin, curY, contentW, 20).fill(COLORS.accent);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
           .text(`Factura: ${f.numero_factura}  |  Fecha: ${f.fecha?.toISOString().split('T')[0]}  |  Total: $${Number(f.total).toFixed(2)}  |  Estado: ${f.estado}`, margin + 5, curY + 5);
        curY += 25;

        if (f.productos && f.productos.length > 0) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.textLight);
          doc.text('Producto', margin + 10, curY);
          doc.text('Cant.', margin + 250, curY);
          doc.text('P. Unitario', margin + 300, curY);
          doc.text('Subtotal', margin + 370, curY);
          curY += 12;

          f.productos.forEach((p: any) => {
            if (curY > doc.page.height - 60) { doc.addPage(); curY = 40; }
            doc.font('Helvetica').fontSize(8).fillColor(COLORS.text);
            doc.text(p.producto_nombre, margin + 10, curY);
            doc.text(String(p.cantidad), margin + 250, curY);
            doc.text(`$${Number(p.pvp).toFixed(2)}`, margin + 300, curY);
            doc.text(`$${Number(p.total_linea).toFixed(2)}`, margin + 370, curY);
            curY += 12;
          });
        }
        curY += 10;
      });
    }

    doc.end();
  });
}
