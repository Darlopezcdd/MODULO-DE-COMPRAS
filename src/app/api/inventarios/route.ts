import { NextResponse } from 'next/server';
import { buscarProductos } from '@/lib/inventariosClient';

/**
 * @swagger
 * /api/inventarios:
 *   get:
 *     summary: Buscar productos (integración módulo Inventarios)
 *     description: Proxy hacia el módulo de Inventarios de Jairo Farinango. Busca productos por término con paginación.
 *     tags:
 *       - Inventario
 *     parameters:
 *       - in: query
 *         name: termino
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Resultado de búsqueda de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductoInventario'
 *       502:
 *         description: Error de integración con el módulo de Inventarios
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const termino = searchParams.get('termino') || '';
    const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10));
    const limite = Math.min(50, Math.max(1, parseInt(searchParams.get('limite') || '10', 10)));

    const resultado = await buscarProductos(termino, pagina, limite);

    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      {
        success: false,
        error: 'Error de integración con el módulo de Inventarios',
        details: message,
      },
      { status: 502 }
    );
  }
}
