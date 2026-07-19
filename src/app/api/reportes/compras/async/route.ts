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

    // Obtener los datos AQUI en Next.js (que sí tiene acceso a la DB) usando queryRaw para más facilidad
    const facturas = await prisma.$queryRaw`
      SELECT f.numero_factura, f.fecha, p.nombre as proveedor_nombre, f.total 
      FROM facturas_compra f 
      LEFT JOIN "Proveedor" p ON f.proveedor_id = p.id
      ORDER BY f.fecha DESC
      LIMIT 200
    ` as any[];

    // Mapear al formato que espera la Lambda
    const facturasMapeadas = facturas.map((f: any) => ({
      numero_factura: f.numero_factura,
      fecha: f.fecha ? new Date(f.fecha).toISOString().split('T')[0] : 'N/A',
      proveedor_nombre: f.proveedor_nombre || 'Desconocido',
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
