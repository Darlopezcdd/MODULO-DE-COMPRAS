// src/app/api/inventario/productos/route.ts
// HU3 — Mock inicial de API de Inventario (Mocking con IA — Aldahir Requene)
// Estructura preparada para conectar con el módulo real de Inventarios (Jairo Farinango)

import { NextResponse } from 'next/server';

export interface ProductoInventario {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  pvp: number;
  grabaIva: boolean;
  porcentajeIva: number;
  stock: number;
  unidad: string;
}

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
    const buscar  = (searchParams.get('buscar')  ?? '').toLowerCase().trim();
    const pagina  = Math.max(1, parseInt(searchParams.get('pagina')  ?? '1'));
    const limite  = Math.min(50, Math.max(1, parseInt(searchParams.get('limite') ?? '10')));

    // Llamada a la API real
    const response = await fetch('https://api-inventario-v1gh.onrender.com/api/productos/catalogo', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 } // caché de 60 segundos
    });

    if (!response.ok) {
      throw new Error(`La API externa devolvió el estado: ${response.status}`);
    }

    const apiData = await response.json();
    const productosExternos = apiData.data || [];

    // Mapear al formato local
    let resultados: ProductoInventario[] = productosExternos.map((p: any, index: number) => ({
      id: index + 1, // La API externa no devuelve ID, usamos un índice
      codigo: p.codigo || `N/A-${index}`,
      nombre: p.nombre || 'Sin nombre',
      categoria: 'General', // No viene en la API externa
      pvp: parseFloat(p.pvp || '0'),
      grabaIva: Boolean(p.graba_iva),
      porcentajeIva: Number(p.porcentaje_iva_aplicado || 0),
      stock: Number(p.stock_actual || 0),
      unidad: 'Unidad' // No viene en la API externa
    }));

    // Filtrar por búsqueda (nombre o código)
    if (buscar) {
      resultados = resultados.filter(
        p => p.nombre.toLowerCase().includes(buscar) ||
             p.codigo.toLowerCase().includes(buscar)
      );
    }

    // Paginación
    const total       = resultados.length;
    const totalPaginas = Math.ceil(total / limite);
    const inicio      = (pagina - 1) * limite;
    const data        = resultados.slice(inicio, inicio + limite);

    return NextResponse.json({
      success: true,
      data,
      total,
      pagina,
      limite,
      totalPaginas,
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
