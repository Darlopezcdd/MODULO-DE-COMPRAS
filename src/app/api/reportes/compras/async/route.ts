import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { solicitarReporteAsincrono } from '@/lib/awsSqs';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { tipoReporte, filtros, emailDestino } = data;

    if (!tipoReporte) {
      return NextResponse.json({ error: 'Falta el tipo de reporte' }, { status: 400 });
    }

    // Construir la cláusula where para filtrar por fechas
    let whereClause: any = {};
    const { fechaInicio, fechaFin, tipo, fecha } = filtros || {};

    if (fechaInicio && fechaFin) {
      const [y1, m1, d1] = fechaInicio.split('-').map(Number);
      const [y2, m2, d2] = fechaFin.split('-').map(Number);
      const startD = new Date(y1, m1 - 1, d1, 0, 0, 0);
      const endD = new Date(y2, m2 - 1, d2, 23, 59, 59, 999);
      whereClause = { fecha: { gte: startD, lte: endD } };
    } else if (tipo !== 'todas' && fecha) {
      const [y, m, d] = fecha.split('-').map(Number);
      if (tipo === 'dia') {
        const start = new Date(y, m - 1, d, 0, 0, 0);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        whereClause = { fecha: { gte: start, lte: end } };
      } else if (tipo === 'mes') {
        const start = new Date(y, m - 1, 1, 0, 0, 0);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        whereClause = { fecha: { gte: start, lte: end } };
      } else if (tipo === 'anio') {
        const start = new Date(y, 0, 1, 0, 0, 0);
        const end = new Date(y, 11, 31, 23, 59, 59, 999);
        whereClause = { fecha: { gte: start, lte: end } };
      }
    }

    // Obtener facturas usando Prisma ORM (sin include, para evitar errores de type never en Prisma)
    const facturas = await prisma.facturas_compra.findMany({
      where: whereClause,
      orderBy: { fecha: 'desc' }
    });

    // Obtener proveedores y armar un mapa en memoria
    const proveedores = await prisma.proveedor.findMany({
      select: { id: true, nombre: true }
    });
    const provMap = new Map(proveedores.map((p: any) => [p.id, p.nombre]));

    // Mapear al formato que espera la Lambda
    const facturasMapeadas = facturas.map((f: any) => ({
      numero_factura: f.numero_factura,
      fecha: f.fecha ? new Date(f.fecha).toISOString().split('T')[0] : 'N/A',
      proveedor_nombre: provMap.get(f.proveedor_id) || 'Desconocido',
      total: Number(f.total)
    }));

    // Armamos el payload (JSON) que espera la Lambda con todos los DATOS YA LISTOS
    const parametrosReporte = {
      tipoReporte,
      filtros: filtros || {},
      emailDestino: emailDestino || 'dehidalgod@utn.edu.ec',
      fechaSolicitud: new Date().toISOString(),
      datosFacturas: facturasMapeadas // PASAMOS LA DATA POR SQS!
    };

    // 1. Enviamos el mensaje a la cola SQS
    const mensajeId = await solicitarReporteAsincrono(parametrosReporte);

    // 2. Respondemos inmediatamente al cliente, sin bloquear la EC2
    return NextResponse.json({
      success: true,
      mensaje: 'El reporte es muy grande y se está procesando en segundo plano.',
      sqsMessageId: mensajeId
    });

  } catch (error: any) {
    console.error('Error al solicitar reporte asíncrono:', error);
    return NextResponse.json({ 
      error: 'Error interno al encolar el reporte',
      detalle: error.message || String(error)
    }, { status: 500 });
  }
}
