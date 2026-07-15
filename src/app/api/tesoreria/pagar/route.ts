import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { obtenerCuentasEmpresa } from '@/lib/cuentasClient';

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

    // Validar saldo
    const resCuentas = await obtenerCuentasEmpresa();
    if (!resCuentas.success || !resCuentas.data) {
      return NextResponse.json({ error: 'Error al consultar saldo de Cuentas por Cobrar' }, { status: 500 });
    }

    const cuentaSelec = resCuentas.data.find(c => c.id === cuentaBancariaId);
    if (!cuentaSelec) {
      return NextResponse.json({ error: 'Cuenta bancaria no encontrada' }, { status: 404 });
    }

    if (cuentaSelec.saldo < montoAPagar) {
      return NextResponse.json({ error: `Fondos insuficientes. Saldo disponible: $${cuentaSelec.saldo}` }, { status: 400 });
    }

    // Registrar debito en nuestra base de datos para que CxC lo lea
    await prisma.gastos_cxc.create({
      data: {
        cuenta_bancaria_id: cuentaBancariaId,
        monto: montoAPagar,
        motivo: `Pago Cuota Saldo Proveedor #${saldo.id}`,
        saldo_credito_id: saldo.id
      }
    });

    // Actualizar el saldo en nuestra base de datos
    const saldoActualizado = await prisma.saldos_credito_proveedor.update({
      where: { id: saldoId },
      data: {
        monto_pagado: Number(saldo.monto_credito),
        // saldo_pendiente es columna GENERATED ALWAYS en Postgres: se recalcula sola
        estado: 'PAGADO',
        updated_at: new Date()
      }
    });

    return NextResponse.json({ success: true, data: saldoActualizado, nuevoSaldoCta: cuentaSelec.saldo - montoAPagar });
  } catch (error: any) {
    console.error('Error al pagar saldo:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
