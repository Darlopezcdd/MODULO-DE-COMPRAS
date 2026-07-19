import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadPdfToS3 } from '@/lib/awsS3';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  try {
    // 1. Obtener la factura de la base de datos
    const factura = await prisma.facturas_compra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        detalles: { include: { producto: true } }
      }
    });

    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    // SI LA FACTURA YA TIENE UN PDF GENERADO PREVIAMENTE, SIMPLEMENTE LO MOSTRAMOS Y EVITAMOS ERROR DE SUPABASE
    if (factura.pdf_url) {
      return NextResponse.redirect(factura.pdf_url);
    }

    // 2. Si no tiene PDF, preparamos los datos para enviarlos a AWS Lambda
    const datosPdf = {
      numeroFactura: factura.numero_factura || `FC-${id.toString().padStart(6, '0')}`,
      fechaEmision: factura.fecha_emision.toISOString().split('T')[0],
      tipoPago: factura.tipo_pago,
      proveedor: {
        nombre: factura.proveedor.razon_social,
        cedulaRuc: factura.proveedor.ruc,
        direccion: factura.proveedor.direccion || '',
        telefono: factura.proveedor.telefono || ''
      },
      productos: factura.detalles.map(d => ({
        codigo: d.producto.codigo,
        descripcion: d.producto.nombre,
        cantidad: d.cantidad,
        pvp: Number(d.precio_unitario),
        grabaIva: true,
        porcentajeIva: 15
      })),
      totales: {
        subtotalSinIva: Number(factura.subtotal),
        subtotalConIva: Number(factura.subtotal),
        totalIva: Number(factura.impuestos),
        total: Number(factura.total)
      }
    };

    // 3. LLAMADA A AWS LAMBDA PARA GENERAR EL PDF
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

    // 5. Guardar la URL en la base de datos para que la próxima vez no la vuelva a generar
    await prisma.facturas_compra.update({
      where: { id },
      data: {
        pdf_url: s3Url,
        pdf_generado: true
      }
    });

    // 6. Redirigir al usuario al documento en S3
    return NextResponse.redirect(s3Url);
  } catch (error: any) {
    console.error('Error generando PDF de factura con Lambda:', error);
    return NextResponse.json({ error: `Error interno: ${error.message || error}` }, { status: 500 });
  }
}