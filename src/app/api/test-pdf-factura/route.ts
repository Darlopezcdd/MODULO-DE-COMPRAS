// src/app/api/test-pdf-factura/route.ts
// HU4 — Endpoint de PRUEBA TEMPORAL para visualizar el PDF de la factura (Tarea: Aldahir Requene)
// Genera un PDF de ejemplo en memoria y lo descarga al navegador.

import { NextResponse } from 'next/server';
import { generarFacturaPDF, DatosFacturaPDF } from '@/lib/facturaPdf';

export async function GET() {
  try {
    // 1. Datos mockeados de una Factura de Compra
    const mockFactura: DatosFacturaPDF = {
      numeroFactura: '001-002-000000123',
      fechaEmision: new Date().toLocaleDateString('es-EC'),
      tipoPago: 'CREDITO',
      proveedor: {
        nombre: 'Importadora Comercial ABC S.A.',
        cedulaRuc: '1790012345001',
        direccion: 'Av. Simón Bolívar km 4.5 y Ruta Viva, Quito - Ecuador',
        telefono: '02-245-6789'
      },
      productos: [
        { codigo: 'TEC-001', descripcion: 'Laptop Dell Inspiron 15', cantidad: 2, pvp: 850.00, grabaIva: true, porcentajeIva: 15 },
        { codigo: 'TEC-002', descripcion: 'Monitor LG 24" Full HD', cantidad: 4, pvp: 140.00, grabaIva: true, porcentajeIva: 15 },
        { codigo: 'PAP-001', descripcion: 'Resma Papel Bond A4', cantidad: 10, pvp: 4.50, grabaIva: true, porcentajeIva: 15 },
        { codigo: 'ALI-001', descripcion: 'Café soluble Nescafé 200g (Insumos Oficina)', cantidad: 5, pvp: 6.80, grabaIva: false, porcentajeIva: 0 }
      ],
      totales: {
        subtotalSinIva: 34.00,       // 5 * 6.80 (Café)
        subtotalConIva: 2305.00,     // 1700 (Laptops) + 560 (Monitores) + 45 (Papel)
        totalIva: 345.75,            // 2305 * 0.15
        total: 2684.75               // 34 + 2305 + 345.75
      }
    };

    // 2. Generar el PDF como buffer
    const pdfBuffer = await generarFacturaPDF(mockFactura);

    // 3. Devolver como descarga (convertimos Node Buffer a Uint8Array)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="prueba-factura.pdf"'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error generando PDF de prueba', detalles: error.message }, { status: 500 });
  }
}
