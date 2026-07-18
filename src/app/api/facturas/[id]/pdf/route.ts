import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generarFacturaPDF, DatosFacturaPDF } from '@/lib/facturaPdf';
import { uploadPdfToS3 } from '@/lib/awsS3';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const factura = await prisma.facturas_compra.findUnique({
      where: { id }
    });

    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    // 1. Si la factura ya tiene su PDF en S3, redirigimos directamente a AWS y ahorramos memoria
    if (factura.pdf_url) {
      return NextResponse.redirect(factura.pdf_url);
    }

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: factura.proveedor_id }
    });

    const detalles = await prisma.detalle_factura_compra.findMany({
      where: { factura_id: id }
    });

    const datosPdf: DatosFacturaPDF = {
      numeroFactura: factura.numero_factura || `Borrador-${factura.id}`,
      fechaEmision: factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-EC', { timeZone: 'UTC' }) : new Date().toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
      tipoPago: factura.tipo_pago as 'CONTADO' | 'CREDITO',
      proveedor: {
        nombre: proveedor?.nombre || 'Desconocido',
        cedulaRuc: proveedor?.cedulaRuc || 'N/A',
        direccion: proveedor?.direccion || 'N/A',
        telefono: proveedor?.telefono || 'N/A',
      },
      productos: detalles.map((d: any) => ({
        codigo: d.producto_codigo || '',
        descripcion: d.producto_nombre || '',
        cantidad: Number(d.cantidad),
        pvp: Number(d.pvp),
        grabaIva: Boolean(d.graba_iva),
        porcentajeIva: Number(d.porcentaje_iva || 0),
      })),
      totales: {
        subtotalSinIva: Number(factura.subtotal_sin_iva || 0),
        subtotalConIva: Number(factura.subtotal_con_iva || 0),
        totalIva: Number(factura.total_iva || 0),
        total: Number(factura.total || 0),
      }
    };

    const pdfBuffer = await generarFacturaPDF(datosPdf);
    const fileName = `factura-compra-${id}-${Date.now()}.pdf`;

    // 3. Subir el buffer generado a Amazon S3
    const s3Url = await uploadPdfToS3(Buffer.from(pdfBuffer), fileName);

    // 4. Guardar la URL en la base de datos para no tener que generarlo la próxima vez
    await prisma.facturas_compra.update({
      where: { id },
      data: {
        pdf_url: s3Url,
        pdf_generado: true
      }
    });

    // 5. Redirigir al usuario al documento en S3
    return NextResponse.redirect(s3Url);
  } catch (error: any) {
    console.error('Error generando PDF de factura:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
