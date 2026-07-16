import prisma from '../lib/prisma';
import { GraphQLError } from 'graphql';
import { getUserFromRequest } from '../lib/authUtils';
import { registrarAuditoria } from '../lib/auditoriaService';
// ── Validaciones Proveedores (HU1) ────────────────────────────────────────────
const validateCedulaRuc = (val: string) => {
  if (!/^\d{10}(\d{3})?$/.test(val)) throw new GraphQLError('Cédula/RUC inválido (debe tener 10 o 13 dígitos numéricos).');
};

const validateNombre = (val: string) => {
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]{3,100}$/.test(val)) throw new GraphQLError('El nombre debe tener entre 3 y 100 caracteres y no puede contener caracteres especiales ni números.');
};

const validateCiudad = (val: string) => {
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s\-\.,]{3,50}$/.test(val)) throw new GraphQLError('La ciudad debe tener entre 3 y 50 caracteres y solo permite letras, espacios y algunos signos de puntuación.');
};

const validateTelefono = (val: string) => {
  if (!/^(0[1-9]\d{7,8}|\+?[1-9]\d{9,14})$/.test(val)) throw new GraphQLError('Formato de teléfono inválido.');
};

const validateEmail = (val: string) => {
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) throw new GraphQLError('Formato de correo inválido.');
};

const validateDireccion = (val: string) => {
  if (!/^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü\s\-\.,#]{5,200}$/.test(val)) throw new GraphQLError('La dirección debe tener entre 5 y 200 caracteres y puede contener números y letras.');
};

// ── Validaciones Facturas (HU2) ───────────────────────────────────────────────

/**
 * CA1: La fecha de la factura no puede ser futura.
 */
const validateFechaNoFutura = (fecha: string) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaFactura = new Date(fecha + 'T00:00:00');
  if (fechaFactura > hoy) {
    throw new GraphQLError('CA1: La fecha de la factura no puede ser una fecha futura.');
  }
};

/**
 * CA5: La fecha de vencimiento debe ser estrictamente posterior a la fecha de emisión.
 */
const validateFechaVencimiento = (fecha: string, fechaVencimiento: string) => {
  const fEmision = new Date(fecha + 'T00:00:00');
  const fVence = new Date(fechaVencimiento + 'T00:00:00');
  if (fVence <= fEmision) {
    throw new GraphQLError('CA5: La fecha de vencimiento debe ser posterior a la fecha de emisión.');
  }
};

