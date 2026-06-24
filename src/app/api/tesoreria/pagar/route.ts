import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { registrarDebito } from '@/lib/cuentasClient';

export async function POST(req: Request) {
  try {
    const { saldoId, cuentaBancariaId } = await req.json();

    if (!saldoId || !cuentaBancariaId) {
      return NextResponse.json({ error: 'Faltan datos (saldoId o cuentaBancariaId)' }, { status: 400 });
    }

    const saldo = await prisma.saldos_credito_proveedor.findUnique({
      where: { id: saldoId }
    });

    if (!saldo) {
      return NextResponse.json({ error: 'Saldo no encontrado' }, { status: 404 });
    }

    if (saldo.estado === 'PAGADO') {
      return NextResponse.json({ error: 'Este saldo ya fue pagado' }, { status: 400 });
    }

    const montoAPagar = Number(saldo.monto_credito) - Number(saldo.monto_pagado);

    if (montoAPagar <= 0) {
      return NextResponse.json({ error: 'No hay monto pendiente por pagar' }, { status: 400 });
    }

    // Registrar debito en la API externa de Cuentas por Cobrar/Pagar
    const debitoRes = await registrarDebito(cuentaBancariaId, montoAPagar, `Pago Cuota Saldo Proveedor #${saldo.id}`);

    if (!debitoRes.success) {
      return NextResponse.json({ error: debitoRes.error || 'Fondos insuficientes o error en cuenta' }, { status: 400 });
    }

    // Actualizar el saldo en nuestra base de datos
    const saldoActualizado = await prisma.saldos_credito_proveedor.update({
      where: { id: saldoId },
      data: {
        monto_pagado: Number(saldo.monto_credito),
        saldo_pendiente: 0,
        estado: 'PAGADO',
        updated_at: new Date()
      }
    });

    return NextResponse.json({ success: true, data: saldoActualizado, nuevoSaldoCta: debitoRes.nuevoSaldo });
  } catch (error: any) {
    console.error('Error al pagar saldo:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
