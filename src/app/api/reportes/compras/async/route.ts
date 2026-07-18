import { NextResponse } from 'next/server';
import { solicitarReporteAsincrono } from '@/lib/awsSqs';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { tipoReporte, filtros, emailDestino } = data;

    if (!tipoReporte) {
      return NextResponse.json({ error: 'Falta el tipo de reporte' }, { status: 400 });
    }

    // Armamos el payload (JSON) que espera la Lambda
    const parametrosReporte = {
      tipoReporte, // Ej: 'REPORTE_COMPRAS', 'REPORTE_PROVEEDORES'
      filtros: filtros || {},
      emailDestino: emailDestino || 'admin@empresa.com',
      fechaSolicitud: new Date().toISOString()
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
    return NextResponse.json({ error: 'Error interno al encolar el reporte' }, { status: 500 });
  }
}
