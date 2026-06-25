import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Obtener saldos pendientes o vencidos
    const saldos = await prisma.saldos_credito_proveedor.findMany({
      where: {
        estado: {
          in: ['PENDIENTE', 'VENCIDO']
        }
      },
      orderBy: {
        fecha_vencimiento: 'asc'
      }
    });

    if (saldos.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const proveedorIds = Array.from(new Set(saldos.map(s => s.proveedor_id)));
    const facturaIds = Array.from(new Set(saldos.map(s => s.factura_id).filter(id => id !== null))) as number[];

    // 2. Obtener datos relacionados
    const proveedores = await prisma.proveedor.findMany({
      where: { id: { in: proveedorIds } },
      select: { id: true, nombre: true, banco: true, tipo_cuenta: true, numero_cuenta: true }
    });

    const facturas = await prisma.facturas_compra.findMany({
      where: { id: { in: facturaIds } },
      select: { id: true, numero_factura: true }
    });

    // 3. Mapear resultados
    const resultado = saldos.map(s => {
      const prov = proveedores.find(p => p.id === s.proveedor_id);
      const fac = facturas.find(f => f.id === s.factura_id);
      return {
        id: s.id,
        proveedor_id: s.proveedor_id,
        proveedor_nombre: prov ? prov.nombre : 'Desconocido',
        proveedor_banco: prov?.banco || 'N/A',
        proveedor_tipo_cuenta: prov?.tipo_cuenta || 'N/A',
        proveedor_numero_cuenta: prov?.numero_cuenta || 'N/A',
        factura_numero: fac ? fac.numero_factura : 'S/N',
        monto_credito: s.monto_credito.toNumber(),
        monto_pagado: s.monto_pagado.toNumber(),
        saldo_pendiente: s.saldo_pendiente ? s.saldo_pendiente.toNumber() : 0,
        fecha_vencimiento: s.fecha_vencimiento,
        estado: s.estado
      };
    });

    return NextResponse.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error fetching saldos:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener saldos' }, { status: 500 });
  }
}
