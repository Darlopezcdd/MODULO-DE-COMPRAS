import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generarCatalogoPDF, DatosCatalogoPDF } from '@/lib/catalogoPdf';
import { getInventarioClient } from '@/lib/inventariosClient';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const proveedor = await prisma.proveedor.findUnique({
      where: { id },
      include: {
        catalogos: true
      }
    });

    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    // Fetch inventario for names and stock
    const invRes = await getInventarioClient({ limit: 500 });
    const productosInventario = invRes.success ? invRes.data : [];

    const productosCatalogo = proveedor.catalogos.map(cat => {
      const pInv = productosInventario.find((p: any) => p.codigo === cat.producto_codigo);
      return {
        codigo: cat.producto_codigo,
        nombre: pInv ? pInv.nombre : 'Producto Desconocido',
        stockActual: pInv ? pInv.stockActual : 0,
        precioCompra: Number(cat.precio_compra)
      };
    });

    const datosPdf: DatosCatalogoPDF = {
      proveedor: {
        nombre: proveedor.nombre,
        cedulaRuc: proveedor.cedulaRuc,
        ciudad: proveedor.ciudad
      },
      productos: productosCatalogo
    };

    const pdfBuffer = await generarCatalogoPDF(datosPdf);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="catalogo-${proveedor.cedulaRuc}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error generando PDF de catálogo:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
