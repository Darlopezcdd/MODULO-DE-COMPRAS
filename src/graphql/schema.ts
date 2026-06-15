import { Proveedor } from '@prisma/client';

export const typeDefs = `
  enum TipoProveedor {
    CONTADO
    CREDITO
  }

  enum EstadoProveedor {
    ACTIVO
    INACTIVO
  }

  enum TipoPago {
    CONTADO
    CREDITO
  }

  type Factura {
    id: Int!
    fecha: String!
    fecha_vencimiento: String
    tipo_pago: TipoPago!
  }

  input FacturaInput {
    fecha: String!
    fecha_vencimiento: String
    tipo_pago: TipoPago!
    proveedor_id: Int!
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

  type Query {
    listarProveedores(estado: EstadoProveedor, tipo: TipoProveedor, buscar: String): [Proveedor!]!
    obtenerProveedor(id: Int!): Proveedor
  }

  type Mutation {
    crearProveedor(input: ProveedorInput!): Proveedor!
    actualizarProveedor(id: Int!, input: ProveedorUpdateInput!): Proveedor!
    eliminarProveedor(id: Int!): Proveedor!
    crearFactura(input: FacturaInput!): Factura!
  }
`;
