import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/auditoriaService';

/**
 * @swagger
 * /api/facturas:
 *   post:
 *     summary: Generar nueva factura de compra
 *     description: Registra una factura de compra y sus detalles. Si la factura es a CRÉDITO, genera automáticamente el saldo de cuenta por pagar.
 *     tags:
 *       - Facturas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proveedorId
 *               - productos
 *             properties:
 *               proveedorId:
 *                 type: integer
 *                 example: 1
 *               tipoPago:
 *                 type: string
 *                 enum: [CONTADO, CREDITO]
 *                 example: CONTADO
 *               fechaVencimiento:
 *                 type: string
 *                 format: date
 *                 example: "2026-07-25"
 *               observaciones:
 *                 type: string
 *               productos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     codigo:
 *                       type: string
 *                     descripcion:
 *                       type: string
 *                     cantidad:
 *                       type: number
 *                     pvp:
 *                       type: number
 *                     grabaIva:
 *                       type: boolean
 *                     porcentajeIva:
 *                       type: number
 *     responses:
 *       200:
 *         description: Factura creada exitosamente
 *       400:
 *         description: Faltan datos obligatorios
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { proveedorId, tipoPago, fechaVencimiento, productos, observaciones } = data;

    if (!proveedorId || !productos || productos.length === 0) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    const factura = await prisma.$transaction(async (tx) => {
      // 1. Crear cabecera como BORRADOR (obligatorio para permitir insertar detalles por los triggers)
      const nuevaFactura = await tx.facturas_compra.create({
        data: {
          fecha: new Date(),
          proveedor_id: proveedorId,
          tipo_pago: tipoPago || 'CONTADO',
          fecha_vencimiento: tipoPago === 'CREDITO' && fechaVencimiento ? new Date(fechaVencimiento) : null,
          observaciones: observaciones || null,
          estado: 'BORRADOR', // Se debe crear como BORRADOR inicialmente
          pdf_generado: false,
          created_by: 1, // Usuario dummy o del sistema
        },
      });

      // 2. Crear detalles
      for (const prod of productos) {
        const subtotal = prod.cantidad * prod.pvp;
        const valor_iva = prod.grabaIva ? subtotal * (prod.porcentajeIva / 100) : 0;
        const total_linea = subtotal + valor_iva;

        await tx.detalle_factura_compra.create({
          data: {
            factura_id: nuevaFactura.id,
            producto_id: 0, // Referencia dummy porque el código es string y no tenemos ID entero
            producto_codigo: prod.codigo,
            producto_nombre: prod.descripcion,
            cantidad: prod.cantidad,
            pvp: prod.pvp,
            graba_iva: prod.grabaIva,
            porcentaje_iva: prod.grabaIva ? prod.porcentajeIva : 0,
            subtotal,
            valor_iva,
            total_linea,
          },
        });
      }

      // 3. Crear saldo si es CREDITO
      if (tipoPago === 'CREDITO') {
        // Los totales se recalculan automáticamente por el trigger de la base de datos
        let totalFactura = 0;
        for (const prod of productos) {
          const subtotal = prod.cantidad * prod.pvp;
          const valor_iva = prod.grabaIva ? subtotal * (prod.porcentajeIva / 100) : 0;
          totalFactura += subtotal + valor_iva;
        }

        await tx.saldos_credito_proveedor.create({
          data: {
            proveedor_id: proveedorId,
            factura_id: nuevaFactura.id,
            monto_credito: totalFactura,
            monto_pagado: 0,
            fecha_vencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
            estado: 'PENDIENTE',
          },
        });
      }
      
      // 4. Cambiar estado a EMITIDA ahora que ya están los detalles listos
      const facturaFinalizada = await tx.facturas_compra.update({
        where: { id: nuevaFactura.id },
        data: {
          estado: 'EMITIDA',
          pdf_generado: true
        }
      });

      return facturaFinalizada;
    });

    await registrarAuditoria(1, 'Admin', 'CREAR', 'facturas_compra', factura.id, null, factura, 'Generación completa de Factura');

    return NextResponse.json({ success: true, factura });
  } catch (error: any) {
    console.error('Error al generar factura:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/facturas:
 *   get:
 *     summary: Listar facturas de compra (Integración Inventario)
 *     description: Obtiene las facturas de compra generadas junto con sus detalles de productos. Utilizado por el módulo de Inventario para actualizar el Kardex.
 *     tags:
 *       - Facturas
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Cantidad máxima de facturas a retornar
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           default: EMITIDA
 *         description: Estado de la factura
 *     responses:
 *       200:
 *         description: Lista de facturas
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
 *                     type: object
 *                     properties:
 *                       facturaId:
 *                         type: integer
 *                       numeroFactura:
 *                         type: string
 *                       proveedor:
 *                         type: string
 *                       estado:
 *                         type: string
 *                       productos:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             codigoProducto:
 *                               type: string
 *                             nombreProducto:
 *                               type: string
 *                             cantidadComprada:
 *                               type: number
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const estado = searchParams.get('estado') || 'EMITIDA';

    const facturas = await prisma.facturas_compra.findMany({
      where: { estado: estado as any },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        proveedor: {
          select: { nombre: true, cedula_ruc: true }
        },
        detalle_factura_compra: true
      }
    });

    // Formatear para que sea fácil de consumir por el módulo de inventarios
    const facturasFormateadas = facturas.map(f => ({
      facturaId: f.id,
      numeroFactura: f.numero_factura,
      fechaEmision: f.fecha,
      proveedor: f.proveedor?.nombre,
      estado: f.estado,
      productos: f.detalle_factura_compra.map(d => ({
        codigoProducto: d.producto_codigo,
        nombreProducto: d.producto_nombre,
        cantidadComprada: d.cantidad,
        costoUnitario: d.pvp,
        totalLinea: d.total_linea
      }))
    }));

    return NextResponse.json({
      success: true,
      data: facturasFormateadas
    });
  } catch (error: any) {
    console.error('Error al obtener facturas para inventario:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
