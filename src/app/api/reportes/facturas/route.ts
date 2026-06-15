import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma'; // Relative path from app/api/reportes/facturas/route.ts

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Obtener parámetros opcionales de consulta
    const estado = searchParams.get('estado');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const where: any = {};

    // Filtros manuales
    if (estado) {
      if (!['BORRADOR', 'EMITIDA', 'ANULADA'].includes(estado)) {
        return NextResponse.json(
          { error: 'Estado inválido. Debe ser BORRADOR, EMITIDA o ANULADA.' },
          { status: 400 }
        );
      }
      where.estado = estado;
    }

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        return NextResponse.json(
          { error: 'Formato de fecha inválido. Utilice formato YYYY-MM-DD.' },
          { status: 400 }
        );
      }

      where.fecha = {
        gte: inicio,
        lte: fin,
      };
    }

    // Ejecución de la consulta con prisma
    const facturas = await prisma.facturas_compra.findMany({
      where,
      orderBy: {
        fecha: 'desc',
      },
    });

    // Retornamos 200 OK con los datos
    return NextResponse.json({
      success: true,
      count: facturas.length,
      data: facturas,
    });

  } catch (error: any) {
    console.error('Error al generar el reporte de facturas:', error);
    
    // Manejo manual de errores HTTP en caso de fallos del servidor o base de datos
    return NextResponse.json(
      { 
        error: 'Ocurrió un error interno al procesar el reporte.',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
