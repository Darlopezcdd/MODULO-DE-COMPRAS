import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { generarReporteProveedoresPDF } from '../../../../lib/proveedoresPdf';
import { getUserFromRequest } from '../../../../lib/authUtils';
import { registrarAuditoria } from '../../../../lib/auditoriaService';

/**
 * @swagger
 * /api/reportes/proveedores:
 *   get:
 *     summary: Reporte PDF de proveedores
 *     description: Genera y descarga un reporte PDF con la lista de proveedores, sus datos de contacto y saldos pendientes. Filtrable por estado y tipo.
 *     tags:
 *       - Reportes
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [ACTIVO, INACTIVO]
 *         description: Filtrar proveedores por estado
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [CONTADO, CREDITO]
 *         description: Filtrar proveedores por tipo de pago
 *     responses:
 *       200:
 *         description: Archivo PDF del reporte de proveedores
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Error interno al generar el reporte
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') ?? undefined;
    const tipo   = searchParams.get('tipo')   ?? undefined;

    const where: any = { deletedAt: null };
    if (estado) where.estado = estado;
    if (tipo)   where.tipo   = tipo;

    const proveedores = await prisma.proveedor.findMany({
      where,
      orderBy: [{ estado: 'asc' }, { nombre: 'asc' }],
    });

    const proveedoresIds = proveedores.map((p: any) => p.id);
    const saldos = await prisma.saldos_credito_proveedor.findMany({
      where: { proveedor_id: { in: proveedoresIds } }
    });

    const filas = proveedores.map((p: any) => {
      const saldoObj = saldos.find((s: any) => s.proveedor_id === p.id);
      return {
        id:        p.id,
        cedulaRuc: p.cedulaRuc,
        nombre:    p.nombre,
        ciudad:    p.ciudad,
        tipo:      String(p.tipo),
        telefono:  p.telefono,
        email:     p.email,
        estado:    String(p.estado),
        saldo_pendiente: saldoObj ? Number(saldoObj.saldo_pendiente) : 0,
      };
    });

    const usuario = await getUserFromRequest(request);
    if (usuario) {
      await registrarAuditoria(usuario.id as number, usuario.nombre as string, 'IMPRIMIR', 'proveedor', null, null, null, 'Generación de reporte PDF de proveedores');
    }

    const pdfBuffer = await generarReporteProveedoresPDF(filas, { estado, tipo });
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `reporte-proveedores-${fecha}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(pdfBuffer.length),
        'Cache-Control':       'no-store',
      },
    });

  } catch (error: any) {
    console.error("Error PDF Proveedores:", error);
    return NextResponse.json({ error: 'Error interno al generar el reporte PDF.' }, { status: 500 });
  }
}
