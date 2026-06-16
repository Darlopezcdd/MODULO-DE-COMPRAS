import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const facturaId = parseInt(searchParams.get('facturaId') || '', 10);
    const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10));
    const limite = Math.min(100, Math.max(1, parseInt(searchParams.get('limite') || '20', 10)));

    if (isNaN(facturaId)) {
      return NextResponse.json(
        { error: 'facturaId es requerido y debe ser un número entero.' },
        { status: 400 }
      );
    }

    const factura = await prisma.facturas_compra.findUnique({
      where: { id: facturaId },
    });

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada.' },
        { status: 404 }
      );
    }

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: factura.proveedor_id },
    });

    const total = await prisma.detalle_factura_compra.count({
      where: { factura_id: facturaId },
    });

    const totalPaginas = Math.ceil(total / limite);
    const skip = (pagina - 1) * limite;

    const lineas = await prisma.detalle_factura_compra.findMany({
      where: { factura_id: facturaId },
      orderBy: { id: 'asc' },
      skip,
      take: limite,
    });

    return NextResponse.json({
      success: true,
      factura: {
        id: factura.id,
        numeroFactura: factura.numero_factura,
        fecha: factura.fecha,
        tipoPago: factura.tipo_pago,
        estado: factura.estado,
        proveedor,
        subtotalSinIva: factura.subtotal_sin_iva,
        subtotalConIva: factura.subtotal_con_iva,
        totalIva: factura.total_iva,
        total: factura.total,
      },
      lineas,
      paginacion: {
        pagina,
        limite,
        total,
        totalPaginas,
        tieneAnterior: pagina > 1,
        tieneSiguiente: pagina < totalPaginas,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: 'Error al obtener el detalle de la factura.', details: message },
      { status: 500 }
    );
  }
}
