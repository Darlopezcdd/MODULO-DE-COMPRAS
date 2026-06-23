
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
    proveedorNombre: String
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
    listarFacturas(estado: EstadoFactura, fechaInicio: String, fechaFin: String): [FacturaCompra!]!
    obtenerFactura(id: Int!): FacturaCompra
  }

  # ── Mutations ─────────────────────────────────────────────
  type Mutation {
    crearProveedor(input: ProveedorInput!): Proveedor!
    actualizarProveedor(id: Int!, input: ProveedorUpdateInput!): Proveedor!
    eliminarProveedor(id: Int!): Proveedor!
    crearFacturaCabecera(input: FacturaCabeceraInput!): FacturaCompra!
  }
  # ── Catálogo de Proveedores ───────────────────────────────
  type CatalogoProveedor {
    id: Int!
    proveedorId: Int!
    productoCodigo: String!
    precioCompra: Float!
    createdAt: String!
    updatedAt: String!
  }

  input ProductoGlobalInput {
    codigo: String!
    nombre: String!
    descripcion: String!
    graba_iva: Boolean!
    costo: Float!
    pvp: Float!
    estado: String!
  }

  extend type Query {
    listarCatalogoProveedor(proveedorId: Int!): [CatalogoProveedor!]!
  }

  extend type Mutation {
    agregarAlCatalogo(proveedorId: Int!, productoCodigo: String!, precioCompra: Float!): CatalogoProveedor!
    crearProductoGlobalYCatalogo(proveedorId: Int!, precioCompra: Float!, input: ProductoGlobalInput!): CatalogoProveedor!
  }
`;
