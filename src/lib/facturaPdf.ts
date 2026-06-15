// src/lib/facturaPdf.ts
// HU4 — Script base de generación de PDF de Factura de Compra (Tarea: Aldahir Requene)
// Usa PDFKit para generar el documento como Buffer (Server-side)

// @ts-ignore
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';

// ── Tipos de Datos (Estructura esperada por el template) ─────────────────────
export interface DatosProveedorPDF {
  nombre: string;
  cedulaRuc: string;
  direccion: string;
  telefono: string;
}

export interface DetalleProductoPDF {
  codigo: string;
  descripcion: string;
  cantidad: number;
  pvp: number;
  grabaIva: boolean;
  porcentajeIva: number;
}

export interface DatosFacturaPDF {
  numeroFactura: string;
  fechaEmision: string;
  tipoPago: 'CONTADO' | 'CREDITO';
  proveedor: DatosProveedorPDF;
  productos: DetalleProductoPDF[];
  totales: {
    subtotalSinIva: number;
    subtotalConIva: number;
    totalIva: number;
    total: number;
  };
}

// ── Paleta y Helpers ─────────────────────────────────────────────────────────
const COLORS = {
  primary: '#1E3A5F',   // Azul marino corporativo
  secondary: '#2E86AB', // Azul acento
  light: '#F8FAFC',     // Gris muy claro
  border: '#E2E8F0',    // Borde
  textDark: '#1E293B',
  textLight: '#64748B',
};

const fmtM = (num: number) => `$${num.toFixed(2)}`;

