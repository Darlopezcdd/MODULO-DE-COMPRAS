import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Módulo de Compras - API REST',
        version: '1.0.0',
        description:
          'Documentación de la API REST del Módulo de Compras. ' +
          'Este módulo gestiona proveedores, facturas de compra, inventario, reportes y autenticación. ' +
          'Además expone un endpoint GraphQL en `/api/graphql` para operaciones CRUD de proveedores y facturas.',
        contact: {
          name: 'Equipo de Desarrollo - Módulo de Compras',
        },
      },
      servers: [
        {
          url: '/',
          description: 'Servidor actual',
        },
        {
          url: 'https://modulo-compras.vercel.app',
          description: 'Producción — Vercel (Módulo de Compras)',
        },
        {
          url: 'https://modulo-compras.vercel.app',
          description: 'Producción — Vercel (Módulo de Compras)',
        },
      ],
      tags: [
        { name: 'Auth', description: 'Autenticación y gestión de sesiones (JWT)' },
        { name: 'Inventario', description: 'Consulta de productos del catálogo de inventario' },
        { name: 'Facturas', description: 'Detalle y consulta de facturas de compra' },
        { name: 'Reportes', description: 'Generación de reportes en PDF, CSV y JSON' },
        { name: 'PDF', description: 'Previsualización y generación de PDFs de factura' },
        { name: 'GraphQL', description: 'Endpoint GraphQL para CRUD de proveedores y facturas' },
        { name: 'Auditoría', description: 'Historial de pistas de auditoría — solo ADMIN y AUDITOR (HU8)' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'auth-token',
            description: 'Token JWT enviado como cookie httpOnly tras iniciar sesión en POST /api/auth/login',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Descripción del error' },
            },
          },
          UsuarioLogin: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email', example: 'admin@compras.com' },
              password: { type: 'string', format: 'password', example: '123456' },
            },
          },
          LoginResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              usuario: {
                type: 'object',
                properties: {
                  id: { type: 'integer', example: 1 },
                  nombre: { type: 'string', example: 'Admin' },
                  email: { type: 'string', example: 'admin@compras.com' },
                  rol: { type: 'string', example: 'ADMIN' },
                },
              },
            },
          },
          ProductoInventario: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              codigo: { type: 'string', example: 'PROD-001' },
              nombre: { type: 'string', example: 'Resma de papel A4' },
              categoria: { type: 'string', example: 'General' },
              pvp: { type: 'number', format: 'float', example: 4.5 },
              grabaIva: { type: 'boolean', example: true },
              porcentajeIva: { type: 'number', example: 15 },
              stock: { type: 'number', example: 200 },
              unidad: { type: 'string', example: 'Unidad' },
            },
          },
          Proveedor: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              cedulaRuc: { type: 'string', example: '1712345678001' },
              nombre: { type: 'string', example: 'Distribuidora Nacional' },
              ciudad: { type: 'string', example: 'Quito' },
              tipo: { type: 'string', enum: ['CONTADO', 'CREDITO'], example: 'CREDITO' },
              direccion: { type: 'string', example: 'Av. 10 de Agosto N35-12' },
              telefono: { type: 'string', example: '0998765432' },
              email: { type: 'string', example: 'ventas@distribuidora.com' },
              estado: { type: 'string', enum: ['ACTIVO', 'INACTIVO'], example: 'ACTIVO' },
            },
          },
          FacturaCompra: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              numeroFactura: { type: 'string', example: 'FC-2026-00001' },
              fecha: { type: 'string', format: 'date-time' },
              tipoPago: { type: 'string', enum: ['CONTADO', 'CREDITO'] },
              estado: { type: 'string', enum: ['BORRADOR', 'EMITIDA', 'ANULADA'] },
              subtotalSinIva: { type: 'number', format: 'float', example: 100.0 },
              subtotalConIva: { type: 'number', format: 'float', example: 50.0 },
              totalIva: { type: 'number', format: 'float', example: 7.5 },
              total: { type: 'number', format: 'float', example: 157.5 },
            },
          },
          DetalleFactura: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              factura_id: { type: 'integer' },
              producto_nombre: { type: 'string' },
              cantidad: { type: 'number' },
              pvp: { type: 'number', format: 'float' },
              total_linea: { type: 'number', format: 'float' },
            },
          },
          PistaAuditoria: {
            type: 'object',
            properties: {
              id:             { type: 'string', example: '1' },
              fechaHora:      { type: 'string', format: 'date-time', example: '2026-06-24T20:00:00.000Z' },
              usuarioId:      { type: 'integer', example: 1 },
              usuarioNombre:  { type: 'string', example: 'Admin' },
              accion:         { type: 'string', enum: ['LOGIN','LOGOUT','CREAR','ACTUALIZAR','ELIMINAR','IMPRIMIR'], example: 'CREAR' },
              modulo:         { type: 'string', example: 'COMPRAS' },
              tablaAfectada:  { type: 'string', example: 'proveedor' },
              registroId:     { type: 'string', nullable: true, example: '42' },
              descripcion:    { type: 'string', nullable: true, example: 'Creación de proveedor' },
              resultado:      { type: 'string', example: 'EXITO' },
              ipAddress:      { type: 'string', nullable: true, example: '192.168.1.1' },
            },
          },
          PdfPreviewInput: {
            type: 'object',
            properties: {
              numeroFactura: { type: 'string', example: 'FC-2026-00001' },
              fechaEmision: { type: 'string', example: '22/06/2026' },
              fechaVencimiento: { type: 'string', example: '22/07/2026' },
              tipoPago: { type: 'string', example: 'CONTADO' },
              proveedorNombre: { type: 'string', example: 'Distribuidora Nacional' },
              proveedorRuc: { type: 'string', example: '1712345678001' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    descripcion: { type: 'string' },
                    aplicaIva: { type: 'boolean' },
                    precioUnitario: { type: 'number' },
                    cantidad: { type: 'number' },
                  },
                },
              },
              subtotalSinIva: { type: 'number' },
              subtotalConIva: { type: 'number' },
              montoIva: { type: 'number' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
  });
  return spec;
};
