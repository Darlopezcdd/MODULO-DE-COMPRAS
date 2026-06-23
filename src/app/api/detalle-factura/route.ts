import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/detalle-factura:
 *   get:
 *     summary: Obtener detalle de una factura de compra
 *     description: Devuelve la cabecera de la factura, datos del proveedor y las líneas de detalle con paginación.
 *     tags:
 *       - Facturas
 *     parameters:
 *       - in: query
 *         name: facturaId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la factura de compra
 *         example: 1
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Detalle de la factura con líneas paginadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 factura:
 *                   $ref: '#/components/schemas/FacturaCompra'
 *                 lineas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DetalleFactura'
 *                 paginacion:
 *                   type: object
 *                   properties:
 *                     pagina:
 *                       type: integer
 *                     limite:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPaginas:
 *                       type: integer
 *                     tieneAnterior:
 *                       type: boolean
 *                     tieneSiguiente:
 *                       type: boolean
 *       400:
 *         description: facturaId es requerido y debe ser un número
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Factura no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