// ── Función Generadora ────────────────────────────────────────────────────────
export async function generarFacturaPDF(datos: DatosFacturaPDF): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Configuración del documento
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

    // ==========================================
    // 1. ENCABEZADO DE LA FACTURA
    // ==========================================
    
    // Título Superior
    doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.primary)
       .text('FACTURA DE COMPRA', margin, margin);
       
    // Subtítulo / Datos de la empresa (Ejemplo genérico)
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.textLight)
       .text('MÓDULO DE COMPRAS - SISTEMA ADMINISTRATIVO', margin, margin + 28);
    
    // Cuadro de Número y Fecha (Derecha)
    const boxRightW = 200;
    const boxRightX = pageW - margin - boxRightW;
    doc.roundedRect(boxRightX, margin, boxRightW, 60, 4)
       .lineWidth(1).strokeColor(COLORS.primary).stroke();
       
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary)
       .text('N° DE FACTURA', boxRightX, margin + 8, { width: boxRightW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.textDark)
       .text(datos.numeroFactura, boxRightX, margin + 24, { width: boxRightW, align: 'center' });
    
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.textLight)
       .text(`FECHA EMISIÓN: ${datos.fechaEmision}`, boxRightX, margin + 45, { width: boxRightW, align: 'center' });

    // Línea separadora
    doc.moveTo(margin, 120).lineTo(pageW - margin, 120).lineWidth(2).strokeColor(COLORS.secondary).stroke();

    // ==========================================
    // 2. DATOS DEL PROVEEDOR
    // ==========================================
    let curY = 135;
    doc.roundedRect(margin, curY, contentW, 75, 4).fillAndStroke(COLORS.light, COLORS.border);
    
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary)
       .text('DATOS DEL PROVEEDOR', margin + 15, curY + 12);
       
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.textDark)
       .text('Razón Social:', margin + 15, curY + 30)
       .text('Cédula/RUC:', margin + 15, curY + 45)
       .text('Tipo de Pago:', margin + 15, curY + 60);
       
    doc.font('Helvetica').fillColor(COLORS.textDark)
       .text(datos.proveedor.nombre, margin + 90, curY + 30)
       .text(datos.proveedor.cedulaRuc, margin + 90, curY + 45)
       .text(datos.tipoPago, margin + 90, curY + 60);
       
    // Segunda columna proveedor
    const col2X = margin + 250;
    doc.font('Helvetica-Bold').fillColor(COLORS.textDark)
       .text('Dirección:', col2X, curY + 30)
       .text('Teléfono:', col2X, curY + 45);
       
    doc.font('Helvetica').fillColor(COLORS.textDark)
       .text(datos.proveedor.direccion, col2X + 60, curY + 30, { width: 200 })
       .text(datos.proveedor.telefono || 'N/A', col2X + 60, curY + 45);

    curY += 95;

    // ==========================================
    // 3. TABLA DE PRODUCTOS
    // ==========================================
    const cols = [
      { h: 'CÓDIGO', w: 60, align: 'left' as const },
      { h: 'DESCRIPCIÓN', w: 180, align: 'left' as const },
      { h: 'CANT.', w: 40, align: 'center' as const },
      { h: 'V. UNITARIO', w: 70, align: 'right' as const },
      { h: 'IVA', w: 50, align: 'center' as const },
      { h: 'V. TOTAL', w: 90, align: 'right' as const },
    ];

    // Cabecera de Tabla
    doc.rect(margin, curY, contentW, 25).fill(COLORS.primary);
    let cx = margin;
    cols.forEach(c => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF')
         .text(c.h, cx + 5, curY + 8, { width: c.w - 10, align: c.align });
      cx += c.w;
    });
    curY += 25;

    // Filas de Productos
    datos.productos.forEach((prod, i) => {
      const isEven = i % 2 === 0;
      const rowH = 20;
      
      // Salto de página si es necesario
      if (curY + rowH > pageW - 120) {
        doc.addPage();
        curY = 40;
      }

      doc.rect(margin, curY, contentW, rowH).fill(isEven ? '#FFFFFF' : COLORS.light);
      
      const vTotal = prod.cantidad * prod.pvp;
      
      cx = margin;
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.textDark);
      
      // Código
      doc.text(prod.codigo, cx + 5, curY + 5, { width: cols[0].w - 10, align: cols[0].align });
      cx += cols[0].w;
      
      // Descripción
      doc.text(prod.descripcion, cx + 5, curY + 5, { width: cols[1].w - 10, align: cols[1].align });
      cx += cols[1].w;
      
      // Cantidad
      doc.text(prod.cantidad.toString(), cx + 5, curY + 5, { width: cols[2].w - 10, align: cols[2].align });
      cx += cols[2].w;
      
      // V. Unitario
      doc.text(fmtM(prod.pvp), cx + 5, curY + 5, { width: cols[3].w - 10, align: cols[3].align });
      cx += cols[3].w;
      
      // IVA
      const textIva = prod.grabaIva ? `${prod.porcentajeIva}%` : '0%';
      doc.text(textIva, cx + 5, curY + 5, { width: cols[4].w - 10, align: cols[4].align });
      cx += cols[4].w;
      
      // V. Total
      doc.text(fmtM(vTotal), cx + 5, curY + 5, { width: cols[5].w - 10, align: cols[5].align });
      
      curY += rowH;
    });

    // Línea inferior de la tabla
    doc.moveTo(margin, curY).lineTo(pageW - margin, curY).lineWidth(1).strokeColor(COLORS.border).stroke();

    // ==========================================
    // 4. CUADRO DE TOTALES
    // ==========================================
    curY += 15;
    const totW = 200;
    const totX = pageW - margin - totW;
    
    // Evitar que el total se corte
    if (curY + 100 > doc.page.height - 40) {
      doc.addPage();
      curY = 40;
    }

    doc.roundedRect(totX, curY, totW, 85, 4).fillAndStroke(COLORS.light, COLORS.border);
    
    const dY = 18;
    let tY = curY + 10;
    
    const printTot = (label: string, val: number, bold: boolean = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(COLORS.textDark)
         .text(label, totX + 10, tY)
         .text(fmtM(val), totX, tY, { width: totW - 10, align: 'right' });
      tY += dY;
    };

    printTot('Subtotal sin IVA:', datos.totales.subtotalSinIva);
    printTot('Subtotal con IVA:', datos.totales.subtotalConIva);
    printTot('IVA (15%):', datos.totales.totalIva);
    
    // Separador total
    doc.moveTo(totX + 10, tY - 6).lineTo(totX + totW - 10, tY - 6).strokeColor(COLORS.border).stroke();
    
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary)
       .text('TOTAL A PAGAR:', totX + 10, tY)
       .text(fmtM(datos.totales.total), totX, tY, { width: totW - 10, align: 'right' });

    // ==========================================
    // 5. PIE DE PÁGINA (Inmutabilidad)
    // ==========================================
    const pieY = doc.page.height - 50;
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLORS.textLight)
       .text('Documento generado automáticamente por el Sistema Módulo de Compras.', margin, pieY, { align: 'center', width: contentW })
       .text('No válido como comprobante tributario SRI. Uso exclusivamente interno.', margin, pieY + 12, { align: 'center', width: contentW });

    // Finalizar
    doc.end();
  });
}
