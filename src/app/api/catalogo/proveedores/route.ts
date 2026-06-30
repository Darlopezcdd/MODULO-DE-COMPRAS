import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/catalogo/proveedores:
 *   get:
 *     summary: Obtener catálogo de productos y sus proveedores
 *     description: Retorna una lista de productos agrupados con los proveedores que los distribuyen y su respectivo precio de compra. Este endpoint es consumido por el módulo de Inventarios.
 *     tags:
 *       - Catálogo
 *     responses:
 *       200:
 *         description: Catálogo obtenido exitosamente
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
export async function GET() {
  try {
    // Obtener todo el catálogo junto con los datos del proveedor
    const catalogo = await prisma.catalogo_proveedor.findMany({
      include: {
        proveedor: {
          select: {
            id: true,
            cedulaRuc: true,
            nombre: true,
            estado: true
          }
        }
      }
    });

    // Agrupar por producto_codigo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agrupado = catalogo.reduce((acc: any, item: any) => {
      const codigo = item.producto_codigo;
      if (!acc[codigo]) {
        acc[codigo] = {
          codigoProducto: codigo,
          proveedores: []
        };
      }
      
      // Solo agregar proveedores activos
      if (item.proveedor.estado === 'ACTIVO') {
        acc[codigo].proveedores.push({
          proveedorId: item.proveedor.id,
          cedulaRuc: item.proveedor.cedulaRuc,
          nombre: item.proveedor.nombre,
          precioCompra: Number(item.precio_compra)
        });
      }
      
      return acc;
    }, {});

    // Convertir a array
    const data = Object.values(agrupado);

    return NextResponse.json({
      success: true,
      data
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error al obtener catálogo global:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders }
    );
  }
}
