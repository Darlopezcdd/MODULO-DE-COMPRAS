import { NextResponse } from 'next/server';
import { generarFacturaPDF, DatosFacturaPDF } from '@/lib/facturaPdf';

/**
 * @swagger
 * /api/pdf/preview:
 *   post:
 *     summary: Previsualizar factura como PDF
 *     description: Recibe los datos de una factura (cabecera, ítems y totales) y genera un PDF con PDFKit para previsualización o impresión.
 *     tags:
 *       - PDF
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PdfPreviewInput'
 *     responses:
 *       200:
 *         description: Documento PDF generado
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Error al generar el PDF
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    const datosPdf: DatosFacturaPDF = {
      numeroFactura: data.numeroFactura || 'Borrador',
      fechaEmision: data.fechaEmision || new Date().toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
      tipoPago: data.tipoPago || 'CONTADO',
      proveedor: {
        nombre: data.proveedorNombre || 'Desconocido',
        cedulaRuc: data.proveedorRuc || 'N/A',
        direccion: data.proveedorDireccion || 'N/A',
        telefono: data.proveedorTelefono || 'N/A',
      },
      productos: (data.items || []).map((item: any) => ({
        codigo: item.codigo || '-',
        descripcion: item.descripcion || 'Producto',
        cantidad: Number(item.cantidad) || 1,
        pvp: Number(item.precioUnitario) || 0,
        grabaIva: item.aplicaIva !== false,
        porcentajeIva: 15,
      })),
      totales: {
        subtotalSinIva: Number(data.subtotalSinIva) || 0,
        subtotalConIva: Number(data.subtotalConIva) || 0,
        totalIva: Number(data.montoIva) || 0,
        total: Number(data.total) || 0,
      },
    };

    const pdfBuffer = await generarFacturaPDF(datosPdf);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="factura-preview.pdf"'
      }
    });

  } catch {
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 });
  }
}
