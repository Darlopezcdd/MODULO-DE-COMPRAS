import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadPdfToS3 } from '@/lib/awsS3';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  try {
    const factura = await prisma.facturas_compra.findUnique({
      where: { id }
    });

    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    if (factura.pdf_url) {
      return NextResponse.redirect(factura.pdf_url);
    }

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: factura.proveedor_id }
    });

    const detalles = await prisma.detalle_factura_compra.findMany({
      where: { factura_id: factura.id }
    });

    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    const datosPdf = {
      numeroFactura: factura.numero_factura || `FC-${id.toString().padStart(6, '0')}`,
      fechaEmision: factura.fecha.toISOString().split('T')[0],
      tipoPago: factura.tipo_pago,
      proveedor: {
        nombre: proveedor.nombre,
        cedulaRuc: proveedor.cedulaRuc,
        direccion: proveedor.direccion || '',
        telefono: proveedor.telefono || ''
      },
      productos: detalles.map(d => ({
        codigo: d.producto_codigo,
        descripcion: d.producto_nombre,
        cantidad: Number(d.cantidad),
        pvp: Number(d.pvp),
        grabaIva: d.graba_iva,
        porcentajeIva: Number(d.porcentaje_iva)
      })),
      totales: {
        subtotalSinIva: Number(factura.subtotal_sin_iva),
        subtotalConIva: Number(factura.subtotal_con_iva),
        totalIva: Number(factura.total_iva),
        total: Number(factura.total)
      }
    };

    const LAMBDA_URL = 'https://ygetpml7c6pve4d7hhrbtop3740zfhhy.lambda-url.us-east-1.on.aws/';

    const lambdaResponse = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosPdf)
    });

    if (!lambdaResponse.ok) {
      const lambdaErrorText = await lambdaResponse.text();
      throw new Error(`Error en Lambda: ${lambdaResponse.status} - ${lambdaErrorText}`);
    }

    const pdfArrayBuffer = await lambdaResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    const fileName = `factura-compra-${id}-${Date.now()}.pdf`;

    // 4. Subir el buffer generado a Amazon S3
    const s3Url = await uploadPdfToS3(pdfBuffer, fileName);

    // 5. Intentamos guardar la URL en la base de datos
    // Si la base de datos bloquea la actualización (porque la factura ya fue emitida), no importa
    // Atrapamos el error silenciosamente y mostramos el PDF de todas formas
    try {
      await prisma.facturas_compra.update({
        where: { id },
        data: {
          pdf_url: s3Url,
          pdf_generado: true
        }
      });
    } catch (dbError) {
      console.warn('Supabase bloqueó la escritura porque la factura ya estaba emitida. Omitiendo actualización de BD...');
    }

    // 6. Redirigir al usuario al documento en S3
    return NextResponse.redirect(s3Url);
  } catch (error: any) {
    console.error('Error generando PDF con Lambda:', error);
    return NextResponse.json({ error: `Error interno: ${error.message || error}` }, { status: 500 });
  }
}
