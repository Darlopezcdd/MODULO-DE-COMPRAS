import { NextResponse } from 'next/server';
import { buscarProductos } from '@/lib/inventariosClient';

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
