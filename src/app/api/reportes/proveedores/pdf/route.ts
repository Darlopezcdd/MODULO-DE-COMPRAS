import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
// @ts-expect-error Ignorando tipado de pdfkit
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';

const COLORS = {
  primary: '#1E3A5F',
  secondary: '#2E86AB',
  light: '#F8FAFC',
  border: '#E2E8F0',
  textDark: '#1E293B',
  textLight: '#64748B',
  emerald: '#059669',
  red: '#DC2626',
};

export async function GET() {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' },
    });

    const totalActivos = proveedores.filter((p: any) => p.estado === 'ACTIVO').length;
    const totalInactivos = proveedores.length - totalActivos;

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const margin = 40;
      const contentW = pageW - margin * 2;

      // ── ENCABEZADO ──
      doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.primary)
         .text('DIRECTORIO DE PROVEEDORES', margin, margin);
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.textLight)
         .text('MÓDULO DE COMPRAS - SISTEMA ADMINISTRATIVO', margin, margin + 26);
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.textLight)
         .text(`Generado el: ${new Date().toLocaleString('es-EC')}`, margin, margin + 40);

      doc.moveTo(margin, 95).lineTo(pageW - margin, 95).lineWidth(2).strokeColor(COLORS.secondary).stroke();

      // ── RESUMEN ──
      let curY = 110;
      doc.roundedRect(margin, curY, contentW, 50, 4).fillAndStroke(COLORS.light, COLORS.border);

      const summaryItems = [
        { label: 'TOTAL REGISTRADOS', value: `${proveedores.length}`, color: COLORS.textDark },
        { label: 'ACTIVOS', value: `${totalActivos}`, color: COLORS.emerald },
        { label: 'INACTIVOS', value: `${totalInactivos}`, color: COLORS.red },
      ];
      const sectionW = contentW / summaryItems.length;
      summaryItems.forEach((item, i) => {
        const sx = margin + sectionW * i;
        doc.font('Helvetica-Bold').fontSize(18).fillColor(item.color)
           .text(item.value, sx, curY + 8, { width: sectionW, align: 'center' });
        doc.font('Helvetica').fontSize(7).fillColor(COLORS.textLight)
           .text(item.label, sx, curY + 32, { width: sectionW, align: 'center' });
      });

      curY += 65;

      // ── TABLA ──
      const cols = [
        { h: 'CÉDULA/RUC', w: 90 },
        { h: 'RAZÓN SOCIAL', w: 140 },
        { h: 'CIUDAD', w: 80 },
        { h: 'TELÉFONO', w: 80 },
        { h: 'TIPO', w: 60 },
        { h: 'ESTADO', w: 65 },
      ];

      // Cabecera
      doc.rect(margin, curY, contentW, 22).fill(COLORS.primary);
      let cx = margin;
      cols.forEach(c => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
           .text(c.h, cx + 4, curY + 7, { width: c.w - 8 });
        cx += c.w;
      });
      curY += 22;

      // Filas
      proveedores.forEach((p: any, i: number) => {
        const rowH = 20;

        if (curY + rowH > doc.page.height - 60) {
          doc.addPage();
          curY = 40;
          // Re-dibujar cabecera
          doc.rect(margin, curY, contentW, 22).fill(COLORS.primary);
          let hx = margin;
          cols.forEach(c => {
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
               .text(c.h, hx + 4, curY + 7, { width: c.w - 8 });
            hx += c.w;
          });
          curY += 22;
        }

        const isEven = i % 2 === 0;
        doc.rect(margin, curY, contentW, rowH).fill(isEven ? '#FFFFFF' : COLORS.light);

        cx = margin;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.textDark)
           .text(p.cedulaRuc || '-', cx + 4, curY + 6, { width: cols[0].w - 8 });
        cx += cols[0].w;

        doc.font('Helvetica').fontSize(8).fillColor(COLORS.textDark)
           .text(p.nombre || '-', cx + 4, curY + 6, { width: cols[1].w - 8 });
        cx += cols[1].w;

        doc.font('Helvetica').fontSize(8).fillColor(COLORS.textDark)
           .text(p.ciudad || '-', cx + 4, curY + 6, { width: cols[2].w - 8 });
        cx += cols[2].w;

        doc.font('Helvetica').fontSize(8).fillColor(COLORS.textDark)
           .text(p.telefono || '-', cx + 4, curY + 6, { width: cols[3].w - 8 });
        cx += cols[3].w;

        const tipoColor = p.tipo === 'CREDITO' ? '#1e40af' : '#92400e';
        doc.font('Helvetica-Bold').fontSize(7).fillColor(tipoColor)
           .text(p.tipo || '-', cx + 4, curY + 6, { width: cols[4].w - 8 });
        cx += cols[4].w;

        const estadoColor = p.estado === 'ACTIVO' ? COLORS.emerald : COLORS.red;
        doc.font('Helvetica-Bold').fontSize(7).fillColor(estadoColor)
           .text(p.estado || '-', cx + 4, curY + 6, { width: cols[5].w - 8 });

        curY += rowH;
      });

      // Línea final
      doc.moveTo(margin, curY).lineTo(pageW - margin, curY).lineWidth(1).strokeColor(COLORS.border).stroke();

      if (proveedores.length === 0) {
        curY += 30;
        doc.font('Helvetica').fontSize(12).fillColor(COLORS.textLight)
           .text('No hay proveedores registrados.', margin, curY, { width: contentW, align: 'center' });
      }

      // ── PIE DE PÁGINA ──
      const pieY = doc.page.height - 50;
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLORS.textLight)
         .text('Documento generado automáticamente por el Sistema Módulo de Compras.', margin, pieY, { align: 'center', width: contentW })
         .text('No válido como comprobante tributario SRI. Uso exclusivamente interno.', margin, pieY + 12, { align: 'center', width: contentW });

      doc.end();
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Reporte_Proveedores.pdf"'
      }
    });

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
