# HU3 — Detalle de Factura y Productos (Tarea: Aldahir Requene)

**Scope:** Solo la parte de diseño:
- ✅ Interfaz DataGrid premium para el detalle de productos
- ✅ Mock de API de inventario (estructura inicial con IA)

Las demás tareas (hooks de cálculo, endpoint real de inventario, paginación, tests matemáticos) ya están hechas por otros integrantes.

---

## Contexto del código existente

- `FacturaForm.tsx` ya tiene una tabla básica de productos (se mantiene intacta — es la cabecera HU2)
- `src/app/facturas/nueva/page.tsx` tiene un **placeholder** `"(Detalle de productos - Próximamente)"` → se reemplazará con el nuevo DataGrid
- No existe ningún endpoint `/api/inventario`

---

## Proposed Changes

### 1. Mock API de Inventario — `src/app/api/inventario/productos/route.ts` [NEW]

#### [NEW] route.ts

Endpoint `GET /api/inventario/productos?buscar=&pagina=1&limite=10`

Retorna un JSON con la estructura que usará la integración real de Jairo:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "codigo": "PROD-001",
      "nombre": "Papel Bond A4 Resma",
      "categoria": "Papelería",
      "pvp": 4.50,
      "grabaIva": true,
      "porcentajeIva": 15,
      "stock": 250,
      "unidad": "Resma"
    }
  ],
  "total": 20,
  "pagina": 1,
  "totalPaginas": 2
}
```

~20 productos mock de distintas categorías. Soporte de filtro `buscar` por nombre o código.

---

### 2. Componente DataGrid — `src/components/ProductosDataGrid.tsx` [NEW]

#### [NEW] ProductosDataGrid.tsx

Componente `"use client"` con diseño premium que incluye:

**Panel de búsqueda de productos (tipo autocomplete):**
- Input de búsqueda → llama al mock `GET /api/inventario/productos?buscar=...`
- Dropdown con resultados: código, nombre, stock disponible, precio
- Al seleccionar → agrega la fila al grid

**DataGrid de líneas de detalle:**

| Columna | Tipo | Editable |
|---|---|---|
| # | Índice | ❌ |
| Código | Texto | ❌ (auto) |
| Descripción | Input text | ✅ |
| Stock Disp. | Badge | ❌ |
| Cantidad | Input number | ✅ |
| PVP | Input number | ✅ |
| Graba IVA | Toggle/Badge | ✅ |
| Subtotal | Calculado | ❌ |
| IVA | Calculado | ❌ |
| Total Línea | Calculado | ❌ |
| Acción | Botón ❌ | — |

**Panel de totales (derecha):**
- Subtotal sin IVA
- Subtotal con IVA
- Total IVA (15%)
- **TOTAL GENERAL** (destacado)

**Diseño:** glassmorphism/dark premium consistente con el resto del proyecto.

---

### 3. Actualizar página — `src/app/facturas/nueva/page.tsx` [MODIFY]

#### [MODIFY] [page.tsx](file:///c:/Users/MEGANET/Desktop/aplicacion_distribuida/MODULO-DE-COMPRAS/src/app/facturas/nueva/page.tsx)

Reemplazar el placeholder `"(Detalle de productos - Próximamente)"` con el nuevo componente `<ProductosDataGrid />`.

---

## Verification Plan

### Manual
- Abrir `http://localhost:3003/facturas/nueva`
- Verificar que aparece el DataGrid debajo de la Cabecera
- Escribir en el buscador de productos → aparece dropdown con mock data
- Seleccionar un producto → se agrega al grid
- Editar cantidad/PVP → totales se actualizan en tiempo real
- Probar `http://localhost:3003/api/inventario/productos?buscar=papel` → retorna JSON filtrado

---

## Open Questions

> [!NOTE]
> El DataGrid usa los cálculos de `facturaMath.ts` que ya existen en el proyecto (tarea de Dario), reutilizando la función `calculateFacturaTotals`.
