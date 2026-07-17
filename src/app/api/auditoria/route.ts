/**
 * @swagger
 * /api/auditoria:
 *   get:
 *     summary: Listado paginado de pistas de auditoría
 *     description: |
 *       Retorna el historial de acciones registradas en el módulo de Compras.
 *       Solo accesible para usuarios con rol **ADMIN** o **AUDITOR**.
 *
 *       **Acciones posibles:** LOGIN, LOGOUT, CREAR, ACTUALIZAR, ELIMINAR, IMPRIMIR
 *
 *       **Tablas posibles:** proveedor, facturas_compra
 *     tags:
 *       - Auditoría
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *         description: Número de página
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20, maximum: 200 }
 *         description: Registros por página
 *       - in: query
 *         name: usuarioId
 *         schema: { type: integer }
 *         description: Filtrar por ID de usuario
 *       - in: query
 *         name: accion
 *         schema: { type: string, enum: [LOGIN, LOGOUT, CREAR, ACTUALIZAR, ELIMINAR, IMPRIMIR] }
 *         description: Filtrar por tipo de acción
 *       - in: query
 *         name: tablaAfectada
 *         schema: { type: string }
 *         description: Filtrar por tabla afectada (ej. proveedor, facturas_compra)
 *       - in: query
 *         name: fechaInicio
 *         schema: { type: string, format: date }
 *         description: Fecha de inicio del rango (YYYY-MM-DD)
 *       - in: query
 *         name: fechaFin
 *         schema: { type: string, format: date }
 *         description: Fecha de fin del rango (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Listado paginado de pistas de auditoría
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PistaAuditoria'
 *                 total: { type: integer, example: 120 }
 *                 pagina: { type: integer, example: 1 }
 *                 totalPaginas: { type: integer, example: 6 }
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Sin permisos (rol insuficiente)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/authUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
  // ── 1. Verificar autenticación ──────────────────────────────
  const payload = await getUserFromRequest(request) as any;

  if (!payload) {
    return NextResponse.json(
      { success: false, error: 'No autenticado. Inicia sesión para continuar.' },
      { status: 401 }
    );
  }

  // ── 2. Verificar que el rol tiene permiso ───────────────────
  if (!['ADMIN', 'COMP_ADMIN', 'AUDITOR'].includes(payload.rol)) {
    return NextResponse.json(
      { success: false, error: 'Acceso denegado. Solo ADMIN y AUDITOR pueden ver el historial de auditoría.' },
      { status: 403 }
    );
  }

  // ── 3. Leer parámetros de la URL ────────────────────────────
  const { searchParams } = request.nextUrl;

  const pagina       = Math.max(parseInt(searchParams.get('pagina')  || '1'),  1);
  const limite       = Math.min(parseInt(searchParams.get('limite')  || '20'), 200);
  const usuarioNombre = searchParams.get('usuarioNombre');
  const accion       = searchParams.get('accion');
  const tablaAfectada = searchParams.get('tablaAfectada');
  const fechaInicio  = searchParams.get('fechaInicio');
  const fechaFin     = searchParams.get('fechaFin');

  // ── 4. Construir filtros dinámicos ──────────────────────────
  const where: any = {};

  if (usuarioNombre) where.usuario_nombre = { contains: usuarioNombre, mode: 'insensitive' };
  if (accion)        where.accion         = accion;
  if (tablaAfectada) where.tabla_afectada = { contains: tablaAfectada, mode: 'insensitive' };

  if (fechaInicio || fechaFin) {
    where.fecha_hora = {};
    if (fechaInicio) where.fecha_hora.gte = new Date(fechaInicio + 'T00:00:00-05:00');
    if (fechaFin)    where.fecha_hora.lte = new Date(fechaFin    + 'T23:59:59-05:00');
  }

  // ── 5. Consultar BD en paralelo (total + datos) ─────────────
  const skip = (pagina - 1) * limite;

  const [total, registros] = await Promise.all([
    prisma.pista_auditoria.count({ where }),
    prisma.pista_auditoria.findMany({
      where,
      orderBy: { fecha_hora: 'desc' },
      take: limite,
      skip,
    }),
  ]);

  // ── 6. Serializar (BigInt → String) y responder ─────────────
  const data = registros.map((r: any) => ({
    id:             r.id.toString(),
    fechaHora:      r.fecha_hora.toISOString(),
    usuarioId:      r.usuario_id,
    usuarioNombre:  r.usuario_nombre,
    accion:         r.accion,
    modulo:         r.modulo,
    tablaAfectada:  r.tabla_afectada,
    registroId:     r.registro_id?.toString() ?? null,
    descripcion:    r.descripcion ?? null,
    resultado:      r.resultado,
    ipAddress:      r.ip_address ?? null,
  }));

  return NextResponse.json({
    success:      true,
    data,
    total,
    pagina,
    totalPaginas: Math.ceil(total / limite),
  });
  } catch (err: any) {
    console.error('Error en /api/auditoria:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
