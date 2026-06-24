import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generarFacturaPDF, DatosFacturaPDF } from '@/lib/facturaPdf';

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

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: factura.proveedor_id }
    });

    const detalles = await prisma.detalle_factura_compra.findMany({
      where: { factura_id: id }
    });

    const datosPdf: DatosFacturaPDF = {
      numeroFactura: factura.numero_factura || `Borrador-${factura.id}`,
      fechaEmision: factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-EC') : new Date().toLocaleDateString('es-EC'),
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

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="factura-${id}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error generando PDF de factura:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
