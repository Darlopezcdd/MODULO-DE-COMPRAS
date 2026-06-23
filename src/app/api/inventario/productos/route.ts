// src/app/api/inventario/productos/route.ts
// Proxy hacia la API externa de Inventarios con búsqueda y paginación

import { NextResponse } from 'next/server';
import { buscarProductos } from '@/lib/inventariosClient';

/**
 * @swagger
 * /api/inventario/productos:
 *   get:
 *     summary: Buscar productos del catálogo de inventario
 *     description: Consulta el catálogo de productos desde la API externa de inventarios. Soporta búsqueda por nombre/código y paginación.
 *     tags:
 *       - Inventario
 *     parameters:
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Término de búsqueda por nombre o código de producto
 *         example: resma
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página (mínimo 1)
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Cantidad de resultados por página (máximo 50)
 *     responses:
 *       200:
 *         description: Lista paginada de productos
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
 *                     $ref: '#/components/schemas/ProductoInventario'
 *                 total:
 *                   type: integer
 *                   example: 42
 *                 pagina:
 *                   type: integer
 *                   example: 1
 *                 limite:
 *                   type: integer
 *                   example: 10
 *                 totalPaginas:
 *                   type: integer
 *                   example: 5
 *       500:
 *         description: Error al obtener productos de inventario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const buscar = (searchParams.get('buscar') ?? '').trim();
    const pagina = Math.max(1, parseInt(searchParams.get('pagina') ?? '1'));
    const limite = Math.min(50, Math.max(1, parseInt(searchParams.get('limite') ?? '10')));

    const resultado = await buscarProductos(buscar, pagina, limite);

    return NextResponse.json({
      ...resultado,
      limite,
      _meta: { fuente: 'api-inventario-externa', version: '1.0.0' },
    });

  } catch (error: any) {
    console.error("Error al obtener catálogo:", error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener productos de inventario.', details: error.message },
      { status: 500 }
    );
  }
}