export const resolvers = {
  Query: {
    listarProveedores: async (_: any, { estado, tipo, buscar }: any) => {
      try {
        const where: any = {};
        
        if (estado === 'ACTIVO') {
          where.estado = 'ACTIVO';
          where.deletedAt = null;
        } else if (estado === 'INACTIVO') {
          where.estado = 'INACTIVO';
        }

        if (tipo) where.tipo = tipo;
        if (buscar) {
          where.OR = [
            { nombre: { contains: buscar, mode: 'insensitive' } },
            { cedulaRuc: { contains: buscar } },
          ];
        }
        const res = await prisma.proveedor.findMany({ where, orderBy: { createdAt: 'desc' } });
        return res;
      } catch (e: any) {
        console.error('listarProveedores error:', e);
        throw new GraphQLError(e?.message || 'Error al listar proveedores');
      }
    },
    obtenerProveedor: async (_: any, { id }: any) => {
      return await prisma.proveedor.findUnique({ where: { id } });
    },

    // ── Catálogo Proveedor ──────────────────────────────────
    listarCatalogoProveedor: async (_: any, { proveedorId }: any) => {
      try {
        const res = await prisma.catalogo_proveedor.findMany({
          where: { proveedor_id: proveedorId },
          orderBy: { created_at: 'desc' },
        });
        return res.map((row: any) => ({
          id: row.id,
          proveedorId: row.proveedor_id,
          productoCodigo: row.producto_codigo,
          precioCompra: row.precio_compra,
          createdAt: row.created_at,
        }));
      } catch (e: any) {
        throw new GraphQLError(e.message);
      }
    },
    mejorProveedor: async (_: any, { productoCodigo }: any) => {
      try {
        const catalogos = await prisma.catalogo_proveedor.findMany({
          where: { producto_codigo: productoCodigo },
          orderBy: { precio_compra: 'asc' },
          take: 1,
        });
        if (catalogos.length === 0) return null;
        
        const proveedor = await prisma.proveedor.findUnique({
          where: { id: catalogos[0].proveedor_id },
        });
        
        if (!proveedor) return null;
        return {
          proveedor,
          precioCompra: catalogos[0].precio_compra,
        };
      } catch (e: any) {
        throw new GraphQLError(e.message);
      }
    },

    // ── Facturas (HU2) ──────────────────────────────────────
    listarFacturas: async (_: any, { estado, fechaInicio, fechaFin }: any) => {
      const where: any = {};
      if (estado) where.estado = estado;
      if (fechaInicio || fechaFin) {
        where.fecha = {};
        if (fechaInicio) where.fecha.gte = new Date(fechaInicio + 'T00:00:00.000Z');
        if (fechaFin) where.fecha.lte = new Date(fechaFin + 'T23:59:59.999Z');
      }
      const rows = await prisma.facturas_compra.findMany({ where, orderBy: { created_at: 'desc' } });
      const proveIds = Array.from(new Set(rows.map((r: any) => r.proveedor_id)));
      const proveedores = await prisma.proveedor.findMany({ where: { id: { in: proveIds } } });
      const provMap = new Map(proveedores.map((p: any) => [p.id, p.nombre]));

      return rows.map((r: any) => ({
        id: r.id,
        numeroFactura: r.numero_factura,
        numeroFacturaProveedor: r.numero_factura_proveedor,
        fecha: r.fecha?.toISOString().split('T')[0],
        proveedorId: r.proveedor_id,
        proveedorNombre: provMap.get(r.proveedor_id) || 'Proveedor Desconocido',
        tipoPago: r.tipo_pago,
        fechaVencimiento: r.fecha_vencimiento?.toISOString().split('T')[0] ?? null,
        subtotalSinIva: Number(r.subtotal_sin_iva),
        subtotalConIva: Number(r.subtotal_con_iva),
        totalIva: Number(r.total_iva),
        total: Number(r.total),
        estado: r.estado,
        observaciones: r.observaciones,
      }));
    },
    obtenerFactura: async (_: any, { id }: any) => {
      const r = await prisma.facturas_compra.findUnique({ where: { id } });
      if (!r) return null;
      return {
        id: r.id,
        numeroFactura: r.numero_factura,
        numeroFacturaProveedor: r.numero_factura_proveedor,
        fecha: r.fecha?.toISOString().split('T')[0],
        proveedorId: r.proveedor_id,
        tipoPago: r.tipo_pago,
        fechaVencimiento: r.fecha_vencimiento?.toISOString().split('T')[0] ?? null,
        subtotalSinIva: Number(r.subtotal_sin_iva),
        subtotalConIva: Number(r.subtotal_con_iva),
        totalIva: Number(r.total_iva),
        total: Number(r.total),
        estado: r.estado,
        observaciones: r.observaciones,
      };
    },

    // ── HU8: Historial de Auditoría ─────────────────────────
    listarAuditoria: async (
      _: any,
      {
        usuarioId,
        accion,
        tablaAfectada,
        fechaInicio,
        fechaFin,
        limite = 50,
        pagina = 1,
      }: any,
      context: any
    ) => {
      // 1. Verificar autenticación y rol permitido
      const payload = await getUserFromRequest(context.request) as any;
      if (!payload) {
        throw new GraphQLError('No autenticado. Inicia sesión para ver la auditoría.');
      }
      if (!['ADMIN', 'AUDITOR'].includes(payload.rol)) {
        throw new GraphQLError('No autorizado. Solo ADMIN y AUDITOR pueden consultar el historial de auditoría.');
      }

      // 2. Construir filtros dinámicos (solo los que el usuario pasó)
      const where: any = {};
      if (usuarioId)      where.usuario_id = Number(usuarioId);
      if (accion)         where.accion = accion;
      if (tablaAfectada)  where.tabla_afectada = tablaAfectada;
      if (fechaInicio || fechaFin) {
        where.fecha_hora = {};
        if (fechaInicio) where.fecha_hora.gte = new Date(fechaInicio + 'T00:00:00');
        if (fechaFin)    where.fecha_hora.lte = new Date(fechaFin + 'T23:59:59');
      }

      // 3. Limitar a máximo 200 registros por página para no sobrecargar
      const limiteFinal = Math.min(Number(limite) || 50, 200);
      const paginaFinal = Math.max(Number(pagina) || 1, 1);
      const skip = (paginaFinal - 1) * limiteFinal;

      // 4. Consultar total y datos en paralelo
      const [total, registros] = await Promise.all([
        prisma.pista_auditoria.count({ where }),
        prisma.pista_auditoria.findMany({
          where,
          orderBy: { fecha_hora: 'desc' },
          take: limiteFinal,
          skip,
        }),
      ]);

      // 5. Mapear (BigInt → String para compatibilidad con JavaScript)
      const data = registros.map((r: any) => ({
        id:             r.id.toString(),
        fechaHora:      r.fecha_hora.toISOString(),
        usuarioId:      r.usuario_id,
        usuarioNombre:  r.usuario_nombre,
        accion:         r.accion,
        tablaAfectada:  r.tabla_afectada,
        registroId:     r.registro_id?.toString() ?? null,
        descripcion:    r.descripcion ?? null,
        resultado:      r.resultado,
      }));

      return {
        data,
        total,
        pagina: paginaFinal,
        totalPaginas: Math.ceil(total / limiteFinal),
      };
    },
  },

  Mutation: {
    // ── Proveedores ─────────────────────────────────────────
    crearProveedor: async (_: any, { input }: any, context: any) => {
      validateCedulaRuc(input.cedulaRuc);
      validateNombre(input.nombre);
      validateCiudad(input.ciudad);
      validateTelefono(input.telefono);
      validateEmail(input.email);
      validateDireccion(input.direccion);

      // CA2: Check if cedula exists manually
      const exists = await prisma.proveedor.findUnique({ where: { cedulaRuc: input.cedulaRuc } });
      if (exists) {
        throw new GraphQLError('Ya existe un proveedor con esta Cédula/RUC.');
      }

      try {
        const nuevo = await prisma.proveedor.create({
          data: {
            ...input,
            created_by: 1
          },
        });
        
        if (context?.request) {
          const usuario = await getUserFromRequest(context.request);
          if (usuario) {
            await registrarAuditoria(usuario.id as number, usuario.nombre as string, 'CREAR', 'proveedor', nuevo.id, null, nuevo, 'Creación de proveedor');
          }
        }
        
        return nuevo;
      } catch (err: any) {
        if (err.code === 'P2002') throw new GraphQLError('La cédula/RUC ya está registrada en el sistema.');
        throw err;
      }
    },
    actualizarProveedor: async (_: any, { id, input }: any, context: any) => {
      if (input.nombre) validateNombre(input.nombre);
      if (input.ciudad) validateCiudad(input.ciudad);
      if (input.telefono) validateTelefono(input.telefono);
      if (input.email) validateEmail(input.email);
      if (input.direccion) validateDireccion(input.direccion);

      // Sincronizar el campo deletedAt con el estado
      if (input.estado === 'ACTIVO') {
        input.deletedAt = null;
      } else if (input.estado === 'INACTIVO') {
        input.deletedAt = new Date();
      }

      try {
        const anterior = await prisma.proveedor.findUnique({ where: { id } });
        const actualizado = await prisma.proveedor.update({
          where: { id },
          data: input,
        });

        if (context?.request) {
          const usuario = await getUserFromRequest(context.request);
          if (usuario) {
            await registrarAuditoria(usuario.id as number, usuario.nombre as string, 'ACTUALIZAR', 'proveedor', actualizado.id, anterior, actualizado, 'Actualización de proveedor');
          }
        }

        return actualizado;
      } catch (err: any) {
        if (err.code === 'P2002') throw new GraphQLError('La cédula/RUC ya está registrada en el sistema.');
        throw err;
      }
    },
    eliminarProveedor: async (_: any, { id }: any, context: any) => {
      // CA3: Soft delete (cambiar estado a INACTIVO)
      const anterior = await prisma.proveedor.findUnique({ where: { id } });
      const borrado = await prisma.proveedor.update({
        where: { id },
        data: {
          estado: 'INACTIVO',
          deletedAt: new Date(),
        },
      });

      if (context?.request) {
        const usuario = await getUserFromRequest(context.request);
        if (usuario) {
          await registrarAuditoria(usuario.id as number, usuario.nombre as string, 'ELIMINAR', 'proveedor', borrado.id, anterior, borrado, 'Eliminación lógica de proveedor');
        }
      }

      return borrado;
    },

    // ── Facturas (HU2) ──────────────────────────────────────
    crearFacturaCabecera: async (_: any, { input }: any, context: any) => {
      const { fecha, proveedorId, tipoPago, fechaVencimiento, numeroFacturaProveedor, observaciones } = input;

      // CA1: Fecha no puede ser futura
      validateFechaNoFutura(fecha);

      // CA2: Proveedor debe existir y estar ACTIVO
      const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId } });
      if (!proveedor || proveedor.deletedAt !== null) {
        throw new GraphQLError('CA2: El proveedor no existe.');
      }
      if (proveedor.estado !== 'ACTIVO') {
        throw new GraphQLError('CA2: El proveedor está inactivo y no puede emitir facturas.');
      }

      // CA3: Permiso de Crédito — solo proveedores tipo CREDITO pueden pagar a crédito
      if (tipoPago === 'CREDITO' && proveedor.tipo !== 'CREDITO') {
        throw new GraphQLError('CA3: El proveedor no tiene habilitado el tipo de pago a Crédito.');
      }

      // CA4 y CA5: Validaciones de fecha de vencimiento para CREDITO
      if (tipoPago === 'CREDITO') {
        if (!fechaVencimiento) {
          throw new GraphQLError('CA4: La fecha de vencimiento es obligatoria para facturas a Crédito.');
        }
        validateFechaVencimiento(fecha, fechaVencimiento); // CA5
      }

      // CA6: CONTADO no debe tener fecha de vencimiento
      const fechaVencimientoFinal = tipoPago === 'CONTADO' ? null : new Date(fechaVencimiento + 'T00:00:00');

      const nueva = await prisma.facturas_compra.create({
        data: {
          fecha: new Date(fecha + 'T00:00:00'),
          proveedor_id: proveedorId,
          tipo_pago: tipoPago,
          fecha_vencimiento: fechaVencimientoFinal,
          numero_factura_proveedor: numeroFacturaProveedor ?? null,
          observaciones: observaciones ?? null,
          estado: 'BORRADOR',
          created_by: 1,
        },
      });

      if (context?.request) {
        const usuario = await getUserFromRequest(context.request);
        if (usuario) {
          await registrarAuditoria(usuario.id as number, usuario.nombre as string, 'CREAR', 'facturas_compra', nueva.id, null, nueva, 'Creación de cabecera de factura');
        }
      }

      return {
        id: nueva.id,
        numeroFactura: nueva.numero_factura,
        numeroFacturaProveedor: nueva.numero_factura_proveedor,
        fecha: nueva.fecha?.toISOString().split('T')[0],
        proveedorId: nueva.proveedor_id,
        tipoPago: nueva.tipo_pago,
        fechaVencimiento: nueva.fecha_vencimiento?.toISOString().split('T')[0] ?? null,
        subtotalSinIva: Number(nueva.subtotal_sin_iva),
        subtotalConIva: Number(nueva.subtotal_con_iva),
        totalIva: Number(nueva.total_iva),
        total: Number(nueva.total),
        estado: nueva.estado,
        observaciones: nueva.observaciones,
      };
    },

    agregarAlCatalogo: async (_: any, { proveedorId, productoCodigo, precioCompra }: any) => {
      try {
        const existente = await prisma.catalogo_proveedor.findFirst({
          where: {
            proveedor_id: proveedorId,
            producto_codigo: productoCodigo,
          },
        });

        let item;
        if (existente) {
          item = await prisma.catalogo_proveedor.update({
            where: { id: existente.id },
            data: { precio_compra: precioCompra },
          });
        } else {
          item = await prisma.catalogo_proveedor.create({
            data: {
              proveedor_id: proveedorId,
              producto_codigo: productoCodigo,
              precio_compra: precioCompra,
            },
          });
        }
        
        return {
          id: item.id,
          proveedorId: item.proveedor_id,
          productoCodigo: item.producto_codigo,
          precioCompra: Number(item.precio_compra),
          createdAt: item.created_at.toISOString(),
          updatedAt: item.updated_at.toISOString(),
        };
      } catch (e: any) {
        throw new GraphQLError('Error al agregar al catálogo: ' + e.message);
      }
    },
    crearProductoGlobalYCatalogo: async (_: any, { proveedorId, precioCompra, input }: any) => {
      try {
        // Se deshabilitó la creación en API externa porque el catálogo es propio del Módulo de Compras
        // await crearProductoGlobal(input);

        // 2. Agregar al catálogo local
        const item = await prisma.catalogo_proveedor.create({
          data: {
            proveedor_id: proveedorId,
            producto_codigo: input.codigo,
            precio_compra: precioCompra,
          },
        });

        return {
          id: item.id,
          proveedorId: item.proveedor_id,
          productoCodigo: item.producto_codigo,
          precioCompra: Number(item.precio_compra),
          createdAt: item.created_at.toISOString(),
          updatedAt: item.updated_at.toISOString(),
        };
      } catch (e: any) {
        throw new GraphQLError(e.message);
      }
    },

    eliminarDelCatalogo: async (_: any, { id }: any) => {
      try {
        await prisma.catalogo_proveedor.delete({ where: { id } });
        return true;
      } catch (e: any) {
        throw new GraphQLError('Error al eliminar del catálogo: ' + e.message);
      }
    },
  },
};

