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
    const gastos = await prisma.gastos_cxc.findMany({
      orderBy: {
        fecha_pago: 'desc'
      }
    });

    return NextResponse.json({ success: true, data: gastos });
  } catch (error: any) {
    console.error('Error al obtener gastos CxC:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
