// @ts-expect-error Ignorando tipado de pdfkit por ahora
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';

export interface CatalogoItemPDF {
  codigo: string;
  nombre: string;
  stockActual: number;
  precioCompra: number;
}

export interface DatosCatalogoPDF {
  proveedor: {
    nombre: string;
    cedulaRuc: string;
    ciudad: string;
    direccion: string;
    telefono: string;
    email: string;
  };
  productos: CatalogoItemPDF[];
}

const COLORS = {
  primary: '#d10a11',
  secondary: '#706f6f',
  light: '#F5F5F5',
  border: '#D4D4D4',
  textDark: '#1A1A1A',
  textLight: '#706f6f',
  white: '#FFFFFF',
  accent: '#d10a11',
};

const fmtM = (num: number) => `$${num.toFixed(2)}`;

export async function generarCatalogoPDF(datos: DatosCatalogoPDF): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const margin = 40;
    const contentW = pageW - margin * 2;

    // ── 1. ENCABEZADO ──────────────────────────────────────────────────────

    // Título a la izquierda con ancho limitado para que no invada la caja de proveedor
    const titleMaxW = pageW - margin - 290;
    doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.primary)
       .text('CATÁLOGO DE PROVEEDOR', margin, margin, { width: titleMaxW });

    doc.font('Helvetica').fontSize(9).fillColor(COLORS.textLight)
       .text('MÓDULO DE COMPRAS — SISTEMA ADMINISTRATIVO', margin, margin + 70, { width: titleMaxW });

    // ── Caja de Proveedor (Derecha) ────────────────────────────────────────
    const boxW = 250;
    const boxX = pageW - margin - boxW;
    const boxY = margin;
    const boxH = 108;

    // Caja principal
    doc.roundedRect(boxX, boxY, boxW, boxH, 6)
       .lineWidth(1.5).strokeColor(COLORS.primary).fillColor(COLORS.white).fill()
       .stroke();

    // Header de la caja
    doc.save();
    doc.roundedRect(boxX, boxY, boxW, 22, 6)
       .fillColor(COLORS.primary).fill();
    doc.restore();

    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.white)
       .text('DATOS DEL PROVEEDOR', boxX, boxY + 6, { width: boxW, align: 'center' });

    // Nombre del proveedor (destacado)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.textDark)
       .text(datos.proveedor.nombre, boxX + 10, boxY + 28, { width: boxW - 20, align: 'left' });

    // Línea separadora
    doc.moveTo(boxX + 10, boxY + 45).lineTo(boxX + boxW - 10, boxY + 45)
       .lineWidth(0.5).strokeColor(COLORS.border).stroke();

    // Datos del proveedor en formato compacto
    const infoY = boxY + 50;
    const infoLines = [
      { label: 'RUC/Cédula:', value: datos.proveedor.cedulaRuc },
      { label: 'Dirección:',  value: datos.proveedor.direccion },
      { label: 'Ciudad:',     value: datos.proveedor.ciudad },
      { label: 'Teléfono:',   value: datos.proveedor.telefono },
      { label: 'Email:',      value: datos.proveedor.email },
    ];

    infoLines.forEach((line, idx) => {
      const y = infoY + idx * 10.5;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.textDark)
         .text(line.label, boxX + 10, y);
      doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.textLight)
         .text(line.value, boxX + 62, y, { width: boxW - 72 });
    });

    // ── Línea divisoria principal ──────────────────────────────────────────
    const headerEndY = Math.max(boxY + boxH, margin + 54) + 14;
    doc.moveTo(margin, headerEndY)
       .lineTo(pageW - margin, headerEndY)
       .lineWidth(2)
       .strokeColor(COLORS.secondary)
       .stroke();

    // ── 2. TABLA DE PRODUCTOS ──────────────────────────────────────────────
    let curY = headerEndY + 12;
    const cols = [
      { h: 'CÓDIGO',      w: 85,  align: 'left' as const },
      { h: 'PRODUCTO',    w: 240, align: 'left' as const },
      { h: 'STOCK G.',    w: 75,  align: 'center' as const },
      { h: 'P. COMPRA',   w: 110, align: 'right' as const },
    ];

    // Header de tabla con gradiente de color
    doc.rect(margin, curY, contentW, 24).fillColor(COLORS.primary).fill();
    let cx = margin;
    cols.forEach(c => {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.white)
         .text(c.h, cx + 6, curY + 7, { width: c.w - 12, align: c.align });
      cx += c.w;
    });
    curY += 24;

    datos.productos.forEach((prod, i) => {
      const isEven = i % 2 === 0;
      const rowH = 22;

      if (curY + rowH > doc.page.height - 60) {
        doc.addPage();
        // Repetir header de tabla en nueva página
        curY = 40;
        doc.rect(margin, curY, contentW, 24).fillColor(COLORS.primary).fill();
        cx = margin;
        cols.forEach(c => {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.white)
             .text(c.h, cx + 6, curY + 7, { width: c.w - 12, align: c.align });
          cx += c.w;
        });
        curY += 24;
      }

      // Fila
      doc.rect(margin, curY, contentW, rowH)
         .fill(isEven ? COLORS.white : COLORS.light).fill();

      // Borde inferior sutil
      doc.moveTo(margin, curY + rowH)
         .lineTo(pageW - margin, curY + rowH)
         .lineWidth(0.5)
         .strokeColor(COLORS.border)
         .stroke();

      cx = margin;

      // Código
      doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.textDark)
         .text(prod.codigo, cx + 6, curY + 6, { width: cols[0].w - 12, align: cols[0].align });
      cx += cols[0].w;

      // Nombre del producto
      doc.text(prod.nombre, cx + 6, curY + 6, { width: cols[1].w - 12, align: cols[1].align });
      cx += cols[1].w;

      // Stock
      doc.font('Helvetica').fillColor(COLORS.textDark)
         .text(prod.stockActual.toString(), cx + 6, curY + 6, { width: cols[2].w - 12, align: cols[2].align });
      cx += cols[2].w;

      // Precio (destacado)
      doc.font('Helvetica-Bold').fillColor(COLORS.secondary)
         .text(fmtM(prod.precioCompra), cx + 6, curY + 6, { width: cols[3].w - 12, align: cols[3].align });

      curY += rowH;
    });

    // Línea de cierre de tabla
    doc.moveTo(margin, curY)
       .lineTo(pageW - margin, curY)
       .lineWidth(1)
       .strokeColor(COLORS.primary)
       .stroke();

    // ── 3. PIE DE PÁGINA ────────────────────────────────────────────────────
    const pieY = doc.page.height - 50;
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(COLORS.textLight)
       .text(
         `Catálogo de precios acordados — generado el ${new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}`,
         margin,
         pieY,
         { align: 'center', width: contentW }
       );

    doc.end();
  });
}
