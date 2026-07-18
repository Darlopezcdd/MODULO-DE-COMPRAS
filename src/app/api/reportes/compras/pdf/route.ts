import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
// ts-expect-error Ignorando tipado de pdfkit
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';

const COLORS = {
  primary: '#1E3A5F',
  secondary: '#2E86AB',
  light: '#F8FAFC',
  border: '#E2E8F0',
  textDark: '#1E293B',
  textLight: '#64748B',
  emerald: '#059669',
  amber: '#D97706',
};

const fmtM = (num: number) => `$${num.toFixed(2)}`;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const tipo = searchParams.get('tipo') || 'todas';
    const fechaParam = searchParams.get('fecha');

    let whereClause: any = {};
    let periodoStr = 'Histórico completo';

    if (fechaInicio && fechaFin) {
      const [y1, m1, d1] = fechaInicio.split('-').map(Number);
      const [y2, m2, d2] = fechaFin.split('-').map(Number);
      const startD = new Date(y1, m1 - 1, d1, 0, 0, 0);
      const endD = new Date(y2, m2 - 1, d2, 23, 59, 59, 999);
      whereClause = { fecha: { gte: startD, lte: endD } };
      periodoStr = `Del ${fechaInicio} al ${fechaFin}`;
    } else if (tipo !== 'todas' && fechaParam) {
      const [y, m, d] = fechaParam.split('-').map(Number);

      if (tipo === 'dia') {
        const start = new Date(y, m - 1, d, 0, 0, 0);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        whereClause = { fecha: { gte: start, lte: end } };
        periodoStr = `Día: ${start.toLocaleDateString('es-ES')}`;
      } else if (tipo === 'mes') {
        const start = new Date(y, m - 1, 1, 0, 0, 0);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        whereClause = { fecha: { gte: start, lte: end } };
        periodoStr = `Mes: ${start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
      } else if (tipo === 'anio') {
        const start = new Date(y, 0, 1, 0, 0, 0);
        const end = new Date(y, 11, 31, 23, 59, 59, 999);
        whereClause = { fecha: { gte: start, lte: end } };
        periodoStr = `Año: ${start.getFullYear()}`;
      }
    }

    const facturas = await prisma.facturas_compra.findMany({
      where: whereClause,
      orderBy: { fecha: 'desc' },
    });

    const proveedorIds = facturas.map((f: any) => f.proveedor_id);
    const proveedores = await prisma.proveedor.findMany({
      where: { id: { in: proveedorIds } },
      select: { id: true, nombre: true, cedulaRuc: true }
    });

    const facturasConProveedor = facturas.map((f: any) => {
      const prov = proveedores.find((p: any) => p.id === f.proveedor_id);
      return { ...f, proveedor: prov };
    });

    const totalGastado = facturas.reduce((sum: number, f: any) => sum + Number(f.total), 0);
    const totalEmitidas = facturas.filter((f: any) => f.estado === 'EMITIDA').length;
    const totalBorrador = facturas.filter((f: any) => f.estado === 'BORRADOR').length;

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
      doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.emerald)
         .text('REPORTE DE COMPRAS', margin, margin);
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.textLight)
         .text('MÓDULO DE COMPRAS - SISTEMA ADMINISTRATIVO', margin, margin + 26);
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.textLight)
         .text(`Generado el: ${new Date().toLocaleString('es-EC')}`, margin, margin + 40);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.textDark)
         .text(`Filtro: ${periodoStr}`, margin, margin + 54);

      doc.moveTo(margin, 108).lineTo(pageW - margin, 108).lineWidth(2).strokeColor(COLORS.secondary).stroke();

      // ── RESUMEN ──
      let curY = 120;
      doc.roundedRect(margin, curY, contentW, 50, 4).fillAndStroke(COLORS.light, COLORS.border);

      const summaryItems = [
        { label: 'TOTAL FACTURAS', value: `${facturas.length}`, color: COLORS.textDark },
        { label: 'INVERSIÓN TOTAL', value: fmtM(totalGastado), color: COLORS.emerald },
        { label: 'EMITIDAS', value: `${totalEmitidas}`, color: COLORS.emerald },
        { label: 'BORRADOR', value: `${totalBorrador}`, color: COLORS.amber },
      ];
      const sectionW = contentW / summaryItems.length;
      summaryItems.forEach((item, i) => {
        const sx = margin + sectionW * i;
        doc.font('Helvetica-Bold').fontSize(16).fillColor(item.color)
           .text(item.value, sx, curY + 8, { width: sectionW, align: 'center' });
        doc.font('Helvetica').fontSize(7).fillColor(COLORS.textLight)
           .text(item.label, sx, curY + 32, { width: sectionW, align: 'center' });
      });

      curY += 65;

      // ── TABLA ──
      const cols = [
        { h: 'FECHA', w: 70 },
        { h: 'N° FACTURA', w: 90 },
        { h: 'PROVEEDOR', w: 130 },
        { h: 'RUC', w: 85 },
        { h: 'ESTADO', w: 55 },
        { h: 'TOTAL', w: 85 },
      ];

      const drawHeader = (y: number) => {
        doc.rect(margin, y, contentW, 22).fill(COLORS.primary);
        let hx = margin;
        cols.forEach(c => {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
             .text(c.h, hx + 4, y + 7, { width: c.w - 8 });
          hx += c.w;
        });
        return y + 22;
      };

      curY = drawHeader(curY);

      // Filas
      facturasConProveedor.forEach((f: any, i: number) => {
        const rowH = 20;

        if (curY + rowH > doc.page.height - 60) {
          doc.addPage();
          curY = drawHeader(40);
        }

        const isEven = i % 2 === 0;
        doc.rect(margin, curY, contentW, rowH).fill(isEven ? '#FFFFFF' : COLORS.light);

        let cx = margin;

        // Fecha
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.textDark)
           .text(new Date(f.fecha).toLocaleDateString('es-ES'), cx + 4, curY + 6, { width: cols[0].w - 8 });
        cx += cols[0].w;

        // N° Factura
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.textDark)
           .text(f.numero_factura || '-', cx + 4, curY + 6, { width: cols[1].w - 8 });
        cx += cols[1].w;

        // Proveedor
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.textDark)
           .text(f.proveedor?.nombre || 'Desconocido', cx + 4, curY + 6, { width: cols[2].w - 8 });
        cx += cols[2].w;

        // RUC
        doc.font('Helvetica').fontSize(7).fillColor(COLORS.textLight)
           .text(f.proveedor?.cedulaRuc || '-', cx + 4, curY + 6, { width: cols[3].w - 8 });
        cx += cols[3].w;

        // Estado
        let estadoColor = COLORS.textLight;
        if (f.estado === 'EMITIDA') estadoColor = COLORS.emerald;
        else if (f.estado === 'BORRADOR') estadoColor = COLORS.amber;
        doc.font('Helvetica-Bold').fontSize(7).fillColor(estadoColor)
           .text(f.estado || '-', cx + 4, curY + 6, { width: cols[4].w - 8 });
        cx += cols[4].w;

        // Total
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.textDark)
           .text(fmtM(Number(f.total)), cx + 4, curY + 6, { width: cols[5].w - 8, align: 'right' });

        curY += rowH;
      });

      // Línea final
      doc.moveTo(margin, curY).lineTo(pageW - margin, curY).lineWidth(1).strokeColor(COLORS.border).stroke();

      if (facturas.length === 0) {
        curY += 30;
        doc.font('Helvetica').fontSize(12).fillColor(COLORS.textLight)
           .text('No hay facturas en el período seleccionado.', margin, curY, { width: contentW, align: 'center' });
      } else {
        // Total general
        curY += 10;
        const totW = 200;
        const totX = pageW - margin - totW;
        doc.roundedRect(totX, curY, totW, 35, 4).fillAndStroke(COLORS.light, COLORS.border);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.textDark)
           .text('TOTAL GENERAL:', totX + 10, curY + 11);
        doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.emerald)
           .text(fmtM(totalGastado), totX, curY + 8, { width: totW - 10, align: 'right' });
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
        'Content-Disposition': 'attachment; filename="Reporte_Compras.pdf"'
      }
    });

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
