// src/app/api/reportes/proveedores/route.ts
// HU5: Endpoint de generación de reporte PDF de proveedores

import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { generarReporteProveedoresPDF } from '../../../../lib/proveedoresPdf';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const estado = searchParams.get('estado') ?? undefined;
    const tipo   = searchParams.get('tipo')   ?? undefined;

    // Validar valores permitidos
    if (estado && !['ACTIVO', 'INACTIVO'].includes(estado)) {
      return NextResponse.json(
        { error: 'Parámetro estado inválido. Use ACTIVO o INACTIVO.' },
        { status: 400 }
      );
    }

    if (tipo && !['CONTADO', 'CREDITO'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Parámetro tipo inválido. Use CONTADO o CREDITO.' },
        { status: 400 }
      );
    }

    // Construir filtros de consulta
    const where: any = { deletedAt: null };
    if (estado) where.estado = estado;
    if (tipo)   where.tipo   = tipo;

    // Consultar proveedores
    const proveedores = await prisma.proveedor.findMany({
      where,
      orderBy: [{ estado: 'asc' }, { nombre: 'asc' }],
      select: {
        id:        true,
        cedulaRuc: true,
        nombre:    true,
        ciudad:    true,
        tipo:      true,
        telefono:  true,
        email:     true,
        estado:    true,
      },
    });

    // Mapear enums a strings para el PDF
    const filas = proveedores.map(p => ({
      id:        p.id,
      cedulaRuc: p.cedulaRuc,
      nombre:    p.nombre,
      ciudad:    p.ciudad,
      tipo:      String(p.tipo),
      telefono:  p.telefono,
      email:     p.email,
      estado:    String(p.estado),
    }));

    // Generar buffer PDF
    const pdfBuffer = await generarReporteProveedoresPDF(filas, { estado, tipo });

    // Nombre del archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `reporte-proveedores-${fecha}.pdf`;

    // Retornar el PDF como descarga
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
    console.error('Error al generar reporte PDF de proveedores:', error);
    return NextResponse.json(
      {
        error:   'Error interno al generar el reporte PDF.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
