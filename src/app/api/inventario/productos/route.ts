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
