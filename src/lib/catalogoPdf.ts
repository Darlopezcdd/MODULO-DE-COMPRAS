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
  };
  productos: CatalogoItemPDF[];
}

const COLORS = {
  primary: '#1E3A5F',   
  secondary: '#2E86AB', 
  light: '#F8FAFC',     
  border: '#E2E8F0',    
  textDark: '#1E293B',
  textLight: '#64748B',
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

    // 1. ENCABEZADO
    doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.primary)
       .text('CATÁLOGO DE PROVEEDOR', margin, margin);
       
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.textLight)
       .text('MÓDULO DE COMPRAS - SISTEMA ADMINISTRATIVO', margin, margin + 28);
    
    // Cuadro Proveedor (Derecha)
    const boxRightW = 250;
    const boxRightX = pageW - margin - boxRightW;
    doc.roundedRect(boxRightX, margin, boxRightW, 60, 4)
       .lineWidth(1).strokeColor(COLORS.primary).stroke();
       
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
       .text('PROVEEDOR', boxRightX, margin + 8, { width: boxRightW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.textDark)
       .text(datos.proveedor.nombre, boxRightX, margin + 22, { width: boxRightW, align: 'center' });
    
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.textLight)
       .text(`RUC/Cédula: ${datos.proveedor.cedulaRuc} | ${datos.proveedor.ciudad}`, boxRightX, margin + 40, { width: boxRightW, align: 'center' });

    doc.moveTo(margin, 120).lineTo(pageW - margin, 120).lineWidth(2).strokeColor(COLORS.secondary).stroke();

    // 2. TABLA DE PRODUCTOS
    let curY = 140;
    const cols = [
      { h: 'CÓDIGO', w: 80, align: 'left' as const },
      { h: 'PRODUCTO', w: 250, align: 'left' as const },
      { h: 'STOCK G.', w: 80, align: 'center' as const },
      { h: 'P. COMPRA', w: 100, align: 'right' as const },
    ];

    doc.rect(margin, curY, contentW, 25).fill(COLORS.primary);
    let cx = margin;
    cols.forEach(c => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF')
         .text(c.h, cx + 5, curY + 8, { width: c.w - 10, align: c.align });
      cx += c.w;
    });
    curY += 25;

    datos.productos.forEach((prod, i) => {
      const isEven = i % 2 === 0;
      const rowH = 20;
      
      if (curY + rowH > pageW - 80) {
        doc.addPage();
        curY = 40;
      }

      doc.rect(margin, curY, contentW, rowH).fill(isEven ? '#FFFFFF' : COLORS.light);
      
      cx = margin;
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.textDark);
      
      doc.text(prod.codigo, cx + 5, curY + 5, { width: cols[0].w - 10, align: cols[0].align });
      cx += cols[0].w;
      
      doc.text(prod.nombre, cx + 5, curY + 5, { width: cols[1].w - 10, align: cols[1].align });
      cx += cols[1].w;
      
      doc.text(prod.stockActual.toString(), cx + 5, curY + 5, { width: cols[2].w - 10, align: cols[2].align });
      cx += cols[2].w;
      
      doc.font('Helvetica-Bold').fillColor(COLORS.secondary)
         .text(fmtM(prod.precioCompra), cx + 5, curY + 5, { width: cols[3].w - 10, align: cols[3].align });
      
      curY += rowH;
    });

    doc.moveTo(margin, curY).lineTo(pageW - margin, curY).lineWidth(1).strokeColor(COLORS.border).stroke();

    // 3. PIE DE PÁGINA
    const pieY = doc.page.height - 50;
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLORS.textLight)
       .text('Catálogo de precios acordados generado automáticamente.', margin, pieY, { align: 'center', width: contentW });

    doc.end();
  });
}
