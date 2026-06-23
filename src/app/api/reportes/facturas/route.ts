import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { generarReporteFacturasPDF } from '../../../../lib/facturasReportePdf';
import { getUserFromRequest } from '../../../../lib/authUtils';
import { registrarAuditoria } from '../../../../lib/auditoriaService';

/**
 * @swagger
 * /api/reportes/facturas:
 *   get:
 *     summary: Reporte de facturas de compra
 *     description: |
 *       Genera un reporte de facturas filtrable por estado y rango de fechas.
 *       Soporta 3 formatos de salida:
 *       - **JSON** (por defecto): Devuelve las facturas con su detalle de productos.
 *       - **PDF** (`format=pdf`): Descarga un archivo PDF del reporte.
 *       - **CSV** (`format=csv`): Descarga un archivo CSV del reporte.
 *     tags:
 *       - Reportes
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [BORRADOR, EMITIDA, ANULADA]
 *         description: Filtrar por estado de la factura
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicio del rango (YYYY-MM-DD)
 *         example: '2026-01-01'
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha fin del rango (YYYY-MM-DD)
 *         example: '2026-12-31'
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, csv]
 *         description: Formato de exportación. Si no se envía, responde en JSON.
 *     responses:
 *       200:
 *         description: Reporte generado exitosamente (JSON, PDF o CSV según parámetro `format`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FacturaCompra'
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const formato = searchParams.get('format'); // pdf or csv

    const where: any = {};
    if (estado) where.estado = estado;
    if (fechaInicio && fechaFin) {
      where.fecha = { gte: new Date(fechaInicio), lte: new Date(fechaFin) };
    }

    const facturas = await prisma.facturas_compra.findMany({
      where,
      orderBy: { fecha: 'desc' },
    });

    // CA2: Desglose detallado con productos
    const facturasIds = facturas.map((f: any) => f.id);
    const detalles = await prisma.detalle_factura_compra.findMany({
      where: { factura_id: { in: facturasIds } }
    });

    const facturasConDetalle = facturas.map((f: any) => ({
      ...f,
      productos: detalles.filter((d: any) => d.factura_id === f.id)
    }));

    const usuario = await getUserFromRequest(request);

    if (formato === 'pdf') {
      if (usuario) {
        await registrarAuditoria(usuario.id as number, usuario.nombre as string, 'IMPRIMIR', 'facturas_compra', null, null, null, 'Generación de reporte PDF de facturas');
      }
      const pdfBuffer = await generarReporteFacturasPDF(facturasConDetalle, { estado: estado || undefined, fechaInicio: fechaInicio || undefined, fechaFin: fechaFin || undefined });
      const filename = `reporte-facturas-${new Date().toISOString().split('T')[0]}.pdf`;
      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    if (formato === 'csv') {
      if (usuario) {
        await registrarAuditoria(usuario.id as number, usuario.nombre as string, 'IMPRIMIR', 'facturas_compra', null, null, null, 'Exportación CSV de facturas');
      }
      let csvContent = 'Factura,Fecha,Estado,Total,Producto,Cantidad,PVP,Total_Linea\n';
      facturasConDetalle.forEach((f: any) => {
        if (f.productos.length > 0) {
          f.productos.forEach((p: any) => {
            csvContent += `${f.numero_factura},${f.fecha.toISOString().split('T')[0]},${f.estado},${f.total},"${p.producto_nombre}",${p.cantidad},${p.pvp},${p.total_linea}\n`;
          });
        } else {
          csvContent += `${f.numero_factura},${f.fecha.toISOString().split('T')[0]},${f.estado},${f.total},,,, \n`;
        }
      });
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="facturas.csv"'
        }
      });
    }

    return NextResponse.json({ success: true, count: facturas.length, data: facturasConDetalle });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
