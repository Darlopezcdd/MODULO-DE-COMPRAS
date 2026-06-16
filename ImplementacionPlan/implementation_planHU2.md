# HU2 — Cabecera de Facturas de Compras

Implementar los **resolvers GraphQL del backend** para la creación de la cabecera de factura, incluyendo validaciones de permisos (tipo Crédito) y reglas de negocio para fechas. El modelo `facturas_compra` ya existe en Prisma/BD. Solo falta la capa GraphQL y los tests.

---

## Proposed Changes

### 1. GraphQL Schema — `src/graphql/schema.ts`

#### [MODIFY] [schema.ts](file:///c:/Users/MEGANET/Desktop/aplicacion_distribuida/MODULO-DE-COMPRAS/src/graphql/schema.ts)

Agregar los nuevos tipos, inputs, queries y mutations para facturas **sin tocar** lo de Proveedores:

```graphql
enum TipoPago { CONTADO  CREDITO }
enum EstadoFactura { BORRADOR  EMITIDA  ANULADA }

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
  fecha: String!          # formato YYYY-MM-DD
  proveedorId: Int!
  tipoPago: TipoPago!
  fechaVencimiento: String  # requerido si tipoPago = CREDITO
  observaciones: String
}

# Queries
obtenerFactura(id: Int!): FacturaCompra
listarFacturas(estado: EstadoFactura): [FacturaCompra!]!

# Mutations
crearFacturaCabecera(input: FacturaCabeceraInput!): FacturaCompra!
```

---

### 2. GraphQL Resolvers — `src/graphql/resolvers.ts`

#### [MODIFY] [resolvers.ts](file:///c:/Users/MEGANET/Desktop/aplicacion_distribuida/MODULO-DE-COMPRAS/src/graphql/resolvers.ts)

Agregar al objeto `resolvers` las siguientes funciones **sin modificar** los resolvers de Proveedores:

**Query:**
- `listarFacturas(estado?)` → `prisma.facturas_compra.findMany()`
- `obtenerFactura(id)` → `prisma.facturas_compra.findUnique()`

**Mutation `crearFacturaCabecera`** con estas validaciones en orden:

| # | Criterio de Aceptación | Validación |
|---|---|---|
| CA1 | Fecha no puede ser futura | `fecha <= hoy` |
| CA2 | Proveedor debe existir y estar ACTIVO | `findUnique` + check `estado` |
| CA3 | Permiso de Crédito: solo proveedores tipo `CREDITO` pueden usar `tipoPago = CREDITO` | `proveedor.tipo === 'CREDITO'` |
| CA4 | Si `tipoPago = CREDITO` → `fechaVencimiento` es obligatoria | campo requerido |
| CA5 | Si `tipoPago = CREDITO` → `fechaVencimiento` debe ser posterior a `fecha` | `fechaVencimiento > fecha` |
| CA6 | Si `tipoPago = CONTADO` → `fechaVencimiento` debe ser null/undefined | limpiar campo |

Finalmente `prisma.facturas_compra.create(...)` con `estado: 'BORRADOR'` y `created_by: 1`.

---

### 3. Tests Unitarios — `__tests__/facturas.resolvers.test.ts`

#### [NEW] [facturas.resolvers.test.ts](file:///c:/Users/MEGANET/Desktop/aplicacion_distribuida/MODULO-DE-COMPRAS/__tests__/facturas.resolvers.test.ts)

Mock completo de Prisma (`jest.mock`). Casos de prueba:

| Test | Qué valida |
|---|---|
| ❌ Fecha futura | Lanza error CA1 |
| ❌ Proveedor inexistente | Lanza error CA2 |
| ❌ Proveedor INACTIVO | Lanza error CA2 |
| ❌ Proveedor CONTADO quiere pago CREDITO | Lanza error CA3 (permiso) |
| ❌ CREDITO sin `fechaVencimiento` | Lanza error CA4 |
| ❌ `fechaVencimiento` <= `fecha` | Lanza error CA5 |
| ✅ CONTADO válido | Crea factura, `fechaVencimiento` es null |
| ✅ CREDITO válido con vencimiento futuro | Crea factura en BORRADOR |

---

## Verification Plan

### Automated Tests
```powershell
npx jest __tests__/facturas.resolvers.test.ts --verbose
```
Todos los tests deben pasar en verde.

### Manual Verification
- El servidor `npm run dev` sigue corriendo sin errores.
- En `http://localhost:3003` el formulario de facturas no se rompe.

---

## Open Questions

> [!IMPORTANT]
> **`created_by`**: Los resolvers de Proveedor usan `created_by: 1` hardcodeado (sin autenticación real). ¿Hacemos lo mismo para facturas o hay que leer el usuario desde el contexto GraphQL?

> [!NOTE]
> El `numero_factura` se genera automáticamente por la BD con una secuencia (`seq_numero_factura`), así que **no** lo incluimos en el input.
