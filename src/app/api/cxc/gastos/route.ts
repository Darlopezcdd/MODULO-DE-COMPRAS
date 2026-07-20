import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/cxc/gastos:
 *   get:
 *     summary: Obtener historial de gastos de compras
 *     description: Retorna la lista de todos los gastos o débitos realizados por el módulo de Compras desde las diferentes cuentas bancarias (ya sea por pagos de facturas al contado o por pagos de cuotas de crédito). Utilizado por el módulo de CxC (Tesorería) para conciliar y descontar los saldos reales.
 *     tags:
 *       - Cuentas por Cobrar (CxC)
 *     responses:
 *       200:
 *         description: Lista de gastos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       cuenta_bancaria_id:
 *                         type: string
 *                       monto:
 *                         type: string
 *                       motivo:
 *                         type: string
 *                       factura_id:
 *                         type: integer
 *                       saldo_credito_id:
 *                         type: integer
 *                       fecha_pago:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Error interno del servidor
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const verTodos = url.searchParams.get('todos') === 'true';

    // 1. Obtener los gastos (solo los no sincronizados, a menos que se pidan todos)
    const gastos = await prisma.gastos_cxc.findMany({
      where: verTodos ? undefined : {
        sincronizado: false
      },
      orderBy: {
        fecha_pago: 'desc'
      }
    });

    // 2. Si se encontraron gastos y NO estamos en modo "ver todos", marcarlos como sincronizados
    if (gastos.length > 0 && !verTodos) {
      const ids = gastos.map((g: any) => g.id);
      await prisma.gastos_cxc.updateMany({
        where: {
          id: {
            in: ids
          }
        },
        data: {
          sincronizado: true
        }
      });
    }

    // 3. Formatear a camelCase para compatibilidad con el otro sistema (sin duplicar)
    const gastosFormateados = gastos.map((g: any) => ({
      id: g.id,
      cuentaBancariaId: g.cuenta_bancaria_id,
      monto: g.monto,
      motivo: g.motivo,
      facturaId: g.factura_id,
      saldoCreditoId: g.saldo_credito_id,
      sincronizado: g.sincronizado,
      fechaPago: g.fecha_pago
    }));

    return NextResponse.json({ success: true, data: gastosFormateados });
  } catch (error: any) {
    console.error('Error al obtener gastos CxC:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
