/**
 * @swagger
 * /api/reportes/proveedores/json:
 *   get:
 *     summary: Datos JSON de proveedores para tabla visual
 *     description: |
 *       Retorna la lista de proveedores en formato JSON para renderizar en la tabla visual
 *       del módulo de reportes. Incluye totales estadísticos y saldo pendiente por proveedor.
 *     tags:
 *       - Reportes
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema: { type: string, enum: [ACTIVO, INACTIVO] }
 *         description: Filtrar por estado del proveedor
 *       - in: query
 *         name: tipo
 *         schema: { type: string, enum: [CONTADO, CREDITO] }
 *         description: Filtrar por tipo de proveedor
 *     responses:
 *       200:
 *         description: Lista de proveedores con estadísticas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 total: { type: integer }
 *                 activos: { type: integer }
 *                 inactivos: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Proveedor'
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const estado = searchParams.get('estado') ?? undefined;
    const tipo   = searchParams.get('tipo')   ?? undefined;

    // ── Construir filtros ───────────────────────────────────
    const where: any = { deletedAt: null };
    if (estado) where.estado = estado;
    if (tipo)   where.tipo   = tipo;

    // ── Consultar proveedores y sus saldos en paralelo ──────
    const [proveedores, totalActivos, totalInactivos] = await Promise.all([
      prisma.proveedor.findMany({
        where,
        orderBy: [{ estado: 'asc' }, { nombre: 'asc' }],
      }),
      prisma.proveedor.count({ where: { deletedAt: null, estado: 'ACTIVO' } }),
      prisma.proveedor.count({ where: { deletedAt: null, estado: 'INACTIVO' } }),
    ]);

    // ── Obtener saldos pendientes de todos los proveedores ──
    const ids = proveedores.map((p: any) => p.id);
    const saldos = ids.length > 0
      ? await prisma.saldos_credito_proveedor.findMany({
          where: { proveedor_id: { in: ids }, estado: 'PENDIENTE' },
        })
      : [];

    // ── Agrupar saldos por proveedor ────────────────────────
    const saldoMap = new Map<number, number>();
    saldos.forEach((s: any) => {
      const actual = saldoMap.get(s.proveedor_id) ?? 0;
      saldoMap.set(s.proveedor_id, actual + Number(s.saldo_pendiente ?? 0));
    });

    // ── Mapear respuesta ────────────────────────────────────
    const data = proveedores.map((p: any) => ({
      id:             p.id,
      cedulaRuc:      p.cedulaRuc,
      nombre:         p.nombre,
      ciudad:         p.ciudad,
      tipo:           String(p.tipo),
      telefono:       p.telefono,
      email:          p.email,
      estado:         String(p.estado),
      saldoPendiente: saldoMap.get(p.id) ?? 0,
    }));

    return NextResponse.json({
      success:   true,
      total:     proveedores.length,
      activos:   totalActivos,
      inactivos: totalInactivos,
      data,
    });

  } catch (error: any) {
    console.error('[GET /api/reportes/proveedores/json]', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener los datos de proveedores.' },
      { status: 500 }
    );
  }
}
