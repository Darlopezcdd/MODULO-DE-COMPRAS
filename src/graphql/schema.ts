import { Proveedor } from '@prisma/client';

export const typeDefs = `
  # ── Proveedores ──────────────────────────────────────────
  enum TipoProveedor {
    CONTADO
    CREDITO
  }

  enum EstadoProveedor {
    ACTIVO
    INACTIVO
  }

  type Proveedor {
    id: Int!
    cedulaRuc: String!
    nombre: String!
    ciudad: String!
    tipo: TipoProveedor!
    direccion: String!
    telefono: String!
    email: String!
    estado: EstadoProveedor!
  }

  input ProveedorInput {
    cedulaRuc: String!
    nombre: String!
    ciudad: String!
    tipo: TipoProveedor!
    direccion: String!
    telefono: String!
    email: String!
  }

  input ProveedorUpdateInput {
    nombre: String
    ciudad: String
    tipo: TipoProveedor
    direccion: String
    telefono: String
    email: String
    estado: EstadoProveedor
  }

  # ── Facturas de Compra (HU2) ──────────────────────────────
  enum TipoPago {
    CONTADO
    CREDITO
  }

  enum EstadoFactura {
    BORRADOR
    EMITIDA
    ANULADA
  }

  type FacturaCompra {
    id: Int!
    numeroFactura: String!
    numeroFacturaProveedor: String
    fecha: String!
    proveedorId: Int!
    tipoPago: TipoPago!
    fechaVencimiento: String
    subtotalSinIva: Float!
    subtotalConIva: Float!
    totalIva: Float!
    total: Float!
    estado: EstadoFactura!
    observaciones: String
  }

  input FacturaCabeceraInput {
    numeroFacturaProveedor: String
    fecha: String!
    proveedorId: Int!
    tipoPago: TipoPago!
    fechaVencimiento: String
    observaciones: String
  }

  # ── Queries ───────────────────────────────────────────────
  type Query {
    listarProveedores(estado: EstadoProveedor, tipo: TipoProveedor, buscar: String): [Proveedor!]!
    obtenerProveedor(id: Int!): Proveedor
    listarFacturas(estado: EstadoFactura): [FacturaCompra!]!
    obtenerFactura(id: Int!): FacturaCompra
  }

  # ── Mutations ─────────────────────────────────────────────
  type Mutation {
    crearProveedor(input: ProveedorInput!): Proveedor!
    actualizarProveedor(id: Int!, input: ProveedorUpdateInput!): Proveedor!
    eliminarProveedor(id: Int!): Proveedor!
    crearFacturaCabecera(input: FacturaCabeceraInput!): FacturaCompra!
  }
`;
