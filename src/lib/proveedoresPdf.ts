// src/lib/proveedoresPdf.ts
// Script de generación PDF — HU5: Reporte de Proveedores
// Librería: PDFKit (buffer-based, server-side)

// ts-expect-error Ignorando tipado de pdfkit
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
// ── Paleta de colores corporativa ─────────────────────────────────────────────
const COLORS = {
  primary:    '#1E3A5F',   // azul marino
  secondary:  '#2E86AB',   // azul acento
  accent:     '#F0F4F8',   // gris claro (filas alternas)
  white:      '#FFFFFF',
  text:       '#2D3748',
  textLight:  '#718096',
  success:    '#276749',   // verde para ACTIVO
  danger:     '#9B2335',   // rojo para INACTIVO
  border:     '#CBD5E0',
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ProveedorRow {
  id: number;
  cedulaRuc: string;
  nombre: string;
  ciudad: string;
  tipo: string;
  telefono: string;
  email: string;
  estado: string;
  saldo_pendiente?: number;
}

// ── Función principal ─────────────────────────────────────────────────────────
export async function generarReporteProveedoresPDF(
  proveedores: ProveedorRow[],
  filtros?: { estado?: string; tipo?: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',   // horizontal para que quepan todas las columnas
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const margin = 40;
    const contentW = pageW - margin * 2;
    const fechaGeneracion = new Date().toLocaleString('es-EC', {
      dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Guayaquil',
    });

    // ── ENCABEZADO ────────────────────────────────────────────────────────────
    // Banda superior azul marino
    doc.rect(0, 0, pageW, 75).fill(COLORS.primary);

    // Título principal
    doc
      .fillColor(COLORS.white)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('MÓDULO DE COMPRAS', margin, 15, { align: 'left' });

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#A0C4E8')
      .text('Sistema Administrativo Empresarial', margin, 38);

    // Título del reporte (derecha)
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(COLORS.white)
      .text('REPORTE DE PROVEEDORES', margin, 15, { align: 'right' });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#A0C4E8')
      .text(`Generado: ${fechaGeneracion}`, margin, 36, { align: 'right' });

    // Línea separadora acento
    doc.rect(0, 75, pageW, 4).fill(COLORS.secondary);

    // ── FILTROS APLICADOS ─────────────────────────────────────────────────────
    let curY = 90;
    if (filtros?.estado || filtros?.tipo) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(9)
        .fillColor(COLORS.textLight)
        .text(
          `Filtros aplicados: ${filtros.estado ? `Estado = ${filtros.estado}` : ''}${filtros.estado && filtros.tipo ? '  |  ' : ''}${filtros.tipo ? `Tipo = ${filtros.tipo}` : ''}`,
          margin, curY
        );
      curY += 18;
    }

    // ── CUADRO RESUMEN ESTADÍSTICO ────────────────────────────────────────────
    const activos   = proveedores.filter(p => p.estado === 'ACTIVO').length;
    const inactivos = proveedores.filter(p => p.estado === 'INACTIVO').length;
    const credito   = proveedores.filter(p => p.tipo === 'CREDITO').length;
    const contado   = proveedores.filter(p => p.tipo === 'CONTADO').length;

    const stats = [
      { label: 'Total Proveedores', value: String(proveedores.length), color: COLORS.primary },
      { label: 'Activos',           value: String(activos),            color: COLORS.success },
      { label: 'Inactivos',         value: String(inactivos),          color: COLORS.danger },
      { label: 'Tipo Crédito',      value: String(credito),            color: COLORS.secondary },
      { label: 'Tipo Contado',      value: String(contado),            color: '#805AD5' },
    ];

    const boxW = contentW / stats.length - 6;
    stats.forEach((s, i) => {
      const bx = margin + i * (boxW + 7);
      doc.roundedRect(bx, curY, boxW, 44, 4).fillAndStroke(COLORS.accent, COLORS.border);
      doc.font('Helvetica-Bold').fontSize(20).fillColor(s.color)
        .text(s.value, bx, curY + 5, { width: boxW, align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.textLight)
        .text(s.label, bx, curY + 28, { width: boxW, align: 'center' });
    });

    curY += 56;

    // ── TABLA DE PROVEEDORES ──────────────────────────────────────────────────
    // Definición de columnas
    const cols = [
      { header: '#',          key: 'idx',       w: 28,  align: 'center' as const },
      { header: 'Cédula/RUC', key: 'cedulaRuc', w: 85,  align: 'left'   as const },
      { header: 'Nombre',     key: 'nombre',    w: 135, align: 'left'   as const },
      { header: 'Ciudad',     key: 'ciudad',    w: 60,  align: 'left'   as const },
      { header: 'Tipo',       key: 'tipo',      w: 58,  align: 'center' as const },
      { header: 'Teléfono',   key: 'telefono',  w: 75,  align: 'left'   as const },
      { header: 'Email',      key: 'email',     w: 135, align: 'left'   as const },
      { header: 'Saldo Cr.',  key: 'saldo',     w: 65,  align: 'right'  as const },
      { header: 'Estado',     key: 'estado',    w: 55,  align: 'center' as const },
    ];

    const rowH = 18;
    const headerH = 22;

    // Cabecera de tabla
    doc.rect(margin, curY, contentW, headerH).fill(COLORS.primary);
    let cx = margin;
    cols.forEach(col => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(COLORS.white)
        .text(col.header, cx + 4, curY + 6, { width: col.w - 8, align: col.align });
      cx += col.w;
    });

    curY += headerH;

    // Filas de datos
    if (proveedores.length === 0) {
      doc.rect(margin, curY, contentW, rowH).fill(COLORS.accent);
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORS.textLight)
        .text('No se encontraron proveedores con los filtros aplicados.', margin + 4, curY + 5, { width: contentW });
      curY += rowH;
    } else {
      proveedores.forEach((prov, idx) => {
        // Control de página
        if (curY + rowH > doc.page.height - 55) {
          doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
          // Repetir cabecera en nueva página
          doc.rect(margin, 40, contentW, headerH).fill(COLORS.primary);
          cx = margin;
          cols.forEach(col => {
            doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.white)
              .text(col.header, cx + 4, 46, { width: col.w - 8, align: col.align });
            cx += col.w;
          });
          curY = 40 + headerH;
        }

        const isEven = idx % 2 === 0;
        doc.rect(margin, curY, contentW, rowH).fill(isEven ? COLORS.white : COLORS.accent);

        cx = margin;
        const rowData: Record<string, string> = {
          idx:       String(idx + 1),
          cedulaRuc: prov.cedulaRuc,
          nombre:    prov.nombre,
          ciudad:    prov.ciudad,
          tipo:      prov.tipo,
          telefono:  prov.telefono,
          email:     prov.email,
          saldo:     prov.saldo_pendiente ? `$${prov.saldo_pendiente.toFixed(2)}` : 'Sin saldo',
          estado:    prov.estado,
        };

        cols.forEach(col => {
          const val = rowData[col.key] || '';
          const color =
            col.key === 'estado' && val === 'ACTIVO'   ? COLORS.success :
            col.key === 'estado' && val === 'INACTIVO' ? COLORS.danger  :
            col.key === 'tipo'   && val === 'CREDITO'  ? COLORS.secondary :
            COLORS.text;

          const isBold = col.key === 'estado' || col.key === 'tipo';
          doc
            .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(7.5)
            .fillColor(color)
            .text(val, cx + 4, curY + 5, { width: col.w - 8, align: col.align, ellipsis: true });
          cx += col.w;
        });

        // Línea horizontal separadora
        doc.moveTo(margin, curY + rowH).lineTo(margin + contentW, curY + rowH)
          .strokeColor(COLORS.border).lineWidth(0.3).stroke();

        curY += rowH;
      });
    }

    // Borde exterior de tabla
    doc.rect(margin, curY - (proveedores.length || 1) * rowH - headerH, contentW,
      (proveedores.length || 1) * rowH + headerH)
      .strokeColor(COLORS.border).lineWidth(0.5).stroke();

    // ── PIE DE PÁGINA ─────────────────────────────────────────────────────────
    // const pageCount = (doc as any)._pageBuffer?.length ?? 1;
    const footerY = doc.page.height - 30;
    doc.rect(0, footerY - 8, pageW, 38).fill(COLORS.primary);
    doc.font('Helvetica').fontSize(8).fillColor('#A0C4E8')
      .text(
        `Módulo de Compras · Reporte de Proveedores · Generado el ${fechaGeneracion}`,
        margin, footerY,
        { align: 'left', width: contentW }
      );
    doc.font('Helvetica').fontSize(8).fillColor('#A0C4E8')
      .text(`Total registros: ${proveedores.length}`, margin, footerY, {
        align: 'right', width: contentW,
      });

    doc.end();
  });
}
